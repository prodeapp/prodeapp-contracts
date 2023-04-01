// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./interfaces/IMarket.sol";
import "./interfaces/IMarketFactory.sol";
import "./interfaces/IRealityRegistry.sol";
import "./liquidity/LiquidityFactory.sol";

interface IKeyValue {
    function setMarketCreator(address marketId, address creator) external;
}

/**
 *  @dev MarketFactoryV2.
 *  Factory proxy that stores all data on-chain.
 *  Supports legacy markets and markets with liquidity pools.
 */
contract MarketFactoryV2 {
    struct QuestionMetadata {
        uint256 templateID;
        uint32 openingTS;
        string title;
        string outcomes;
        string category;
        string language;
    }

    address public governor = msg.sender;

    // On-chain data contract helpers
    IRealityRegistry public realityRegistry;
    IKeyValue public keyValue;

    // Factories
    IMarketFactory public marketFactory;
    LiquidityFactory public liquidityFactory;

    constructor(
        IRealityRegistry _realityRegistry,
        IKeyValue _keyValue,
        IMarketFactory _marketFactory,
        LiquidityFactory _liquidityFactory
    ) {
        realityRegistry = _realityRegistry;
        keyValue = _keyValue;
        marketFactory = _marketFactory;
        liquidityFactory = _liquidityFactory;
    }

    function changeGovernor(address _governor) external {
        require(msg.sender == governor, "Not authorized");
        governor = _governor;
    }

    function changeKeyValue(IKeyValue _keyValue) external {
        require(msg.sender == governor, "Not authorized");
        keyValue = _keyValue;
    }

    function changeRealityRegistry(IRealityRegistry _realityRegistry) external {
        require(msg.sender == governor, "Not authorized");
        realityRegistry = _realityRegistry;
    }

    function createMarket(
        string memory marketName,
        string memory marketSymbol,
        address creator,
        uint256 creatorFee,
        uint256 closingTime,
        uint256 price,
        uint256 minBond,
        QuestionMetadata[] memory questionsMetadata,
        uint16[] memory prizeWeights
    ) external returns (address) {
        IMarketFactory.RealitioQuestion[] memory questionsData = getQuestionsData(
            questionsMetadata
        );

        address market = marketFactory.createMarket(
            marketName,
            marketSymbol,
            creator,
            creatorFee,
            closingTime,
            price,
            minBond,
            questionsData,
            prizeWeights
        );

        registerQuestions(market, questionsMetadata);

        return market;
    }

    function createMarketWithLiquidityPool(
        string memory marketName,
        string memory marketSymbol,
        uint256 creatorFee,
        uint256 closingTime,
        uint256 price,
        uint256 minBond,
        QuestionMetadata[] memory questionsMetadata,
        uint16[] memory prizeWeights,
        LiquidityFactory.LiquidityParameters memory liquidityParameters
    ) external returns (address, address) {
        IMarketFactory.RealitioQuestion[] memory questionsData = getQuestionsData(
            questionsMetadata
        );

        LiquidityFactory.MarketParameters memory marketParameters = LiquidityFactory
            .MarketParameters({
                marketName: marketName,
                marketSymbol: marketSymbol,
                creatorFee: creatorFee,
                closingTime: closingTime,
                price: price,
                minBond: minBond,
                questionsData: questionsData,
                prizeWeights: prizeWeights
            });
        (address market, address liquidityPool) = liquidityFactory.createMarketWithLiquidityPool(
            marketParameters,
            liquidityParameters
        );

        registerQuestions(market, questionsMetadata);

        return (market, liquidityPool);
    }

    function registerQuestions(address market, QuestionMetadata[] memory questionsMetadata)
        internal
    {
        for (uint256 i = 0; i < questionsMetadata.length; i++) {
            realityRegistry.registerQuestion(
                IMarket(market).questionIDs(i),
                questionsMetadata[i].templateID,
                questionsMetadata[i].openingTS,
                questionsMetadata[i].title,
                questionsMetadata[i].outcomes,
                questionsMetadata[i].category,
                questionsMetadata[i].language
            );
        }

        keyValue.setMarketCreator(address(market), msg.sender);
    }

    function getQuestionsData(QuestionMetadata[] memory questionsMetadata)
        internal
        view
        returns (IMarketFactory.RealitioQuestion[] memory questionsData)
    {
        questionsData = new IMarketFactory.RealitioQuestion[](questionsMetadata.length);

        uint256 length = questionsData.length;
        for (uint256 i = 0; i < length; i++) {
            string memory question = realityRegistry.getQuestion(
                questionsMetadata[i].templateID,
                questionsMetadata[i].title,
                questionsMetadata[i].outcomes,
                questionsMetadata[i].category,
                questionsMetadata[i].language
            );

            questionsData[i] = IMarketFactory.RealitioQuestion({
                templateID: questionsMetadata[i].templateID,
                question: question,
                openingTS: questionsMetadata[i].openingTS
            });
        }

        return questionsData;
    }
}
