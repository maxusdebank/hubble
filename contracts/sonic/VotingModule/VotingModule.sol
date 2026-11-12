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

interface IMC {
    function balanceOf(address user) external view returns (uint256);
}

contract VotingModule is ReentrancyGuard, Ownable {
   
    address public mc;
    mapping (address => uint256) public balances;

    string[22] public poolnames = [
      "DERP",
      "UPPIES",
      "WHALE",
      "Sonichu",
      "SPEED",
      "POOR",
      "GOGLZ",
      "THC",
      "sDOG",
      "CANDLE",
      "YE",
      "x33",
      "SHRIMP",
      "BOL",
      "HEDGY",
      "MOON",
      "SEX",
      "180042069",
      "PAL",
      "INDI",
      "ECO",
      "fSIX"
    ];

    uint256 public totalVotes;
    mapping (uint256 => uint256) public totalVotesByPool;
    mapping (address => mapping(uint256=>uint256)) public votesByUserAndPool;



    event Voted(address indexed voter, uint256[] amounts, uint256[] poolIDs);
    event VotesReset(address indexed voter);

     modifier onlyMC {
        require(msg.sender == mc, "sender is not mission control");
        _;
    }

    constructor(address _mc) {
        mc = _mc;
    }

    function vote(
        address voter, 
        uint256[] memory amounts, 
        uint256[] memory poolIDs) 
    external onlyMC nonReentrant {
        require(amounts.length == poolIDs.length, "array lengths must be the same");
        
        uint256 bal = IMC(mc).balanceOf(voter);
        uint256 sum = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            sum += amounts[i];
        }
        require(sum == 10000, "amounts must sum to 10,000");
        _resetVotes(voter);
        for (uint256 j = 0; j < amounts.length; j++) {
            require(poolIDs[j] < 22, "Invalid pool ID");
            votesByUserAndPool[voter][poolIDs[j]] = amounts[j] * bal / 10000;
            totalVotesByPool[poolIDs[j]] += amounts[j] * bal / 10000;
            totalVotes += amounts[j] * bal / 10000;
        }
 
        emit Voted(voter,amounts,poolIDs);
    }

    function _resetVotes(address voter) internal {
        require(voter != address(0), "Voter address cannot be zero");
        uint256 votes;
        for (uint256 i = 0; i < 22; i++) {
            votes = votesByUserAndPool[voter][i];
            totalVotesByPool[i] -= votes;
            totalVotes -= votes;
            votesByUserAndPool[voter][i] = 0;
        }
    }

    function resetVotes(address voter) external onlyMC nonReentrant {
       _resetVotes(voter);
       emit VotesReset(voter);
    }

    function updateStakingBalance(address voter) external onlyMC {
        require(voter != address(0), "Voter address cannot be zero");
        balances[voter] = IMC(mc).balanceOf(voter);
        _resetVotes(voter);
    }

    function getCurrentVotes() external view returns (uint256[22] memory) {
        uint256[22] memory votes;
        for (uint256 i = 0; i < 22; i++) {
            votes[i] = totalVotesByPool[i];
        }
        return votes;
    }
    function getCurrentVotesOfUser(address voter) external view returns (uint256[22] memory) {
        uint256[22] memory votes;
        for (uint256 i = 0; i < 22; i++) {
            votes[i] = votesByUserAndPool[voter][i];
        }
        return votes;
    }
}