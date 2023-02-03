// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./IMarket.sol";

interface IManager {
    function creator() external view returns (address);
    function creatorFee() external view returns (uint256);
    function protocolFee() external view returns (uint256);
}

interface IBetNFTDescriptor {
    function curatedMarkets() external view returns (address);
}

interface ICurate {
    function isRegistered(bytes32 questionsHash) external view returns(bool);
}

contract MarketView {

    uint256 public constant DIVISOR = 10000;

    struct BaseInfo {
        string name;
        bytes32 hash;
        uint256 price;
        uint256[] prizes;
        uint256 numOfBets;
        uint256 pool;
        bool curated;
    }

    struct PeriodsInfo {
        uint256 closingTime;
        uint256 resultSubmissionPeriodStart;
        uint256 submissionTimeout;
    }

    struct ManagerInfo {
        address managerId;
        uint256 managementRewards;
        uint256 managementFee;
        uint256 protocolFee;
    }

    struct EventsInfo {
        uint256 numOfEvents;
        uint256 numOfEventsWithAnswer;
        bool hasPendingAnswers;
    }

    function getMarket(address marketId)
        external
        view
        returns (
            address id,
            BaseInfo memory baseInfo,
            ManagerInfo memory managerInfo,
            PeriodsInfo memory periodsInfo,
            EventsInfo memory eventsInfo
        )
    {
        IMarket market = IMarket(marketId);

        id = marketId;
        baseInfo.name = market.name();
        baseInfo.hash = market.questionsHash();
        baseInfo.price = market.price();
        baseInfo.prizes = market.getPrizes();
        baseInfo.numOfBets = market.nextTokenID();

        address betNFTDescriptor = market.betNFTDescriptor();
        address curatedMarkets = IBetNFTDescriptor(betNFTDescriptor).curatedMarkets();
        baseInfo.curated = ICurate(curatedMarkets).isRegistered(baseInfo.hash);

        periodsInfo.closingTime = market.closingTime();
        periodsInfo.resultSubmissionPeriodStart = market.resultSubmissionPeriodStart();
        periodsInfo.submissionTimeout = market.submissionTimeout();

        (uint256 _fee , , address _manager, , ) = market.marketInfo();
        IManager manager = IManager(_manager);
        managerInfo.managerId = manager.creator();
        managerInfo.managementRewards = market.managementReward();
        managerInfo.managementFee = manager.creatorFee();
        managerInfo.protocolFee = manager.protocolFee();

        baseInfo.pool = getPool(market, managerInfo.managementRewards, _fee);

        eventsInfo.numOfEvents = market.numberOfQuestions();
        eventsInfo.numOfEventsWithAnswer = getNumOfEventsWithAnswer(market);
        eventsInfo.hasPendingAnswers = eventsInfo.numOfEvents > eventsInfo.numOfEventsWithAnswer;
    }

    function getPool(IMarket market, uint256 managementReward, uint256 fee) internal view returns (uint256 pool) {
        if (market.resultSubmissionPeriodStart() == 0) {
            return address(market).balance;
        }

        return managementReward * DIVISOR / fee;
    }

    function getNumOfEventsWithAnswer(IMarket market) internal view returns (uint256 count) {
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        uint256 numberOfQuestions = market.numberOfQuestions();
        for (uint256 i = 0; i < numberOfQuestions; i++) {
            if (realitio.getFinalizeTS(market.questionIDs(i)) > 0) {
                count += 1;
            }
        }
    }

}
