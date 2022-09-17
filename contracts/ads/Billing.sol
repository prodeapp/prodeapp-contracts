// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../IMarket.sol";

contract Billing {
    address public governor;
    address public fallbackRecipient;
    mapping(IMarket => uint256) public balances;

    event BalanceChanged(IMarket indexed _market, uint256 _newBalance);

    constructor(address _governor, address _fallbackRecipient) {
        governor = _governor;
        fallbackRecipient = _fallbackRecipient;
    }

    function changeGovernor(address _governor) external {
        require(msg.sender == governor, "Not authorized");
        governor = _governor;
    }

    function changeBeneficiary(address _fallbackRecipient) external {
        require(msg.sender == governor, "Not authorized");
        fallbackRecipient = _fallbackRecipient;
    }

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _market The address of the market the bid will be placed to.
     */
    function registerPayment(IMarket _market) external payable {
        balances[_market] += msg.value;
        emit BalanceChanged(_market, balances[_market]);
    }

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _market The address of the market the bid will be placed to.
     */
    function executePayment(IMarket _market) external payable {
        uint256 revenue = balances[_market];
        balances[_market] = 0;

        if (address(_market).code.length > 0) {
            // Address is a contract. See @openzeppelin/contracts/utils/Address.sol
            try _market.fundMarket{value: revenue}("ads") {
                // _market.resultSubmissionPeriodStart() == 0
            } catch {
                (bool success, ) = fallbackRecipient.call{value: revenue}(new bytes(0));
                require(success, "Send XDAI failed");
            }
        } else {
            (bool success, ) = fallbackRecipient.call{value: revenue}(new bytes(0));
            require(success, "Send XDAI failed");
        }

        emit BalanceChanged(_market, 0);
    }
}
