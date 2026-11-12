// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
interface IMissionControl {
    function totalSupply() external view returns (uint256); 
    function balanceOf(address account) external view returns (uint256); 
    function stakerByIndex(uint256 index) external view returns (address); 
    function stakerCount() external view returns (uint256); 
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

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
contract RewardModule is ReentrancyGuard {

    // Struct to store reward stream details
    struct RewardStream {
        IERC20 token; // token address
        uint256 totalEmissions; // total amount of tokens available to emit
        uint256 duration; // duration of reward stream
        uint256 lastUpdateTime; // Last time rewards were updated
        uint256 emissionsAllocated; // allocated rewards
        bool hasStream; // set to true when pool is added
        uint256 startTime; // tracks the start of the current stream
        uint256 streamCount; // tracks number of times the stream was reset
        bool hasStreamDriedUp;
    }

    // Interfaces
    IMissionControl public missionControl; // Reference to the MissionControl contract
    IERC20 public xhubble; // The critical reward token (xHUBBLE)

    // State variables
    address public operator; // Operator address with special permissions
    mapping(address => RewardStream) public rewardStreams; // Stores reward token data
    mapping(address => mapping(address => uint256)) public userRewardPaid; // Tracks rewards paid per user per token
    mapping(address => mapping(address => uint256)) public rewardsAllocated; // Tracks allocated rewards per user per token

    // Events
    event RewardStreamAdded(address indexed token, uint256 totalEmissions, uint256 duration);
    event RewardStreamUpdated(address indexed token, uint256 totalEmissions, uint256 duration);
    event RewardTokenRemoved(address indexed token);
    event RewardRateUpdated(address indexed token, uint256 newRewardRate);
    event StreamStarted(address indexed token, uint256 streamCount);
    event CriticalRewardsClaimed(address indexed user, uint256 amount);
    event NonCriticalRewardsClaimed(address indexed user, address indexed token, uint256 amount);
    event OperatorUpdated(address indexed newOperator);

    constructor(address _missionControl, address _xhubble, address _operator) {
        missionControl = IMissionControl(_missionControl);
        xhubble = IERC20(_xhubble);
        operator = _operator;
    }

    // Modifier to restrict access to the operator
    modifier onlyOperator() {
        require(msg.sender == operator, "RewardModule: caller is not the operator");
        _;
    }

    // Add a new reward token
    function _addRewardStream(address token, uint256 totalEmissions, uint256 duration) internal {
        require(token != address(0), "RewardModule: Token address cannot be zero");
        require(!rewardStreams[token].hasStream, "RewardModule: Token is already initialized");

        rewardStreams[token] = RewardStream({
            token: IERC20(token),
            totalEmissions: totalEmissions,
            duration: duration,
            lastUpdateTime: 0,
            emissionsAllocated: 0,
            hasStream: true,
            startTime: 0,
            streamCount: 0,
            hasStreamDriedUp: true
        });
        _activeTokens.push(token);
        emit RewardStreamAdded(token, totalEmissions, duration);
    }

    function _prepNewStream(address token, uint256 totalEmissions, uint256 duration) internal {
        RewardStream storage stream = rewardStreams[token];
        require(stream.hasStreamDriedUp,"Stream is still live");
        stream.totalEmissions = totalEmissions;
        stream.duration = duration;
        stream.emissionsAllocated = 0;
        stream.startTime = 0;
        stream.lastUpdateTime = 0;
        stream.streamCount++;
        emit RewardStreamUpdated(token, totalEmissions, duration);
    }

    // begin streaming rewards
    function _startStream(address token) internal {
        require(token != address(0), "RewardModule: Token address cannot be zero");
        require(rewardStreams[token].hasStream, "RewardModule: Token is not initialized");
        RewardStream storage stream = rewardStreams[token];
        require(stream.startTime == 0, "Must be first stream, or old stream must be finished");
        require(stream.hasStreamDriedUp,"Stream is still live");

        // a new stream begins
        stream.startTime = block.timestamp;
        stream.hasStreamDriedUp = false;
        emit StreamStarted(token, stream.streamCount);
    }

    function _streamRate(address token) internal view returns (uint256) {
        RewardStream storage stream = rewardStreams[token];
        require(stream.duration > 0, "No stream duration");
        return stream.totalEmissions / stream.duration;
    }

    function _shareOfStake(address staker) internal view returns (uint256) {
        require(missionControl.totalSupply() > 0,"Mission Control empty");
        return 1e18*missionControl.balanceOf(staker)/missionControl.totalSupply();
    }
   
    function _updateStreamState(address token) internal {
        RewardStream storage stream = rewardStreams[token];
        uint256 lastUpdateTime = (stream.lastUpdateTime > 0) ? stream.lastUpdateTime : stream.startTime;
        uint256 nowOrEnd = (stream.startTime + stream.duration > block.timestamp) ? block.timestamp : stream.startTime + stream.duration;
        uint256 totalNewRewards = (nowOrEnd - lastUpdateTime) * _streamRate(token);
        if (!stream.hasStreamDriedUp) {
            uint256 stakerIndex = 1;
            address staker = missionControl.stakerByIndex(stakerIndex);
            while (staker != address(0)) {
                rewardsAllocated[staker][token] += _shareOfStake(staker) * totalNewRewards / 1e18;
                stakerIndex++;
                staker = missionControl.stakerByIndex(stakerIndex);
            }
            stream.emissionsAllocated += totalNewRewards;
            stream.lastUpdateTime = nowOrEnd;
            if (nowOrEnd != block.timestamp) {
                stream.hasStreamDriedUp = true;
            }
        } 
    }

    // Mission control functions -----------------------------------------------------------------------
    function viewPendingRewards(address user, address token) public view returns(uint256) {
        RewardStream storage stream = rewardStreams[token];
        uint256 lastUpdateTime = (stream.lastUpdateTime > 0) ? stream.lastUpdateTime : stream.startTime;
        uint256 nowOrEnd = (stream.startTime + stream.duration > block.timestamp) ? block.timestamp : stream.startTime + stream.duration;
        uint256 totalNewRewards = (nowOrEnd - lastUpdateTime) * _streamRate(token);
        uint256 pendingRewards = ( _shareOfStake(user) * totalNewRewards / 1e18 ) + rewardsAllocated[user][token] - userRewardPaid[user][token];
        return pendingRewards;
    }

    function claimCriticalRewards(address user) external nonReentrant {
        require(rewardStreams[address(xhubble)].hasStream, "RewardModule: Token is not active for rewards");
        _updateStreamState(address(xhubble));
        uint256 pendingRewards = rewardsAllocated[user][address(xhubble)] - userRewardPaid[user][address(xhubble)];
        userRewardPaid[user][address(xhubble)] += pendingRewards;
        if (pendingRewards > 0) {
            xhubble.transfer(user,pendingRewards);
        }
    }

    function _claimNonCriticalReward(address user, address token) internal {
        require(token != address(xhubble), "RewardModule: Use claimCriticalRewards for xHUBBLE");
        require(rewardStreams[token].hasStream, "RewardModule: Token is not active for rewards");
        _updateStreamState(token);
        uint256 pendingRewards = rewardsAllocated[user][token] - userRewardPaid[user][token];
        userRewardPaid[user][token] += pendingRewards;
        if (pendingRewards > 0) {
            IERC20(token).transfer(user, pendingRewards);
            emit NonCriticalRewardsClaimed(user, token, pendingRewards);
        }
    }

    function claimNonCriticalReward(address user, address token) external nonReentrant {
        _claimNonCriticalReward(user,token);
    }

    function claimNonCriticalRewards(address user) external nonReentrant {
        for (uint256 i = 0; i < _activeTokens.length; i++) {
            if (_activeTokens[i] != address(xhubble)) {
                _claimNonCriticalReward(user, _activeTokens[i]);
            }
        }
    }

    function updateStakingBalance(address user) external {
        require(msg.sender == address(missionControl), "RewardModule: Only MissionControl can call this");
        require(user != address(0),"Must not be 0 address");
        for (uint256 i = 0; i < _activeTokens.length; i++) {
           _updateStreamState(_activeTokens[i]);
        }
    }


    // Operator functions ------------------------------------------------------

    function addRewardStream(address token, uint256 totalEmissions, uint256 duration) external onlyOperator {
        IERC20(token).transferFrom(msg.sender,address(this),totalEmissions);
        _addRewardStream(token, totalEmissions, duration);
    }

    function prepNewStream(address token, uint256 totalEmissions, uint256 duration) external onlyOperator {
        IERC20(token).transferFrom(msg.sender,address(this),totalEmissions);
        _prepNewStream(token, totalEmissions, duration);
    }

    function startStream(address token) external onlyOperator {
       _startStream(token);
    }

    // Remove a reward token
    function removeRewardToken(uint256 index, address token) external onlyOperator {
        require(_activeTokens[index] == token,"wrong index");
        require(rewardStreams[token].hasStream, "RewardModule: Token is not active");
        require(IERC20(token).balanceOf(address(this)) == 0, "Token may still be claimable for some users or excess is in the contract");
        rewardStreams[token].hasStream = false;
        
        for (uint i = index; i<_activeTokens.length-1; i++){
            _activeTokens[i] = _activeTokens[i+1];
        }
        _activeTokens.pop();
    
        emit RewardTokenRemoved(token);
    }

    function drainReward(address token) external onlyOperator {
        require (rewardStreams[token].hasStreamDriedUp, "stream is active");
        IERC20(token).transfer(operator,IERC20(token).balanceOf(address(this)));
    }

    // Set or update the operator address
    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "RewardModule: New operator cannot be zero address");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    // Helper function to get active tokens
    function getActiveTokens() external view returns (address[] memory) {
        return _activeTokens;
    }
 
    // Internal storage for active tokens
    address[] private _activeTokens;

}