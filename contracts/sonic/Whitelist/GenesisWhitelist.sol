/**
 *Submitted for verification at testnet.sonicscan.org on 2025-02-24
*/

//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
interface IERC20 {
	function balanceOf(address user) external view returns (uint256);
	function transferFrom(address from, address to, uint256 amount) external;
	function name() external view returns(string memory);
	function symbol() external view returns(string memory);
}
contract GenesisWhitelist {
	address public immutable xHUBBLE;

	uint256 public totalSubmissions = 0;

	mapping (address => uint256) public submissionCountByUser;
	mapping (uint256 => address) public tokenByIndex;
	mapping (address => address) public submitterByToken;
	mapping (address => bool) public isSubmitted;

	constructor (address _xhubble) {
		xHUBBLE = _xhubble;
	}

	function _submit(address token, address submitter) internal {
		require(!isSubmitted[token], "token is already submitted");
		require(IERC20(xHUBBLE).balanceOf(submitter) >= 42e18*(submissionCountByUser[submitter] + 1),"must have 42 xHUBBLE per submission");
		IERC20(token).transferFrom(submitter,address(this),1);

		totalSubmissions++;
		submissionCountByUser[submitter]++;

		tokenByIndex[totalSubmissions] = token;
		submitterByToken[token] = submitter;
		isSubmitted[token] = true;

	}

	function fetchSubmissions() public view returns (address[] memory) {
		address[] memory submissions = new address[](totalSubmissions);
		for (uint256 index = 1; index <= totalSubmissions;index++) {
			submissions[index-1] = tokenByIndex[index];
		}
		return submissions;
	}
    function fetchSubmitters() public view returns (address[] memory) {
		address[] memory submitters = new address[](totalSubmissions);
		for (uint256 index = 1; index <= totalSubmissions;index++) {
			submitters[index-1] = submitterByToken[tokenByIndex[index]];
		}
		return submitters;
	}

	function fetchSymbols() public view returns (string[] memory) {
		string[] memory symbols = new string[](totalSubmissions);
		for (uint256 index = 1; index <= totalSubmissions;index++) {
			symbols[index-1] = IERC20(tokenByIndex[index]).symbol();
		}
		return symbols;
	}

	function fetchNames() public view returns (string[] memory) {
		string[] memory names = new string[](totalSubmissions);
		for (uint256 index = 1; index <= totalSubmissions;index++) {
			names[index-1] = IERC20(tokenByIndex[index]).name();
		}
		return names;
	}

	function submit(address token) external {
		_submit(token, msg.sender);
	}

}