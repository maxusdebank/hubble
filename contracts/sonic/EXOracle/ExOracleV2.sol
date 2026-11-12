// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


// OpenZeppelin Contracts (last updated v4.9.0) (utils/math/SafeMath.sol)

pragma solidity ^0.8.0;

// CAUTION
// This version of SafeMath should only be used with Solidity 0.8 or later,
// because it relies on the compiler's built in overflow checks.

/**
 * @dev Wrappers over Solidity's arithmetic operations.
 *
 * NOTE: `SafeMath` is generally not needed starting with Solidity 0.8, since the compiler
 * now has built in overflow checking.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryAdd(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            uint256 c = a + b;
            if (c < a) return (false, 0);
            return (true, c);
        }
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function trySub(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (b > a) return (false, 0);
            return (true, a - b);
        }
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryMul(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
            // benefit is lost if 'b' is also tested.
            // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
            if (a == 0) return (true, 0);
            uint256 c = a * b;
            if (c / a != b) return (false, 0);
            return (true, c);
        }
    }

    /**
     * @dev Returns the division of two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryDiv(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (b == 0) return (false, 0);
            return (true, a / b);
        }
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryMod(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (b == 0) return (false, 0);
            return (true, a % b);
        }
    }

    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        return a * b;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator.
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return a % b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {trySub}.
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        unchecked {
            require(b <= a, errorMessage);
            return a - b;
        }
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        unchecked {
            require(b > 0, errorMessage);
            return a / b;
        }
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting with custom message when dividing by zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryMod}.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        unchecked {
            require(b > 0, errorMessage);
            return a % b;
        }
    }
}

pragma solidity ^0.8.26;

interface IPool {
    error NOT_AUTHORIZED();
    error UNSTABLE_RATIO();
    /// @dev safe transfer failed
    error STF();
    error OVERFLOW();
    /// @dev skim disabled
    error SD();
    /// @dev insufficient liquidity minted
    error ILM();
    /// @dev insufficient liquidity burned
    error ILB();
    /// @dev insufficient output amount
    error IOA();
    /// @dev insufficient input amount
    error IIA();
    error IL();
    error IT();
    error K();

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

        /// @notice Same as prices with with an additional window argument.
    ///         Window = 2 means 2 * 30min (or 1 hr) between observations
    /// @param tokenIn .
    /// @param amountIn .
    /// @param points .
    /// @param window .
    /// @return Array of TWAP prices
    function sample(
        address tokenIn,
        uint256 amountIn,
        uint256 points,
        uint256 window
    ) external view returns (uint256[] memory);

    function observations(uint256 index) external view returns (uint256 timestamp, uint256 reserve0Cumulative, uint256 reserve1Cumulative);

    function current(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut);

    /// @notice Provides twap price with user configured granularity, up to the full window size
    /// @param tokenIn .
    /// @param amountIn .
    /// @param granularity .
    /// @return amountOut .
    function quote(address tokenIn, uint256 amountIn, uint256 granularity) external view returns (uint256 amountOut);

    /// @notice Get the number of observations recorded
    function observationLength() external view returns (uint256);

    /// @notice Address of token in the pool with the lower address value
    function token0() external view returns (address);

    /// @notice Address of token in the poool with the higher address value
    function token1() external view returns (address);

    /// @notice initialize the pool, called only once programatically
    function initialize(
        address _token0,
        address _token1,
        bool _stable
    ) external;

    /// @notice calculate the current reserves of the pool and their last 'seen' timestamp
    /// @return _reserve0 amount of token0 in reserves
    /// @return _reserve1 amount of token1 in reserves
    /// @return _blockTimestampLast the timestamp when the pool was last updated
    function getReserves()
        external
        view
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        );

    /// @notice mint the pair tokens (LPs)
    /// @param to where to mint the LP tokens to
    /// @return liquidity amount of LP tokens to mint
    function mint(address to) external returns (uint256 liquidity);

    /// @notice burn the pair tokens (LPs)
    /// @param to where to send the underlying
    /// @return amount0 amount of amount0
    /// @return amount1 amount of amount1
    function burn(
        address to
    ) external returns (uint256 amount0, uint256 amount1);

    /// @notice direct swap through the pool
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    /// @notice force balances to match reserves, can be used to harvest rebases from rebasing tokens or other external factors
    /// @param to where to send the excess tokens to
    function skim(address to) external;

    /// @notice force reserves to match balances, prevents skim excess if skim is enabled
    function sync() external;

    /// @notice set the pair fees contract address
    function setFeeRecipient(address _pairFees) external;

    /// @notice set the feesplit variable
    function setFeeSplit(uint256 _feeSplit) external;

    /// @notice sets the swap fee of the pair
    /// @dev max of 10_000 (10%)
    /// @param _fee the fee
    function setFee(uint256 _fee) external;

    /// @notice 'mint' the fees as LP tokens
    /// @dev this is used for protocol/voter fees
    function mintFee() external;

    /// @notice calculates the amount of tokens to receive post swap
    /// @param amountIn the token amount
    /// @param tokenIn the address of the token
    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view returns (uint256 amountOut);

    /// @notice returns various metadata about the pair
    function metadata()
        external
        view
        returns (
            uint256 _decimals0,
            uint256 _decimals1,
            uint256 _reserve0,
            uint256 _reserve1,
            bool _stable,
            address _token0,
            address _token1
        );

    /// @notice returns the feeSplit of the pair
    function feeSplit() external view returns (uint256);

    /// @notice returns the fee of the pair
    function fee() external view returns (uint256);

    /// @notice returns the feeRecipient of the pair
    function feeRecipient() external view returns (address);

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
/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}




contract Operator is Context, Ownable {
    address private _operator;

    event OperatorTransferred(address indexed previousOperator, address indexed newOperator);

    constructor() {
        _operator = _msgSender();
        emit OperatorTransferred(address(0), _operator);
    }

    function operator() public view returns (address) {
        return _operator;
    }

    modifier onlyOperator() {
        require(_operator == msg.sender, "operator: caller is not the operator");
        _;
    }

    function isOperator() public view returns (bool) {
        return _msgSender() == _operator;
    }

    function transferOperator(address newOperator_) public onlyOwner {
        _transferOperator(newOperator_);
    }

    function _transferOperator(address newOperator_) internal {
        require(newOperator_ != address(0), "operator: zero address given for new operator");
        emit OperatorTransferred(address(0), newOperator_);
        _operator = newOperator_;
    }

    function _renounceOperator() public onlyOwner {
        emit OperatorTransferred(_operator, address(0));
        _operator = address(0);
    }
}

interface IERC20 {
    function mint(address to, uint256 amount) external;
}

interface ICL {
    function price_() external returns (uint256);
}

contract ExOracleV2 is Operator {
    using SafeMath for uint256;

    address public token0;
    address public token1;
    address public ex = 0xd4d197F3397C8F28f4BC2C698104CfbCC3e04802;
    IPool public pair;

    uint256 public countOfPulls = 0;
    mapping (uint256 => uint256) public timestamps;
    mapping (uint256 => uint256) public prices;

    uint256 public lastPullTimestamp;
    uint256 public constant SAMPLE_RATE = 60*30; // 30 minutes

    IERC20 public ESC = IERC20(0xa8116b0616e3657696dBDC8D202048f7b93457F7);

    bool public isRewarding = false;
    bool public isPaying = false;

    uint256 public lastHourlyCalcTimestamp;
    mapping (uint256 => uint256) public hourlyTimestamps;
    mapping (uint256 => uint256) public hourlyTwaps;
    uint256 public countOfCalcs = 0;

    ICL public clOracle;
    bool public isConsideringCL = false;

    uint256 public bonus = 0.002 ether;
    uint256 public maxGasPrice = 100e9;



    constructor(IPool _pair) {
        pair = _pair;
        token0 = pair.token0();
        token1 = pair.token1();
        uint256 reserve0;
        uint256 reserve1;
        (reserve0, reserve1, ) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, "Oracle: No reserves");
        pull();
    }

    function setCLoracle(address newOracle) public onlyOperator {
        clOracle = ICL(newOracle);
    }

    function setBonus(uint256 newBonus) public onlyOperator {
        require(bonus <= 0.1 ether, "bonus should not be more the 0.1 S");
        bonus = newBonus;
    }
    function setMaxGasPrice(uint256 newMaxGasPrice) public onlyOperator {
        maxGasPrice = newMaxGasPrice;
    }

    function toggleCLoracle() public onlyOperator {
        if (isConsideringCL) {
            isConsideringCL = false;
        }
        else {
            isConsideringCL = true;
        }
    }

    function toggleRewards() public onlyOperator {
        if (isRewarding) {
            isRewarding = false;
        }
        else {
            isRewarding = true;
        }
    }

    function togglePayments() public onlyOperator {
        if (isPaying) {
            isPaying = false;
        }
        else {
            isPaying = true;
        }
    }

    function _rewardRate(uint256 timeSincePerfect) public pure returns (uint256) {
        if (timeSincePerfect == 0) {
            return 1000e18;
        }
        if (timeSincePerfect <= 60) {
            return 200e18;
        }
        if (timeSincePerfect <= 120) {
            return 40e18;
        }
        if (timeSincePerfect <= 240) {
            return 8e18;
        }
        if (timeSincePerfect <= 480) {
            return 2e18;
        }
        if (timeSincePerfect > 480) {
            return 1e18;
        }
        return 0;
    }

    function pull() public {
        uint256 startGas = gasleft();
        uint256 rn = block.timestamp;
        require(rn - lastPullTimestamp >= SAMPLE_RATE, "not ready to sample price");
        uint256 timeSincePerfect = rn - (lastPullTimestamp + SAMPLE_RATE);
        pair.sync();
        countOfPulls++;
        uint256 _p1 = currentPrice();
        uint256 _p2 = _p1;
        
        if (isConsideringCL) {
            _p1 = clOracle.price_();
        }
        uint256 _p = _p1;
        
        if (_p1 != _p2) {
            if ( (_p1 >= 1007e15 && _p2 >= 1007e15) || (_p1 <= 993e15 && _p2 <= 993e15 ) ) {
                _p = _p2;
            }
            else if (_p1 > 1007e15 || _p2 > 1007e15) {
                _p = (_p1 > _p2) ? _p1 : _p2;
            }
            else if (_p1 < 993e15 || _p2 < 993e15) {
                _p = (_p1 > _p2) ? _p2 : _p1;
            }
            else {
                _p = _p1;
            }
        }

        prices[countOfPulls] = _p;
        timestamps[countOfPulls] = rn;
        lastPullTimestamp = rn;

        if (isRewarding) {
            ESC.mint(msg.sender,_rewardRate(timeSincePerfect));
        }

        if (isPaying && (tx.gasprice <= maxGasPrice)) {
    
            uint256 gasUsed = startGas - gasleft();
            uint256 refundAmount = gasUsed * tx.gasprice + bonus;
            if (refundAmount <= address(this).balance) {
                payable(msg.sender).transfer(refundAmount);
            }
        }

    }

    function _ish() internal pure returns (uint256) {
        return 60*61; // 61 minutes is like kinda sorta an hour
    }

    function _deltaT(uint256 pullNumberStart, uint256 pullNumberEnd) internal view returns (uint256) {
        require(pullNumberEnd > pullNumberStart, "must be between two different pulls");
        return timestamps[pullNumberEnd] - timestamps[pullNumberStart];
    }

    function twap_hourly() public view returns(uint256 twap) {
        uint256 rn = block.timestamp;
        uint256 sum = 0;
        uint256 timeSinceLastPull = rn - timestamps[countOfPulls];
        require(timeSinceLastPull <= _ish(), "need to update price data");
        if (countOfPulls == 1) {
            twap = prices[countOfPulls];
        }
        if (countOfPulls == 2) {
            if (_deltaT(1,2) + timeSinceLastPull <= _ish()) {
                sum+=prices[1]+prices[2];
                twap=sum/2;
            }
            else {
                twap = prices[countOfPulls];
            }
        }
        if (countOfPulls >2) {
            // at most there can be 2 pulls needed since our sample rate is 30 minutes
            
            if (_deltaT(countOfPulls-1,countOfPulls) <= _ish()) {
                sum+=prices[countOfPulls]+prices[countOfPulls-1];
                twap=sum/2;
            }
            else {
                twap=prices[countOfPulls];
            }
        }   
    }



    function pull_hourly() public {
        uint256 startGas = gasleft();
        uint256 rn = block.timestamp;
        require(rn - lastHourlyCalcTimestamp >= 60*60, "not ready to sample price");
        uint256 timeSincePerfect = rn - (lastHourlyCalcTimestamp + 60*60);
        
        countOfCalcs++;
        hourlyTwaps[countOfCalcs] = twap_hourly();
        hourlyTimestamps[countOfCalcs] = rn;
        lastHourlyCalcTimestamp = rn;

        if (isRewarding) {
            ESC.mint(msg.sender,_rewardRate(timeSincePerfect));
        }
        if (isPaying && (tx.gasprice <= maxGasPrice)) {
            uint256 gasUsed = startGas - gasleft();
            uint256 refundAmount = gasUsed * tx.gasprice + bonus;
            if (refundAmount <= address(this).balance) {
                payable(msg.sender).transfer(refundAmount);
            }
        }
    }

    function _deltaTHourly(uint256 calcNumberStart, uint256 calcNumberEnd) internal view returns (uint256) {
        require(calcNumberEnd > calcNumberStart, "must be between two different calcs");
        return hourlyTimestamps[calcNumberEnd] - hourlyTimestamps[calcNumberStart];
    }

    function twap_() public view returns(uint256 twap) {
        uint256 rn = block.timestamp;
        uint256 sum = 0;
        uint256 timeSinceLastCalc = rn - hourlyTimestamps[countOfCalcs];
        require(timeSinceLastCalc <= 6*_ish(), "6 hours have passed, please update 6 hour twap");
        if (countOfCalcs < 6) {
            twap = currentPrice();
        }
        else {
            if(_deltaTHourly(countOfCalcs-5,countOfCalcs) <= 6*_ish()) {    
                sum+=hourlyTwaps[countOfCalcs]+hourlyTwaps[countOfCalcs-1]+hourlyTwaps[countOfCalcs-2]+hourlyTwaps[countOfCalcs-3]+hourlyTwaps[countOfCalcs-4]+hourlyTwaps[countOfCalcs-5];
                twap=sum/6;
            } 
            else if (_deltaTHourly(countOfCalcs-4,countOfCalcs) <= 6*_ish()) {
                sum+=hourlyTwaps[countOfCalcs]+hourlyTwaps[countOfCalcs-1]+hourlyTwaps[countOfCalcs-2]+hourlyTwaps[countOfCalcs-3]+hourlyTwaps[countOfCalcs-4];
                twap=sum/5;
            } 
            else if (_deltaTHourly(countOfCalcs-3,countOfCalcs) <= 6*_ish()) {
                sum+=hourlyTwaps[countOfCalcs]+hourlyTwaps[countOfCalcs-1]+hourlyTwaps[countOfCalcs-2]+hourlyTwaps[countOfCalcs-3];
                twap=sum/4;
            } 
            else if (_deltaTHourly(countOfCalcs-2,countOfCalcs) <= 6*_ish()) {
                sum+=hourlyTwaps[countOfCalcs]+hourlyTwaps[countOfCalcs-1]+hourlyTwaps[countOfCalcs-2];
                twap=sum/3;
            }
            else if (_deltaTHourly(countOfCalcs-1,countOfCalcs) <= 6*_ish()) {
                sum+=hourlyTwaps[countOfCalcs]+hourlyTwaps[countOfCalcs-1];
                twap=sum/2;
            } 
            else {
                twap=hourlyTwaps[countOfCalcs];
            }
        }
         
    }

    function currentPrice() public view returns (uint256 price) {
        if (ex == token0) {
            price = _quote(ex, 1e18, 1);
        } else {
            require(ex == token1, "Oracle: Invalid token");
            price = _quote(ex, 1e18, 1);
        }
    }

    function simpleAverage(uint256 granularity) external view returns (uint256 price) {
        if (ex == token0) {
            price = _quote(ex, 1e18, granularity);
        } else {
            require(ex == token1, "Oracle: Invalid token");
            price = _quote(ex, 1e18, granularity);
        }
    }

    function _quote(
        address tokenIn,
        uint256 amountIn,
        uint256 granularity 
    ) internal view returns (uint256 amountOut) {
        uint256 observationLength = pair.observationLength();
        require(
            granularity <= observationLength,
            "Oracle: Not enough observations"
        );
        uint256 quote = pair.quote(tokenIn, amountIn, granularity);
        amountOut = quote;
    }

    receive() external payable {
        // No additional logic needed unless you want to track deposits
    }

    function drain() public onlyOperator {
        payable(msg.sender).transfer(address(this).balance);
    }
}