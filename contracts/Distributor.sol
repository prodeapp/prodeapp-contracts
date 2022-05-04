// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract Distributor {

    address payable[] public recipients;

    constructor(address payable[] memory _recipients) {
        recipients = _recipients;
    }

    function distribute() external {
        uint256 amount = address(this).balance / recipients.length;
        for (uint256 i = 0; i < recipients.length; i++)
            recipients[i].send(amount);
    }

    receive() external payable {}
}
