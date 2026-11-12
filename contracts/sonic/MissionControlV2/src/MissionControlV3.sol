// SPDX-License-Identifier: No License
// Hubble Mission Control v2 Contract
pragma solidity ^0.8.0;

import "./ReentrancyGuard.sol";
import "./SafeMath.sol";
import "./IERC20.sol";
import "./SafeERC20.sol";

import "./MissionControlRewards.sol";
import "./IMissionControlRewards.sol";

contract MissionControlv3 is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 constant public N_TOKS = 5;
    enum TOK_IDX { HUBBLE, XHUBBLE, EX, XEX, USDC }

    address public operator;
    address public expansion;
    IMissionControlRewards public mcRewardsModule;

    // user info per pool
    struct UserInfo {
        uint256 amount;
        uint256[N_TOKS] rewardDebt; // [hubble, xhubble, ex, xex, usdc] decimals [18,...,18,6]
    }

    struct PoolInfo {
        IERC20 token;
        uint256[N_TOKS] allocationPoints; // [hubble, xhubble, ex, xex, usdc] decimals [18,...,18,6]
        uint256[N_TOKS] accRewardsPerShare; // [hubble, xhubble, ex, xex, usdc] decimals [18,...,18,6]
        uint256[N_TOKS] poolRewardsPerSec; // [hubble, xhubble, ex, xex, usdc] decimals [18,...,18,6]
        uint256 totalStake;
        uint256 lastRewardTime;
        bool isStarted;
    }

    IERC20[N_TOKS] public rewardTokens; // [hubble, xhubble, ex, xex, usdc]

    PoolInfo[] public poolInfo;

    uint256 public startTime;

    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    uint256[N_TOKS] public totalAllocationPoints = [0,0,0,0,0]; // [hubble, xhubble, ex, xex, usdc] decimals [18,...,18,6]
    uint256[N_TOKS] public rewardsPerSecond = [0,0,0,0,0]; // [hubble, xhubble, ex, xex, usdc] decimals [18,...,18,6]

    bool[N_TOKS] public IS_EXPANSION_TOKEN_MASK = [false, true, true, true, false]; // [xhubble, ex, xex] are expansion tokens
    uint256[N_TOKS] public DEC_MULTIPLIERS = [1e18, 1e18, 1e18, 1e18, 1e6];
    uint256[N_TOKS] public MAX_ALLOC_POINTS = [1e16, 1e16, 1e18, 1e18, 1e5];
    string[N_TOKS] public REWARD_TOKEN_MAX_AMNTS_ERRORS = [
        "MissionControl: more than 864 HUBBLE per day", // hubble
        "MissionControl: more than 864 xHUBBLE per day", // xhubble
        "MissionControl: more than 86400 EX per day", // ex
        "MissionControl: more than 86400 xEX per day", // xex
        "MissionControl: more than 8640 USDC per day" // usdc
    ];
    string[N_TOKS] public RECOVER_TOKEN_ERRORS = [
        "MissionControl: Cannot recover HUBBLE token",
        "MissionControl: Cannot recover xHUBBLE token",
        "MissionControl: Cannot recover EX token",
        "MissionControl: Cannot recover xEX token",
        "MissionControl: Cannot recover USDC token"
    ];

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardsPaid(address indexed user, uint256[N_TOKS] amounts);

    constructor(
        address[N_TOKS] memory toks,
        uint256 _startTime
    ) {
        mcRewardsModule = new MissionControlRewards(msg.sender);

        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            if (toks[tok] != address(0)) {
                rewardTokens[tok] = IERC20(toks[tok]);
            }
        }
        operator = msg.sender;
        expansion = msg.sender;
        startTime = _startTime;
    }

    modifier onlyOperator() {
        require(operator == msg.sender, "MissionControl: caller is not the operator");
        _;
    }
    modifier onlyExpansion() {
        require(expansion == msg.sender, "MissionControl: caller is not the expansion module");
        _;
    }

    modifier pointsWithinLimits(uint256[N_TOKS] memory _allocationPoints) {
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            require(_allocationPoints[tok] <= MAX_ALLOC_POINTS[tok], REWARD_TOKEN_MAX_AMNTS_ERRORS[tok]);
        }
        _;
    }

    modifier noPoolDuplicates(IERC20 _token) {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            require(poolInfo[pid].token != _token, "MissionControl: existing pool?");
        }
        _;
    }

    function getUserInfo(uint256 _pid, address _user) public view returns (UserInfo memory) {
        return userInfo[_pid][_user];
    }

    function getPoolInfo(uint256 _pid) external view returns (PoolInfo memory) {
        return poolInfo[_pid];
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function _zeros() internal pure returns (uint256[N_TOKS] memory){
        uint256[N_TOKS] memory zeros;
        return zeros;
    }

    function subPoolAllocationPointsFromTotal(PoolInfo memory pool) internal {
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            totalAllocationPoints[tok] -= pool.allocationPoints[tok];
        }
    }

    function addPoolAllocationPointsToTotal(PoolInfo memory pool) internal {
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            totalAllocationPoints[tok] += pool.allocationPoints[tok];
        }
    }

    function subPoolAllocPointsFromTotalRewardsPerSec(PoolInfo memory pool) internal {
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            rewardsPerSecond[tok] -= pool.allocationPoints[tok];
        }
    }

    function addPoolAllocPointsToTotalRewardsPerSec(PoolInfo memory pool) internal {
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            rewardsPerSecond[tok] += pool.allocationPoints[tok];
        }
    }

    function add(
        IERC20 _token,
        uint256[N_TOKS] memory _allocationPoints,
        uint256 _lastRewardTime,
        bool _withUpdate
    ) public
        onlyOperator
        pointsWithinLimits(_allocationPoints)
        noPoolDuplicates(_token)
    {
        if (_withUpdate) {
            massUpdatePools();
        }
        if (block.timestamp < startTime) {
            if (_lastRewardTime == 0) {
                _lastRewardTime = startTime;
            } else {
                if (_lastRewardTime < startTime) {
                    _lastRewardTime = startTime;
                }
            }
        } else {
            if (_lastRewardTime == 0 || _lastRewardTime < block.timestamp) {
                _lastRewardTime = block.timestamp;
            }
        }
        bool _isStarted = (_lastRewardTime <= startTime) || (_lastRewardTime <= block.timestamp);

        PoolInfo memory newPoolInfo = PoolInfo({
            token: _token,
            allocationPoints: _allocationPoints,
            accRewardsPerShare: _zeros(),
            poolRewardsPerSec: _zeros(),
            totalStake: 0,
            lastRewardTime: _lastRewardTime,
            isStarted: _isStarted
        });
        poolInfo.push(newPoolInfo);

        if (_isStarted) {
            addPoolAllocationPointsToTotal(newPoolInfo);
            addPoolAllocPointsToTotalRewardsPerSec(newPoolInfo);
        }
    }

     function _change(
        uint256 _pid,
        uint256[N_TOKS] memory _allocationPoints
    ) internal pointsWithinLimits(_allocationPoints) {
        updatePool(_pid);
        PoolInfo storage pool = poolInfo[_pid];

        subPoolAllocationPointsFromTotal(pool);
        subPoolAllocPointsFromTotalRewardsPerSec(pool);

        pool.allocationPoints = _allocationPoints;
        pool.poolRewardsPerSec = _allocationPoints;

        addPoolAllocationPointsToTotal(pool);
        addPoolAllocPointsToTotalRewardsPerSec(pool);
    }

    function change(
        uint256 _pid,
        uint256[N_TOKS] memory _allocationPoints
    ) external onlyOperator {
        _change(_pid, _allocationPoints);
    }

    function _pause(
        uint256 _pid,
        bool[N_TOKS] memory pauseReward
    ) internal {
        PoolInfo storage pool = poolInfo[_pid];
        uint256[N_TOKS] memory _allocationPoints = pool.allocationPoints;
        // Update reward allocation points to 0 for tokens being paused
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            if (pauseReward[tok]) {
                _allocationPoints[tok] = 0;
            }
        }
        _change(_pid, _allocationPoints);
    }

    function pause(
        uint256 _pid,
        bool[N_TOKS] memory pauseReward
    ) external onlyOperator {
        _pause(_pid, pauseReward);
    }

    function pauseExpansion() external onlyExpansion {
        _pause(0, IS_EXPANSION_TOKEN_MASK);
    }

    function updateExpansionPool(
        uint256 xhubbleExpansion,
        uint256 exExpansion,
        uint256 xexExpansion
    ) external onlyExpansion {
        PoolInfo memory pool = poolInfo[0];
        _change(
            0,
            [
                pool.allocationPoints[uint256(TOK_IDX.HUBBLE)],
                xhubbleExpansion,
                exExpansion,
                xexExpansion,
                pool.allocationPoints[uint256(TOK_IDX.USDC)]
            ]);
    }

    function _getGenerated(uint256 _rate, uint256 _fromTime, uint256 _toTime) internal view returns(uint256) {
        if (_fromTime >= _toTime) return 0;
        if (_toTime <= startTime) return 0;
        if (_fromTime <= startTime) return _toTime.sub(startTime).mul(_rate);
        return _toTime.sub(_fromTime).mul(_rate);
    }

    // Return accumulated rewards over the given _from to _to block.
    function getGeneratedReward(uint256 rewardIndex, uint256 _fromTime, uint256 _toTime) internal view returns (uint256) {
        return _getGenerated(rewardsPerSecond[rewardIndex],_fromTime,_toTime);
    }

    function getRewards(uint256 _fromTime, uint256 _toTime) internal view returns (uint256[N_TOKS] memory) {
        uint256[N_TOKS] memory rewards;
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            rewards[tok] = getGeneratedReward(tok, _fromTime, _toTime);
        }
        return rewards;
    }

    function getUpdatedAccRewardsPerShare(uint8 tok, PoolInfo memory pool, uint256 _fromTime, uint256 _toTime, uint256 _tokenSupply) internal view returns (uint256) {
        uint256 rewards = getGeneratedReward(tok, _fromTime, _toTime);
        uint256 accRewardsPerShare = pool.accRewardsPerShare[tok];
        if (totalAllocationPoints[tok] > 0) {
            accRewardsPerShare += rewards.mul(pool.allocationPoints[tok]).div(totalAllocationPoints[tok]).mul(DEC_MULTIPLIERS[tok]).div(_tokenSupply);
        }
        return accRewardsPerShare;
    }


    function pendingRewards(uint256 _pid, address _user) public view returns (uint256[N_TOKS] memory) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 tokenSupply = pool.totalStake;
        uint256[N_TOKS] memory rewards;

        uint256[N_TOKS] memory accRewardsPerShare = pool.accRewardsPerShare;
        if (block.timestamp > pool.lastRewardTime && tokenSupply != 0) {
            for (uint8 tok = 0; tok < N_TOKS; tok++) {
                accRewardsPerShare[tok] = getUpdatedAccRewardsPerShare(tok, pool, pool.lastRewardTime, block.timestamp, tokenSupply);
            }
        }
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            rewards[tok] = user.amount.mul(accRewardsPerShare[tok]).div(1e18).sub(user.rewardDebt[tok]);
        }
        return rewards;
    }


    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    function massUpdatePoolsInRange(uint256 _fromPid, uint256 _toPid) external {
        require(_fromPid <= _toPid, "invalid range");
        require(_toPid < poolInfo.length, "to pid out of range");
        for (uint256 pid = _fromPid; pid <= _toPid; ++pid) {
            updatePool(pid);
        }
    }

    function updatePool(uint256 _pid) private {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        uint256 tokenSupply = pool.totalStake;
        if (tokenSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        if (!pool.isStarted) {
            pool.isStarted = true;

            addPoolAllocationPointsToTotal(pool);
            addPoolAllocPointsToTotalRewardsPerSec(pool);
        }

        uint256[N_TOKS] memory _rewards = getRewards(pool.lastRewardTime, block.timestamp);

        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            if (totalAllocationPoints[tok] > 0) {
                pool.accRewardsPerShare[tok] = pool.accRewardsPerShare[tok].add(
                    _rewards[tok].mul(pool.allocationPoints[tok]).div(totalAllocationPoints[tok]).mul(DEC_MULTIPLIERS[tok]).div(tokenSupply));
            }
        }

        pool.lastRewardTime = block.timestamp;
    }

    function _transferRewards(uint256 _pid, address _sender) internal {
        uint256[N_TOKS] memory _pendingRewards = pendingRewards(_pid, _sender);
        for (uint8 i = 0; i < N_TOKS; i++) {
            if (_pendingRewards[i] > 0) {
                transferRewardsOrNothing(rewardTokens[i], _sender, _pendingRewards[i]);
            }
        }
        emit RewardsPaid(_sender, _pendingRewards);
    }

    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        updatePool(_pid);
        if (user.amount > 0) {
           _transferRewards(_pid, _sender);
        }
        if (_amount > 0 ) {
            uint256 balBefore = pool.token.balanceOf(address(this));
            pool.token.safeTransferFrom(_sender, address(this), _amount);
            uint256 balAfter = pool.token.balanceOf(address(this));
            uint256 actualAmount = balAfter - balBefore;
            user.amount = user.amount.add(actualAmount);
            pool.totalStake = pool.totalStake.add(actualAmount);
        }

        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            user.rewardDebt[tok] = user.amount.mul(pool.accRewardsPerShare[tok]).div(1e18);
        }

        emit Deposit(_sender, _pid, _amount);
    }

    // Withdraw LP tokens.
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        _transferRewards(_pid, _sender);
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.totalStake = pool.totalStake.sub(_amount);
            pool.token.safeTransfer(_sender, _amount);
        }

        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            user.rewardDebt[tok] = user.amount.mul(pool.accRewardsPerShare[tok]).div(1e18);
        }

        emit Withdraw(_sender, _pid, _amount);
    }

    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 _amount = user.amount;
        user.amount = 0;
        pool.totalStake = pool.totalStake.sub(_amount);
        user.rewardDebt = _zeros();
        pool.token.safeTransfer(msg.sender, _amount);
        emit EmergencyWithdraw(msg.sender, _pid, _amount);
    }

    function transferRewardsOrNothing(IERC20 rewardToken, address _to, uint256 _amount) internal {
        uint256 _rewardBal = rewardToken.balanceOf(address(mcRewardsModule));
        if (_rewardBal > 0) {
            if (_amount > _rewardBal) {
                mcRewardsModule.transferRewards(rewardToken, _to, _rewardBal);
            } else {
                mcRewardsModule.transferRewards(rewardToken, _to, _amount);
            }
        }
    }

    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }

    function setExpansion(address _expansion) external onlyOperator {
        expansion = _expansion;
    }

    function setMcRewardsModule(IMissionControlRewards _mcRewardsModule) external onlyOperator {
        mcRewardsModule = _mcRewardsModule;
    }

    function governanceRecoverUnsupported(IERC20 _token, uint256 amount, address to) external onlyOperator {
        // Prevent recovery of LP tokens
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            PoolInfo storage pool = poolInfo[pid];
            require(_token != pool.token, "MissionControl: Token cannot be pool token");
        }

        _token.safeTransfer(to, amount);
    }

    function governanceRecoverUnsupportedFromRewardsContract(IERC20 _token, uint256 amount, address to) external onlyOperator {
        // Prevent recovery of reward tokens
        for (uint8 tok = 0; tok < N_TOKS; tok++) {
            require(_token != rewardTokens[tok], RECOVER_TOKEN_ERRORS[tok]);
        }

        mcRewardsModule.transferRewards(_token, to, amount);
    }
}