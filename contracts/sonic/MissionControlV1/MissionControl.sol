// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}
abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}



interface IS {
    function setState() external;
    function updateStakingBalance(address user) external;

}
interface IGM is IS {
    function reset(address user) external;
    function vote(address user, uint256[] memory amounts, uint256[] memory poolIDs) external;
}

interface IRM is IS {
    function claimNonCriticalRewards(address user) external;
    function claimCriticalRewards(address user) external;
    
}

interface IXM is IS {
    function claimEX(address user) external;
}


contract ShareWrapper {
    IERC20 public xhubble;

    uint256 private _totalSupply;
    uint256 stakerCount = 0;
    mapping(address => uint256) private _balances;
    mapping(address => bool) private _hasStaked; // stores if a user ever staked
    mapping(uint256 => address) private _stakerByIndex; // indexes if a stakers address

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function stakerByIndex(uint256 index) public view returns (address) {
        return _stakerByIndex[index];
    }

    function stake(uint256 amount) public virtual {
        _totalSupply = _totalSupply + amount;
        _balances[msg.sender] = _balances[msg.sender] + amount;

        // if this is the user's first time staking
        if (!_hasStaked[msg.sender]) {
            _hasStaked[msg.sender] = true; // update their status
            _stakerByIndex[stakerCount+1] = msg.sender; // set their staker index
            stakerCount++;
        }
        xhubble.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) public virtual {
        uint256 missionControlShare = _balances[msg.sender];
        require(missionControlShare >= amount, "Mission Control: withdraw request greater than staked amount");
        _totalSupply = _totalSupply - amount;
        _balances[msg.sender] = missionControlShare - amount;
        xhubble.transfer(msg.sender, amount);
    }
}

// ---------------------------------------------------------------------------------------------
// HUBBLE Protocol -----------------------------------------------------------------------------
// Mission Control -----------------------------------------------------------------------------
contract MissionControl is ShareWrapper, ReentrancyGuard, Ownable {

    IGM public governanceModule;
    IRM public rewardModule;
    IXM public expansionModule;

    bool public isUpdatingState = true;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor (address _xhubble) {
        xhubble = IERC20(_xhubble);
    }

    // isPilot Modifier checks if user is staked in Mission Control
    modifier isPilot {
        require(balanceOf(msg.sender) > 0, "Mission Control: The Pilot does not exist");
        _;
    }

    function _updateState(bool updateGM, bool updateRM, bool updateEM) internal {
        address staker;
        for (uint256 index = 1; index < stakerCount; index++) {
            staker = stakerByIndex(index);
            if (updateGM) {
                governanceModule.updateStakingBalance(staker);
            }
            else if (updateRM) {
                rewardModule.updateStakingBalance(staker);
            }
            else if (updateEM) {
                expansionModule.updateStakingBalance(staker);
             }
        }
    } 


    function updateState(bool updateGM, bool updateRM, bool updateEM) external nonReentrant {
        _updateState(updateGM,updateRM,updateEM);
    }

    // ------------------------------------------------------------------------------------
    // These functions are used to change the external contracts that manage the protocol -

    // The Governance Module allows Mission Control Stakers 
    function setGovernanceModule(address newGov) external onlyOwner {
        governanceModule = IGM(newGov);
        _updateState(true,false,false);
    }
    function setRewardModule(address newRewards) external onlyOwner {
        rewardModule = IRM(newRewards);
        _updateState(true,false,false);
    }
    function setExpansionModule(address newExpansion) external onlyOwner {
        expansionModule = IXM(newExpansion);
        _updateState(true,false,false);
    }
    function permanentlyKillStateUpdateForMigration() external onlyOwner {
        isUpdatingState = false;
    }

    // User actions ------------------------------------------------------------

    function stake(uint256 amount) public override nonReentrant {
        require(amount > 0, "Mission Control: Cannot stake 0");
        require(isUpdatingState, "only unstaking allowed from this contract");
        super.stake(amount);
        governanceModule.updateStakingBalance(msg.sender);
        rewardModule.updateStakingBalance(msg.sender);
        expansionModule.updateStakingBalance(msg.sender);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public override nonReentrant isPilot {
        require(amount > 0, "Mission Control: Cannot withdraw 0");
        super.withdraw(amount);
        if (isUpdatingState) {
            governanceModule.updateStakingBalance(msg.sender);
            rewardModule.updateStakingBalance(msg.sender);
            expansionModule.updateStakingBalance(msg.sender);
        }
        emit Withdrawn(msg.sender, amount);
    }

    function exit() external {
        withdraw(balanceOf(msg.sender));
    }

    function vote(uint256[] memory amounts, uint256[] memory poolIDs) external nonReentrant {
        governanceModule.vote(msg.sender, amounts, poolIDs);
    }

    function resetVotes() external nonReentrant {
        governanceModule.reset(msg.sender);
    }

    function claimNonCriticalRewards() external nonReentrant {
        rewardModule.claimNonCriticalRewards(msg.sender);
    }

    function claimCriticalRewards() external nonReentrant {
        rewardModule.claimCriticalRewards(msg.sender);
    }

    function claimEX() external nonReentrant {
        expansionModule.claimEX(msg.sender);
    }

    // Withdraw tokens that shouldn't be in this contract.
    // $EX is distributed the expansionModule so we allow $EX to be removed from this contract
    function governanceRecoverUnsupported(IERC20 _token, uint256 _amount, address _to) external onlyOwner {
        // do not allow draining of xhubble tokens
        require(address(_token) != address(xhubble), "xhubble");
        _token.transfer(_to, _amount);
    }
}