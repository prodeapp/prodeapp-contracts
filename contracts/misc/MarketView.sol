// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "../interfaces/IMarket.sol";

interface IManager {
    function creator() external view returns (address);

    function creatorFee() external view returns (uint256);

    function protocolFee() external view returns (uint256);
}

interface IBetNFTDescriptor {
    function curatedMarkets() external view returns (address);
}

interface ICurate {
    function isRegistered(bytes32 questionsHash) external view returns (bool);
}

interface IRealityRegistry {
    function metadata(bytes32 questionId)
        external
        view
        returns (
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

interface IMarketFactory {
    function QUESTION_TIMEOUT() external view returns (uint32);

    function arbitrator() external view returns (address);

    function realitio() external view returns (address);

    function allMarkets() external view returns (address[] memory);
}

interface ILiquidityFactory {
    function exists(address) external view returns (bool);
}

interface ILiquidityPool {
    function creator() external view returns (address);

    function creatorFee() external view returns (uint256);

    function pointsToWin() external view returns (uint256);

    function betMultiplier() external view returns (uint256);

    function totalDeposits() external view returns (uint256);

    function getMarketPaymentIfWon() external view returns (uint256);
}

contract MarketView {
    uint256 public constant DIVISOR = 10000;
    bytes32 public constant SETTLED_TO_SOON =
        0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe;

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

    struct LiquidityInfo {
        address id;
        address creator;
        uint256 creatorFee;
        uint256 pointsToWin;
        uint256 betMultiplier;
        uint256 totalDeposits;
        uint256 prizePool;
    }

    struct MarketInfo {
        address id;
        BaseInfo baseInfo;
        ManagerInfo managerInfo;
        PeriodsInfo periodsInfo;
        EventsInfo eventsInfo;
        LiquidityInfo liquidityInfo;
    }

    IRealityRegistry public realityRegistry;
    IKeyValue public keyValue;
    ILiquidityFactory public liquidityFactory;
    IMarketFactory public marketFactory;

    address public owner = msg.sender;

    constructor(
        IRealityRegistry _realityRegistry,
        IKeyValue _keyValue,
        ILiquidityFactory _liquidityFactory,
        IMarketFactory _marketFactory
    ) {
        realityRegistry = _realityRegistry;
        keyValue = _keyValue;
        liquidityFactory = _liquidityFactory;
        marketFactory = _marketFactory;
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

    function getMarket(address marketId) public view returns (MarketInfo memory) {
        BaseInfo memory baseInfo;
        ManagerInfo memory managerInfo;
        PeriodsInfo memory periodsInfo;
        EventsInfo memory eventsInfo;
        LiquidityInfo memory liquidityInfo;

        if (keyValue.marketDeleted(marketId)) {
            return
                MarketInfo({
                    id: address(0),
                    baseInfo: baseInfo,
                    managerInfo: managerInfo,
                    periodsInfo: periodsInfo,
                    eventsInfo: eventsInfo,
                    liquidityInfo: liquidityInfo
                });
        }

        IMarket market = IMarket(marketId);

        address id = marketId;
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

        (uint256 _fee, , address _manager, , ) = market.marketInfo();
        IManager manager = IManager(_manager);
        managerInfo.managerId = manager.creator();
        managerInfo.managementRewards = market.managementReward();
        managerInfo.managementFee = manager.creatorFee();
        managerInfo.protocolFee = manager.protocolFee();

        baseInfo.pool = getPool(market, managerInfo.managementRewards, _fee);

        eventsInfo.numOfEvents = numberOfQuestions(market);
        eventsInfo.numOfEventsWithAnswer = getNumOfEventsWithAnswer(market);
        eventsInfo.hasPendingAnswers = eventsInfo.numOfEvents > eventsInfo.numOfEventsWithAnswer;

        if (liquidityFactory.exists(managerInfo.managerId)) {
            liquidityInfo.id = managerInfo.managerId;

            ILiquidityPool liquidityPool = ILiquidityPool(liquidityInfo.id);

            liquidityInfo.creator = liquidityPool.creator();
            liquidityInfo.creatorFee = liquidityPool.creatorFee();
            liquidityInfo.pointsToWin = liquidityPool.pointsToWin();
            liquidityInfo.betMultiplier = liquidityPool.betMultiplier();
            liquidityInfo.totalDeposits = liquidityPool.totalDeposits();
            liquidityInfo.prizePool = liquidityPool.getMarketPaymentIfWon();
        }

        return
            MarketInfo({
                id: id,
                baseInfo: baseInfo,
                managerInfo: managerInfo,
                periodsInfo: periodsInfo,
                eventsInfo: eventsInfo,
                liquidityInfo: liquidityInfo
            });
    }

    function getMarkets(uint256 count) external view returns (MarketInfo[] memory) {
        address[] memory allMarkets = marketFactory.allMarkets();

        MarketInfo[] memory marketsInfo = new MarketInfo[](count);

        if (allMarkets.length == 0) {
            return marketsInfo;
        }

        uint256 lastIndex = allMarkets.length - 1;
        uint256 startIndex = allMarkets.length > count ? allMarkets.length - count : 0;
        uint256 currentIndex = 0;

        for (uint256 j = lastIndex; j >= startIndex; j--) {
            marketsInfo[currentIndex++] = getMarket(allMarkets[j]);
        }

        return marketsInfo;
    }

    function getMarketBets(address marketId) external view returns (BetInfo[] memory) {
        IMarket market = IMarket(marketId);

        uint256 numOfBets = market.nextTokenID();

        BetInfo[] memory betInfo = new BetInfo[](numOfBets);

        for (uint256 i = 0; i < numOfBets; i++) {
            betInfo[i] = getBetByToken(market, i, market.name());
        }

        return betInfo;
    }

    function hasBets(address userId, address marketId) external view returns (bool) {
        IMarket market = IMarket(marketId);

        uint256 numOfBets = market.nextTokenID();

        for (uint256 tokenId = 0; tokenId < numOfBets; tokenId++) {
            if (market.ownerOf(tokenId) == userId) {
                return true;
            }
        }

        return false;
    }

    function getTokenBet(address marketId, uint256 tokenId)
        external
        view
        returns (BetInfo memory betInfo)
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
            bytes32 questionId = getQuestionId(market.questionIDs(i), realitio);

            eventInfo[i].id = questionId;
            eventInfo[i].arbitrator = realitio.getArbitrator(questionId);
            eventInfo[i].answer = realitio.getBestAnswer(questionId);
            eventInfo[i].openingTs = realitio.getOpeningTS(questionId);
            eventInfo[i].answerFinalizedTimestamp = realitio.getFinalizeTS(questionId);
            eventInfo[i].isPendingArbitration = realitio.isPendingArbitration(questionId);
            eventInfo[i].timeout = realitio.getTimeout(questionId);
            eventInfo[i].minBond = realitio.getMinBond(questionId);
            eventInfo[i].lastBond = realitio.getBond(questionId);
            eventInfo[i].bounty = realitio.getBounty(questionId);

            (
                eventInfo[i].title,
                eventInfo[i].outcomes,
                eventInfo[i].category,
                ,
                eventInfo[i].templateId
            ) = realityRegistry.metadata(eventInfo[i].id);
        }

        return eventInfo;
    }

    function getBetByToken(
        IMarket market,
        uint256 tokenId,
        string memory marketName
    ) public view returns (BetInfo memory betInfo) {
        betInfo.marketId = address(market);
        betInfo.marketName = marketName;
        betInfo.tokenId = tokenId;
        betInfo.owner = market.ownerOf(tokenId);
        betInfo.ownerName = keyValue.username(betInfo.owner);
        betInfo.predictions = getPredictions(market, tokenId);
        betInfo.points = getScore(market, tokenId);
    }

    function getMarketFactoryAttrs()
        external
        view
        returns (
            address arbitrator,
            address realitio,
            uint256 timeout
        )
    {
        arbitrator = marketFactory.arbitrator();
        realitio = marketFactory.realitio();
        timeout = marketFactory.QUESTION_TIMEOUT();
    }

    function getPool(
        IMarket market,
        uint256 managementReward,
        uint256 fee
    ) public view returns (uint256 pool) {
        if (market.resultSubmissionPeriodStart() == 0) {
            return address(market).balance;
        }

        return (managementReward * DIVISOR) / fee;
    }

    function getNumOfEventsWithAnswer(IMarket market) public view returns (uint256 count) {
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        uint256 _numberOfQuestions = numberOfQuestions(market);
        for (uint256 i = 0; i < _numberOfQuestions; i++) {
            bytes32 questionId = getQuestionId(market.questionIDs(i), realitio);
            if (realitio.getFinalizeTS(questionId) > 0) {
                count += 1;
            }
        }
    }

    //backwards compatibility with older Markets
    function getPredictions(IMarket market, uint256 _tokenID)
        public
        view
        returns (bytes32[] memory predictions)
    {
        try market.getPredictions(_tokenID) returns (bytes32[] memory _predictions) {
            predictions = _predictions;
        } catch {
            // we can't get predictions for older SC markets
        }
    }

    function getScore(IMarket market, uint256 _tokenID) public view returns (uint256 totalPoints) {
        RealityETH_v3_0 realitio = RealityETH_v3_0(market.realitio());
        bytes32[] memory predictions = getPredictions(market, _tokenID);

        if (predictions.length == 0) {
            //backwards compatibility with older Markets
            return 0;
        }

        uint256 _numberOfQuestions = numberOfQuestions(market);
        for (uint256 i = 0; i < _numberOfQuestions; i++) {
            bytes32 questionId = getQuestionId(market.questionIDs(i), realitio);
            if (
                realitio.getFinalizeTS(questionId) > 0 &&
                predictions[i] == realitio.getBestAnswer(questionId) &&
                predictions[i] != SETTLED_TO_SOON
            ) {
                totalPoints += 1;
            }
        }
    }

    //backwards compatibility with older Markets
    function getPrizes(IMarket market) public view returns (uint256[] memory) {
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
    function numberOfQuestions(IMarket market) public view returns (uint256 count) {
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

    function getQuestionId(bytes32 questionId, RealityETH_v3_0 realitio)
        public
        view
        returns (bytes32)
    {
        if (realitio.isFinalized(questionId) && realitio.isSettledTooSoon(questionId)) {
            bytes32 replacementId = realitio.reopened_questions(questionId);
            if (replacementId != bytes32(0)) {
                questionId = replacementId;
            }
        }
        return questionId;
    }
}
