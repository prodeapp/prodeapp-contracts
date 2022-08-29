// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../IMarket.sol";

contract Billing {
    struct Market {
        uint256 balance;
    }

	address public immutable firstPriceAuctionContract;

    mapping(IMarket => Market) public markets;

    constructor(address _firstPriceAuctionContract) {
		firstPriceAuctionContract = _firstPriceAuctionContract;
	}

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _market The address of the market the bid will be placed to.
     */
    function registerPayment(IMarket _market) external payable {
        require(msg.sender == firstPriceAuctionContract, "Not authorized");
		markets[_market].balance += msg.value;
    }

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _market The address of the market the bid will be placed to.
     */
    function executePayment(IMarket _market) external payable {
		if (_market.resultSubmissionPeriodStart() == 0) {
			uint256 amount = markets[_market].balance;
			markets[_market].balance = 0;
			_market.fundMarket{value: amount}("");
		} else {

		}
    }
}
