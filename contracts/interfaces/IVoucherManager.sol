// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMarket.sol";

interface IVoucherManager {
    function placeBet(
        IMarket _market,
        address _attribution,
        bytes32[] calldata _results
    ) external payable returns (uint256);

    function fundAddress(address _to) external payable;

    function balance(address _owner) external view returns (uint256);

    function marketsWhitelist(IMarket _market) external view returns (bool);
}
