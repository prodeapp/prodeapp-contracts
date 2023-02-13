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

interface IRealityRegistry {
    function metadata(bytes32 questionId) external view returns (
        string memory title,
        string memory outcomes,
        string memory category,
        string memory language,
        uint256 templateId
    );
}

interface IKeyValue {
    function marketCreator(address) external view returns (address);
    function username(address) external view returns (string memory);
    function marketDeleted(address) external view returns (bool);
}

contract MarketView {

    uint256 public constant DIVISOR = 10000;

    struct BaseInfo {
        string name;
        bytes32 hash;
        uint256 price;
        address creator;
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
        string ownerName;
        uint256 points;
        bytes32[] predictions;
    }

    struct EventInfo {
        bytes32 id;
        address arbitrator;
        bytes32 answer;
        uint256 openingTs;
        uint256 answerFinalizedTimestamp;
        bool isPendingArbitration;
        uint256 timeout;
        uint256 minBond;
        uint256 lastBond;
        uint256 bounty;
        string title;
        string outcomes;
        string category;
        string language;
        uint256 templateId;
    }

    IRealityRegistry public realityRegistry;
    IKeyValue public keyValue;

    address public owner = msg.sender;

    constructor(
        IRealityRegistry _realityRegistry,
        IKeyValue _keyValue
    ) {
        realityRegistry = _realityRegistry;
        keyValue = _keyValue;
    }

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    function changeKeyValue(IKeyValue _keyValue) external {
        require(msg.sender == owner, "Not authorized");
        keyValue = _keyValue;
    }

    function changeRealityRegistry(IRealityRegistry _realityRegistry) external {
        require(msg.sender == owner, "Not authorized");
        realityRegistry = _realityRegistry;
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
        if (keyValue.marketDeleted(marketId)) {
            return (
                address(0),
                baseInfo,
                managerInfo,
                periodsInfo,
                eventsInfo
            );
        }

        IMarket market = IMarket(marketId);

        id = marketId;
        baseInfo.name = market.name();
        baseInfo.hash = market.questionsHash();
        baseInfo.price = market.price();
        baseInfo.creator = keyValue.marketCreator(marketId);
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

    function getEvents(address marketId) external view returns (EventInfo[] memory) {
        IMarket market = IMarket(marketId);
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        uint256 _numberOfQuestions = numberOfQuestions(market);

        EventInfo[] memory eventInfo = new EventInfo[](_numberOfQuestions);

        for (uint256 i = 0; i < _numberOfQuestions; i++) {
            eventInfo[i].id = market.questionIDs(i);
            eventInfo[i].arbitrator = realitio.getArbitrator(eventInfo[i].id);
            eventInfo[i].answer = realitio.getBestAnswer(eventInfo[i].id);
            eventInfo[i].openingTs = realitio.getOpeningTS(eventInfo[i].id);
            eventInfo[i].answerFinalizedTimestamp = realitio.getFinalizeTS(eventInfo[i].id);
            eventInfo[i].isPendingArbitration = realitio.isPendingArbitration(eventInfo[i].id);
            eventInfo[i].timeout = realitio.getTimeout(eventInfo[i].id);
            eventInfo[i].minBond = realitio.getMinBond(eventInfo[i].id);
            eventInfo[i].lastBond = realitio.getBond(eventInfo[i].id);
            eventInfo[i].bounty = realitio.getBounty(eventInfo[i].id);

            (eventInfo[i].title, eventInfo[i].outcomes, eventInfo[i].category, , eventInfo[i].templateId) = realityRegistry.metadata(eventInfo[i].id);
        }

        return eventInfo;
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
        betInfo.ownerName = keyValue.username(betInfo.owner);
        betInfo.predictions = getPredictions(market, tokenId);
        betInfo.points = getScore(market, tokenId);
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

    function getScore(IMarket market, uint256 _tokenID) internal view returns (uint256 totalPoints) {
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        bytes32[] memory predictions = getPredictions(market, _tokenID);

        if (predictions.length == 0) {
            //backwards compatibility with older Markets
            return 0;
        }

        uint256 _numberOfQuestions = numberOfQuestions(market);
        for (uint256 i = 0; i < _numberOfQuestions; i++) {
            bytes32 questionId = market.questionIDs(i);
            uint32 finalizeTs = realitio.getFinalizeTS(questionId);
            if (finalizeTs > 0 && predictions[i] == realitio.getBestAnswer(questionId)) {
                totalPoints += 1;
            }
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
