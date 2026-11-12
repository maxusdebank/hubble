// SPDX-License-Identifier: No License
pragma solidity ^0.8.0;

import "./IERC20.sol";

interface IMissionControlRewards {
    function setOperator(address _operator) external;
    function transferRewards(IERC20 rewardToken, address _to, uint256 _amount) external;
}