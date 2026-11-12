// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * Minimal interfaces used by this contract.
 * Adjust these to match your actual external contract ABIs.
 */
interface IOracle {
    function twap_() external view returns (uint256);
}

interface IMissionControl {
    // expecting a fixed-size array of 5 uint256s in calldata
    function change(uint256 pid, uint256[5] calldata params) external;
    function setOperator(address _op) external;
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
}

interface IERC20Mintable is IERC20 {
    function mint(address to, uint256 amount) external;
}


contract HubbleAlphaEpochs is Ownable, ReentrancyGuard {
    enum EpochType { Neutral, Light, Dark }

    // ====== External Contracts ======
    IOracle public oracle; // EX price oracle
    IMissionControl public MissionControl; // Staking Contract for Hubble
    IERC20Mintable public ESC; // Edwin's Space Credits for Epoch flippers
    IERC20 public EX;
    IERC20 public STS;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    address public redemptionPool; // Redemption Pool containing STS

    // ====== Emission Control ======
    mapping (uint256 => mapping (uint256 => uint256)) public emissionRates; // stored as "per day" amounts (x * 1e18)
    bool public isRewarding = false; // if true, flippers will receive ESC for flipping epochs
    bool public isPaying = false; // if true, flippers will receive S for flipping epochs
    bool public isUpdating = false; // if true, the emission rates are updated when the epoch flips
    uint256 public bonus = 0.002 ether; // bonus S rewarded on top of gas refund, meant to cover the cost of estimating the payments
    uint256 public maxGasPrice = 100 gwei; // max gas price to prevent flippers from draining the contract

    // ====== Epoch Control ======
    uint256 public epochs = 0;
    uint256 public currentEpochStartTimestamp;
   
    mapping (uint256 => uint256) public epochStartTimestamps;
    mapping (uint256 => uint256) public epochStartPrices;
    mapping (uint256 => EpochType) public epochTypes;

    // ====== Constants ======
    uint256 public constant EPOCH_LENGTH = 48 hours;

    /**
    * @dev Basis points divisor (10000 = 100%)
    */
    uint256 public constant BP = 10_000;

    /**
    * @dev Maximum bonus payment for epoch flippers (0.1 ETH)
    */
    uint256 public constant BONUS_CAP = 0.1 ether;

    // Price thresholds (in wei)
    uint256 public constant NEUTRAL_LOWER_BOUND = 0.99 ether;
    uint256 public constant NEUTRAL_UPPER_BOUND = 1.01 ether;
    uint256 public constant EXPANSION_TIER1 = 990e15; // 0.99 stS/EX
    uint256 public constant EXPANSION_TIER2 = 998e15; // 0.998 stS/EX
    uint256 public constant EXPANSION_TIER3 = 1002e15; // 1.002 stS/EX
    uint256 public constant EXPANSION_TIER4 = 1010e15; // 1.01 stS/EX

    // Emission rate ceilings (per second)
    uint256 public constant MAX_RATE_0 = 277777777777778; // 24 xHUBBLE/day max for xHUBBLE pool
    uint256 public constant MAX_RATE_1 = 185185185185185; // 16 xHUBBLE/day max for xEX pool
    uint256 public constant MAX_RATE_2 = 92592592592593; // 8 xHUBBLE/day max for Hubble/Usdc pool
    uint256 public constant MAX_RATE_3 = 138888888888889; // 12 xHUBBLE/day max for EX/stS pool
    uint256 public constant MAX_RATE_EX = 11574074074074074; // 1000 xEX/day max

    // Edwin Space Credit Reward tiers (seconds delay -> reward)
    // flipping within N seconds of optimal yields the amount in $ESC
    uint256 public constant REWARD_TIER1_DELAY = 60; 
    uint256 public constant REWARD_TIER2_DELAY = 120;
    uint256 public constant REWARD_TIER3_DELAY = 240;
    uint256 public constant REWARD_TIER4_DELAY = 480;
    uint256 public constant REWARD_TIER1_AMOUNT = 200e18; 
    uint256 public constant REWARD_TIER2_AMOUNT = 40e18;
    uint256 public constant REWARD_TIER3_AMOUNT = 8e18;
    uint256 public constant REWARD_TIER4_AMOUNT = 2e18;
    uint256 public constant REWARD_DEFAULT_AMOUNT = 1e18;
    uint256 public constant REWARD_INSTANT_AMOUNT = 1000e18;

    // Expansion rates (in basis points)
    // these multiplied by the supply of $EX give the $xEX emission rates.
    uint256 public constant LIGHT_EPOCH_EXPANSION = 40; // 0.4%
    uint256 public constant NEUTRAL_EXPANSION_TIER1 = 2; // 0.02%
    uint256 public constant NEUTRAL_EXPANSION_TIER2 = 4; // 0.04%
    uint256 public constant NEUTRAL_EXPANSION_TIER3 = 20; // 0.2%

    // ====== Events ======
    event OracleChanged(address indexed oldOracle, address indexed newOracle);
    event BonusUpdated(uint256 oldBonus, uint256 newBonus);
    event MaxGasPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event Toggled(string indexed feature, bool newStatus);

    event EpochFlipped(
        uint256 indexed epochId, 
        EpochType indexed newType, 
        uint256 startTime, 
        uint256 startPrice,
        address indexed flipper
    );
    event EpochForced(uint256 indexed epochId, address indexed operator);

    event EmissionsUpdated(
        uint256 indexed epochType,
        uint256 indexed pid,
        uint256 oldRate,
        uint256 newRate
    );
    event AutoUpdateToggled(bool newStatus);

    event Drained(uint256 amount, address indexed operator);
    event OperatorGivenBack(address indexed operator);

    // ====== Auto-update toggle ======
    // if this is false then _updatePools() doesn't do anything
    // if you call ForceFlip with this true when isUpdating is false, 
    // you can test updatePools works without allowin FlipEpochs to effect Mission Control
    bool public isAutoUpdating = false; 

    // ====== Constructor ======
    constructor(
        address _mc,
        address _oracle,
        address _esc,
        address _ex,
        address _sts,
        address _redemptionPool
    ) Ownable(msg.sender) {
        require(_mc != address(0), "MC zero");
        require(_oracle != address(0), "oracle zero");
        require(_esc != address(0), "esc zero");
        require(_ex != address(0), "ex zero");
        require(_sts != address(0), "sts zero");
        require(_redemptionPool != address(0), "redemption pool zero");

        MissionControl = IMissionControl(_mc);
        oracle = IOracle(_oracle);
        ESC = IERC20Mintable(_esc);
        EX = IERC20(_ex);
        STS = IERC20(_sts);
        redemptionPool = _redemptionPool;

        // Default emissionRates (per day values, *1e18)
        // Neutral
        emissionRates[uint256(EpochType.Neutral)][0] = 24e18; // 24 xHUBBLE/day (xHUBBLE)   
        emissionRates[uint256(EpochType.Neutral)][1] = 8e18;  // 8 xHUBBLE/day (xEX)        
        emissionRates[uint256(EpochType.Neutral)][2] = 4e18;  // 4 xHUBBLE/day (Hubble/Usdc)
        emissionRates[uint256(EpochType.Neutral)][3] = 12e18; // 12 xHUBBLE/day (EX/stS)    

        // Light
        emissionRates[uint256(EpochType.Light)][0] = 24e18;   // 24 xHUBBLE/day (xHUBBLE)   
        emissionRates[uint256(EpochType.Light)][1] = 4e18;    // 4 xHUBBLE/day (xEX)        
        emissionRates[uint256(EpochType.Light)][2] = 8e18;    // 8 xHUBBLE/day (Hubble/Usdc)
        emissionRates[uint256(EpochType.Light)][3] = 12e18;   // 12 xHUBBLE/day (EX/stS)    

        // Dark
        emissionRates[uint256(EpochType.Dark)][0] = 11e18;    // 11 xHUBBLE/day (xHUBBLE)   
        emissionRates[uint256(EpochType.Dark)][1] = 16e18;    // 16 xHUBBLE/day (xEX)        
        emissionRates[uint256(EpochType.Dark)][2] = 4e18;     // 4 xHUBBLE/day (Hubble/Usdc)
        emissionRates[uint256(EpochType.Dark)][3] = 1e18;     // 1 xHUBBLE/day (EX/stS)    
    }

    // ====== Configuration (onlyOwner) ======

    // oracle must me modifiable so protocol can migrate liquidity if needed
    function changeOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "zero address");
        address oldOracle = address(oracle);
        oracle = IOracle(newOracle);
        emit OracleChanged(oldOracle, newOracle);
    }

    // bonus must me modifiable so protocol can properly incentivize epoch flipping
    function setBonus(uint256 newBonus) external onlyOwner {
        require(newBonus <= BONUS_CAP, "bonus too high");
        uint256 oldBonus = bonus;
        bonus = newBonus;
        emit BonusUpdated(oldBonus, newBonus);
    }

    // max gas price must be modifiable in case network modifications change gas economics
    function setMaxGasPrice(uint256 newMaxGasPrice) external onlyOwner {
        uint256 oldPrice = maxGasPrice;
        maxGasPrice = newMaxGasPrice;
        emit MaxGasPriceUpdated(oldPrice, newMaxGasPrice);
    }

    // toggle if $ESC is minting for flippers
    function toggleRewards() external onlyOwner {
        isRewarding = !isRewarding;
        emit Toggled("rewards", isRewarding);
    }

    // toggle if $S gas costs are being covered
    function togglePaying() external onlyOwner {
        isPaying = !isPaying;
        emit Toggled("paying", isPaying);
    }

    // toggle if _updatePools() is called when epoch is flipped
    function toggleUpdating() external onlyOwner {
        isUpdating = !isUpdating;
        emit Toggled("updating", isUpdating);
    }

    // allow MissionControl contract emissions to be modified by _updatePools()
    function setIsAutoUpdating(bool newUpdate) external onlyOwner {
        isAutoUpdating = newUpdate;
        emit AutoUpdateToggled(newUpdate);
    }

    // --------------------------------------------------------------------------------------
    // ====== Epoch Mechanics ======
    // --------------------------------------------------------------------------------------

    // return 0, 1, 2 for Neutral, Light, Dark
    // based on the current twap_
    // this function tells the flipper what the epoch will be if they flip now
    function nextBasicEpochType() public view returns (EpochType) {
        uint256 price = oracle.twap_();
        if (price >= NEUTRAL_LOWER_BOUND && price <= NEUTRAL_UPPER_BOUND) return EpochType.Neutral;
        else if (price > NEUTRAL_UPPER_BOUND) return EpochType.Light;
        else return EpochType.Dark;
    }

    // the public flipEpoch() function called by anyone to flip the epoch
    function flipEpoch() public nonReentrant {
        uint256 startGas = gasleft(); // store how much gas is availble for transaction
        uint256 nowTs = block.timestamp; // store the current timestamp
        // calculate when the current epoch should end
        uint256 endOfEpoch = currentEpochStartTimestamp + EPOCH_LENGTH; 
        // require that either this is  the first ever epoch
        // or that the epochs lifetime has elapsed
        require(epochs == 0 || nowTs > endOfEpoch, "Epoch not ready");

        // if this is the first ever epoch then set endOfEpoch to now
        if (epochs == 0) {
            endOfEpoch = nowTs;
        }

        epochs++;                                       // increase the epoch count            
        currentEpochStartTimestamp = endOfEpoch + 1;    // set the start time of the next epoch
        epochStartTimestamps[epochs] = endOfEpoch + 1;  // store it in the map of start times  
        epochStartPrices[epochs] = oracle.twap_();      // store the start price               
        epochTypes[epochs] = nextBasicEpochType();      // store the epoch type                

        // emit the flipping event
        emit EpochFlipped(
            epochs,
            epochTypes[epochs],
            endOfEpoch + 1,
            epochStartPrices[epochs],
            msg.sender
        );

        // attempt to update emission rates
        if (isUpdating) {
            _updatePools();
        }

        // attempt to reward flipper
        if (isRewarding) {
            // safe call to mint; requires ESC to implement mint
            ESC.mint(msg.sender, _rewardRate(nowTs - endOfEpoch));
        }

        // attempt to cover flipper's gas
        if (isPaying && tx.gasprice <= maxGasPrice) {
            uint256 gasUsed = startGas - gasleft();
            // refund = gasUsed * tx.gasprice + bonus
            uint256 refund = gasUsed * tx.gasprice + bonus;
            // ensure not to revert the entire transaction if insufficient balance
            if (refund <= address(this).balance) {
                // nonReentrant ensures safety for ETH transfer
                (bool success, ) = payable(msg.sender).call{value: refund}("");
                require(success, "Transfer failed");
            }
        }
    }

    // force flip function to allow the user to manually start a new epoch
    function forceFlip() external onlyOwner {
        uint256 nowTs = block.timestamp;
        epochs++;                                  // increase the epoch count             
        currentEpochStartTimestamp = nowTs + 1;    // set the start time of the next epoch
        epochStartTimestamps[epochs] = nowTs + 1;  // store it in the map of start times  
        epochStartPrices[epochs] = oracle.twap_(); // store the start price               
        epochTypes[epochs] = nextBasicEpochType(); // store the epoch type                
        emit EpochForced(epochs, msg.sender);

        // update emission rates
        _updatePools();
    }

    // $ESC Reward rate calculation for Epoch Flippers
    // if the delay was in a given tier, reward the flipper with the corresponding amount of $ESC
    function _rewardRate(uint256 delay) internal pure returns (uint256) {
        if (delay == 0) return REWARD_INSTANT_AMOUNT;                    
        else if (delay <= REWARD_TIER1_DELAY) return REWARD_TIER1_AMOUNT;
        else if (delay <= REWARD_TIER2_DELAY) return REWARD_TIER2_AMOUNT;
        else if (delay <= REWARD_TIER3_DELAY) return REWARD_TIER3_AMOUNT;
        else if (delay <= REWARD_TIER4_DELAY) return REWARD_TIER4_AMOUNT;
        else return REWARD_DEFAULT_AMOUNT;
    }

    // ====== Emission Math ======

    // change the daily emission rates that are passed to Mission Control
    // newRate should be 0 decimal format whole number input
    function setDailyEmissions(uint256 epochType, uint256 pid, uint256 newRate) external onlyOwner {
        require(epochType <= uint256(EpochType.Dark), "invalid epochType"); // only 3 epoch types
        require(pid < 4, "invalid pid");                                    // only 4 pools
        uint256 oldRate = emissionRates[epochType][pid];                    // store old rate for event
        emissionRates[epochType][pid] = newRate * 1e18;                     // update the rate
        emit EmissionsUpdated(epochType, pid, oldRate, newRate * 1e18);     // emit the event
    }

    /// @notice returns emissions per second (emissionRates stored as per-day numbers)
    function xHubbleEmissionsPerSecond(uint256 epochType, uint256 pid) public view returns (uint256) {
        return emissionRates[epochType][pid] / 1 days;
    }

    // the effective supply used when calculating $xEX emissions
    function circulatingSupplyOfEx() public view returns (uint256) {
        return EX.totalSupply() - EX.balanceOf(DEAD);
    }

    // the backing amount of stS
    function backing() public view returns (uint256) {
        return STS.balanceOf(redemptionPool);
    }

    // the Death Spiral Ratio used on the frontend
    function DSR() public view returns (uint256) {
        // avoid division by zero
        uint256 circ = circulatingSupplyOfEx();
        if (circ == 0) return 0;
        return 10000 * backing() / circ;
    }

    // the amount of xEX emitted per day calculations
    function calculatedExpansionAmount() public view returns (uint256) {
        if (epochs == 0) return 0;                // make sure the epochs have started
        EpochType etype = epochTypes[epochs];     // store the epoch type
        uint256 supply = circulatingSupplyOfEx(); // store the supply
        uint256 price = epochStartPrices[epochs]; // store the $EX price

        // if its a light epoch the calculation is simply the light epoch rate times the supply
        if (etype == EpochType.Light) {
            return supply * LIGHT_EPOCH_EXPANSION / BP;
        }

        // if its a neutral epoch the calculation depends on the price
        // if the price is in a given tier, use that tier rate to calculate expansion amount
        if (etype == EpochType.Neutral) {
            if (price >= EXPANSION_TIER1 && price < EXPANSION_TIER2) return supply * NEUTRAL_EXPANSION_TIER1 / BP;
            if (price >= EXPANSION_TIER2 && price < EXPANSION_TIER3) return supply * NEUTRAL_EXPANSION_TIER2 / BP;
            if (price >= EXPANSION_TIER3 && price <= EXPANSION_TIER4) return supply * NEUTRAL_EXPANSION_TIER3 / BP;
            return 0;
        }
        // Dark means no expansion
        return 0;
    }

    // amounts are calculated in Daily Amounts, this returns the per second rate
    function expansionRate() public view returns (uint256) {
        return calculatedExpansionAmount() / 1 days;
    }

    // public view to get the xHUBBLE emission rate of a specific pool
    function currentEmissions(uint256 pid) public view returns (uint256) {
        if (epochs == 0) return 0;
        uint256 et = uint256(epochTypes[epochs]);
        return xHubbleEmissionsPerSecond(et, pid);
    }

    function _updatePools() internal {
        if (!isAutoUpdating) return;

        // check that all proposed rates fall in the safe range
        require(currentEmissions(0) <= MAX_RATE_0, "Mission Control emissions exceed MAX_RATE_0");
        require(currentEmissions(1) <= MAX_RATE_1, "Dark Energy emissions exceed MAX_RATE_1");
        require(currentEmissions(2) <= MAX_RATE_2, "Starport Hubble/Usdc emissions exceed MAX_RATE_2");
        require(currentEmissions(3) <= MAX_RATE_3, "Starport Ex/Sts emissions exceed MAX_RATE_3");
        require(expansionRate() <= MAX_RATE_EX, "Expansion Rate exceeds MAX_RATE_EX");

        // prepare params arrays
        uint256[5] memory params0 = [uint256(0), currentEmissions(0), uint256(0), expansionRate(), uint256(0)];
        uint256[5] memory params1 = [uint256(0), currentEmissions(1), uint256(0), uint256(0), uint256(0)];
        uint256[5] memory params2 = [uint256(0), currentEmissions(2), uint256(0), uint256(0), uint256(0)];
        uint256[5] memory params3 = [uint256(0), currentEmissions(3), uint256(0), uint256(0), uint256(0)];

        // update the emission rates in MissionControl
        MissionControl.change(0, params0);
        MissionControl.change(1, params1);
        MissionControl.change(2, params2);
        MissionControl.change(3, params3);
    }

    // ====== Admin ======

    // remove S in the pool (used when contract is replaced for Beta version)
    function drain() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        if (amount == 0) return;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        emit Drained(amount, owner());
    }

    // give operator status of Mission Control to the Owner of this contract
    function giveBackOperator() external onlyOwner {
        MissionControl.setOperator(owner());
        emit OperatorGivenBack(owner());
    }

    // return all information about the current epoch
    function currentEpoch() public view returns (uint256 id, EpochType typ, uint256 start, uint256 price) {
        return (epochs, epochTypes[epochs], epochStartTimestamps[epochs], epochStartPrices[epochs]);
    }

    // enable this contract to send an receive S
    receive() external payable {}
    fallback() external payable {}
}
