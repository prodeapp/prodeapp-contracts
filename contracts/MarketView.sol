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

    struct BetInfo {
        address marketId;
        string marketName;
        uint256 tokenId;
        address owner;
        uint256 points;
        bytes32[] predictions;
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
        baseInfo.prizes = getPrizes(market);
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

        eventsInfo.numOfEvents = numberOfQuestions(market);
        eventsInfo.numOfEventsWithAnswer = getNumOfEventsWithAnswer(market);
        eventsInfo.hasPendingAnswers = eventsInfo.numOfEvents > eventsInfo.numOfEventsWithAnswer;
    }

    function getMarketBets(address marketId)
        external
        view
        returns (
            BetInfo[] memory
        )
    {
        IMarket market = IMarket(marketId);

        uint256 numOfBets = market.nextTokenID();

        BetInfo[] memory betInfo = new BetInfo[](numOfBets);

        for (uint256 i = 0; i < numOfBets; i++) {
            betInfo[i] = getBetByToken(market, i, market.name());
        }

        return betInfo;
    }

    function getTokenBet(address marketId, uint256 tokenId)
        external
        view
        returns (
            BetInfo memory betInfo
        )
    {
        IMarket market = IMarket(marketId);

        betInfo = getBetByToken(market, tokenId, market.name());
    }

    function getBetByToken(IMarket market, uint256 tokenId, string memory marketName)
        internal
        view
        returns (
            BetInfo memory betInfo
        )
    {
        betInfo.marketId = address(market);
        betInfo.marketName = marketName;
        betInfo.tokenId = tokenId;
        betInfo.owner = market.ownerOf(tokenId);
        betInfo.predictions = getPredictions(market, tokenId);

        if (market.resultSubmissionPeriodStart() == 0) {
            betInfo.points = 0;
        } else {
            betInfo.points = getScore(market, tokenId);
        }
    }

    function getPool(IMarket market, uint256 managementReward, uint256 fee) internal view returns (uint256 pool) {
        if (market.resultSubmissionPeriodStart() == 0) {
            return address(market).balance;
        }

        return managementReward * DIVISOR / fee;
    }

    function getNumOfEventsWithAnswer(IMarket market) internal view returns (uint256 count) {
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        uint256 _numberOfQuestions = numberOfQuestions(market);
        for (uint256 i = 0; i < _numberOfQuestions; i++) {
            if (realitio.getFinalizeTS(market.questionIDs(i)) > 0) {
                count += 1;
            }
        }
    }

    //backwards compatibility with older Markets
    function getPredictions(IMarket market, uint256 _tokenID) internal view returns (bytes32[] memory predictions) {
        try market.getPredictions(_tokenID) returns (bytes32[] memory _predictions) {
            predictions = _predictions;
        } catch {
            // we can't get predictions for older SC markets
        }
    }

    //backwards compatibility with older Markets
    function getScore(IMarket market, uint256 _tokenID) internal view returns (uint256 totalPoints) {
        try market.getScore(_tokenID) returns (uint256 _totalPoints) {
            totalPoints = _totalPoints;
        } catch {
            totalPoints = 0;
        }
    }

    //backwards compatibility with older Markets
    function getPrizes(IMarket market) internal view returns (uint256[] memory) {
        try market.getPrizes() returns (uint256[] memory prizes) {
            return prizes;
        } catch {
            uint256[] memory prizeMultipliers = new uint256[](3);

            for (uint256 i = 0; i < prizeMultipliers.length; i++) {
                try market.prizeWeights(i) returns (uint16 prizeWeight) {
                    prizeMultipliers[i] = uint256(prizeWeight);
                } catch {
                    return prizeMultipliers;
                }
            }

            return prizeMultipliers;
        }
    }

    //backwards compatibility with older Markets
    function numberOfQuestions(IMarket market) internal view returns (uint256 count) {
        try market.numberOfQuestions() returns (uint256 _count) {
            count = _count;
        } catch {
            while (true) {
                try market.questionIDs(count) returns (bytes32) {
                    count++;
                } catch {
                    return count;
                }
            }
        }
    }
}
