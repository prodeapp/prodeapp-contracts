// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./IMarket.sol";

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

interface IRealityRegistry {
    function registerQuestion(
        bytes32 question_id,
        uint256 template_id,
        uint32 opening_ts,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) external;

    function getQuestion(
        uint256 templateId,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) external view returns (string memory question);
}

interface IKeyValue {
    function setMarketCreator(address marketId, address creator) external;
}

contract MarketFactoryV2 {

    struct QuestionMetadata {
        uint256 templateID;
        uint32 openingTS;
        string title;
        string outcomes;
        string category;
        string language;
    }

    IMarketFactory public marketFactory;
    IRealityRegistry public realityRegistry;
    IKeyValue public keyValue;

    address public owner = msg.sender;

    constructor(
        IMarketFactory _marketFactory,
        IRealityRegistry _realityRegistry,
        IKeyValue _keyValue
    ) {
        marketFactory = _marketFactory;
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

        IMarketFactory.RealitioQuestion[] memory questionsData = getQuestionsData(questionsMetadata);

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

        uint256 length = questionsData.length;
        for (uint256 i = 0; i < length; i++) {
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

        return address(market);
    }

    function getQuestionsData(QuestionMetadata[] memory questionsMetadata)
        internal view
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
