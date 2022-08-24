// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../IMarket.sol";

interface IERC20 {
    function balanceOf(address _owner) external view returns (uint256);

    function transfer(address _to, uint256 _amount) external returns (bool);
}

contract MultiMarketManager {
    IMarket public immutable market;
    address public owner = msg.sender;
    address payable public creator = payable(msg.sender);

    constructor(IMarket _market) {
        market = _market;
    }

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    function changeRecipient(address payable _creator) external {
        require(msg.sender == owner, "Not authorized");
        creator = _creator;
    }

    // TODO

    receive() external payable {}
}
