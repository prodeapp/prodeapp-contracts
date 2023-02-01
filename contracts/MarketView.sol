// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./IMarket.sol";

interface IManager {
    function creator() external view returns (address);
    function creatorFee() external view returns (uint256);
    function protocolFee() external view returns (uint256);
}

contract MarketView {

    struct MarketPeriod {
        uint256 closingTime;
        uint256 resultSubmissionPeriodStart;
        uint256 submissionTimeout;
    }

    struct ManagerInfo {
        address managerId;
        uint256 managementFee;
        uint256 protocolFee;
    }

    function getMarket(address marketId)
        external
        view
        returns (
            address id,
            string memory name,
            bytes32 hash,
            uint256 price,
            uint256 pool,
            uint256[] memory prizes,
            ManagerInfo memory managerInfo,
            MarketPeriod memory period,
            uint256 numOfBets,
            uint256 numOfEvents,
            uint256 numOfEventsWithoutAnswer,
            bool hasPendingAnswers
        )
    {
        IMarket market = IMarket(marketId);

        id = marketId;
        name = market.name();
        hash = market.questionsHash();
        price = market.price();
        pool = getPool(market);
        prizes = market.getPrizes();

        (, , address _manager, , ) = market.marketInfo();
        IManager manager = IManager(_manager);
        managerInfo.managerId = manager.creator();
        managerInfo.managementFee = manager.creatorFee();
        managerInfo.protocolFee = manager.protocolFee();

        period.closingTime = market.closingTime();
        period.resultSubmissionPeriodStart = market.resultSubmissionPeriodStart();
        period.submissionTimeout = market.submissionTimeout();

        numOfBets = market.nextTokenID();
        numOfEvents = market.numberOfQuestions();
        numOfEventsWithoutAnswer = getNumOfEventsWithoutAnswer(market);
        hasPendingAnswers = numOfEventsWithoutAnswer > 0;

        // category
        // creator
        // curated
    }

    function getPool(IMarket market) internal view returns (uint256 pool) {
        if (market.resultSubmissionPeriodStart() == 0) {
            return address(market).balance;
        }

        return market.totalPrize();
    }

    function getNumOfEventsWithoutAnswer(IMarket market) internal view returns (uint256 count) {
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        uint256 numberOfQuestions = market.numberOfQuestions();
        for (uint256 i = 0; i < numberOfQuestions; i++) {
            if (realitio.getFinalizeTS(market.questionIDs(i)) == 0) {
                count += 1;
            }
        }
    }

}
