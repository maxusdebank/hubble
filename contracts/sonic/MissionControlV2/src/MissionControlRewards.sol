// SPDX-License-Identifier: No License
// Hubble Mission Control Rewards Contract

pragma solidity ^0.8.0;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./IMissionControlRewards.sol";

contract MissionControlRewards is IMissionControlRewards {
    using SafeERC20 for IERC20;

    address public missionControl;
    address public operator;

    constructor(address _operator) {
        missionControl = msg.sender;
        operator = _operator;
    }

    modifier onlyMissionControl() {
        require(msg.sender == missionControl, "Only MissionControl can call this function");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator can call this function");
        _;
    }

    function setMissionControl(address _missionControl) external onlyOperator {
        missionControl = _missionControl;
    }

    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }

    function transferRewards(IERC20 rewardToken, address _to, uint256 _amount) external onlyMissionControl {
        rewardToken.safeTransfer(_to, _amount);
    }
}