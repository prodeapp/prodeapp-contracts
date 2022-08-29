// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../IMarket.sol";

contract Billing {
	address public immutable firstPriceAuctionContract;

    address public governor;
    address public beneficiary;
    mapping(IMarket => uint256) public balances;

    constructor(
		address _firstPriceAuctionContract,
		address _governor,
		address _beneficiary
	) {
		firstPriceAuctionContract = _firstPriceAuctionContract;
		governor = _governor;
		beneficiary = _beneficiary;
	}

    function changeGovernor(address _governor) external {
        require(msg.sender == governor, "Not authorized");
        governor = _governor;
    }

    function changeBeneficiary(address _beneficiary) external {
        require(msg.sender == governor, "Not authorized");
        beneficiary = _beneficiary;
    }

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _market The address of the market the bid will be placed to.
     */
    function registerPayment(IMarket _market) external payable {
		balances[_market] += msg.value;
    }

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _market The address of the market the bid will be placed to.
     */
    function executePayment(IMarket _market) external payable {
		uint256 revenue = balances[_market];
		balances[_market] = 0;

		try _market.fundMarket{value: revenue}("ads") {
			// _market.resultSubmissionPeriodStart() == 0
		} catch {
			(bool success, ) = beneficiary.call{value: revenue}(new bytes(0));
			require(success, "Send XDAI failed");
		}
    }
}
