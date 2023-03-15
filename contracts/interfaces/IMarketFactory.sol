// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IMarketFactory {
    struct RealitioQuestion {
        uint256 templateID;
        string question;
        uint32 openingTS;
    }

    function createMarket(
        string memory marketName,
        string memory marketSymbol,
        address creator,
        uint256 creatorFee,
        uint256 closingTime,
        uint256 price,
        uint256 minBond,
        RealitioQuestion[] memory questionsData,
        uint16[] memory prizeWeights
    ) external returns (address);
}
