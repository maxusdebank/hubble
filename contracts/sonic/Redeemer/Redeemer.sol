/**
 *Submitted for verification at SonicScan.org on 2025-06-17
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
} 

interface IExRedemptionPool {
    function redeemOneToOne(address from, uint256 amount) external;
    function redeemPremium(address from, uint256 amount, uint256 premium) external;
    function STS() external view returns (address);
}

interface IE {
    function isBlackHoleEpoch() external view returns (bool);
    function DSR() external view returns (uint256);
}

contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract Redeemer is ReentrancyGuard {
    address public immutable redemptionPool;
    address public immutable EX;
    address public owner;
    IE public epochs;
    IERC20 public immutable STS;

    event OwnershipTransferred(address indexed newOwner);
    event ERC20Recovered(address indexed token, uint256 amount);
    event EpochsChanged(address indexed newEpochs);
    event Redeemed(address indexed user, uint256 amount, uint256 beforeDSR, uint256 afterDSR);


    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _redemptionPool, address _EX, address _epochs) {
        redemptionPool = _redemptionPool;
        EX = _EX;
        owner = msg.sender;
        epochs = IE(_epochs);
        STS = IERC20(IExRedemptionPool(_redemptionPool).STS());
    }

    function changeEpochs(address newEpochs) public onlyOwner {
        require(newEpochs != address(0), "Invalid address");
        epochs = IE(newEpochs);
        emit EpochsChanged(newEpochs);
    }

    uint256 public basePremium = 10;

    function setBasePremium(uint256 newBasePremium) public onlyOwner {
        basePremium = newBasePremium;
    }

    function currentPremium() public view returns (uint256) {
        return basePremium + (10000 - epochs.DSR());
    }

    function redeem(uint256 amount) public nonReentrant {
        require(amount >= 1e18, "Amount must be greater than or equal to 1 EX");
        require(IERC20(EX).balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256 beforeDSR = epochs.DSR();
        require(beforeDSR > 9000, "before DSR is less than 0.9");
        uint256 premium = basePremium;
        if (beforeDSR <= 10000) {
            premium = currentPremium();
        }
        IExRedemptionPool(redemptionPool).redeemPremium(msg.sender, amount, premium);
        uint256 afterDSR = epochs.DSR();
        require(afterDSR > 9000, "after DSR is less than 0.9");
        require(afterDSR >= beforeDSR, "insufficient premium paid"); 
        emit Redeemed(msg.sender, amount, beforeDSR, afterDSR);  
    }


    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }

    function recoverERC20(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != EX && tokenAddress != address(STS), "Cannot recover EX or STS tokens");
        IERC20(tokenAddress).transfer(owner, amount);
        emit ERC20Recovered(tokenAddress,amount);
    }
}