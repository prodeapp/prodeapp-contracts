// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IERC20 {
    function balanceOf(address _owner) external view returns (uint256);
	function transfer(address _to, uint256 _amount) external returns (bool);
}

contract CreatorRelayer {
    address public owner = msg.sender;
    address payable public recipient = payable(msg.sender);

    constructor() { }

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    function changeRecipient(address payable _recipient) external {
        require(msg.sender == owner, "Not authorized");
        recipient = _recipient;
    }

	function relay() external {
        (bool success,) = recipient.call{value: address(this).balance}(new bytes(0));
        require(success, 'Send XDAI failed');
	}

    function relayERC20(IERC20 _token) external {
		uint256 tokenBalance = _token.balanceOf(address(this));
		_token.transfer(recipient, tokenBalance);
    }

    receive() external payable {}
}
