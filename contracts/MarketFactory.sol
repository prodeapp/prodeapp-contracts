// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./Market.sol";
import "./manager/Manager.sol";

contract MarketFactory {
    using Clones for address;

    struct RealitioQuestion {
        uint256 templateID;
        string question;
        uint32 openingTS;
    }

    uint32 public constant QUESTION_TIMEOUT = 1.5 days;
    
    Market[] public markets;
    address public immutable arbitrator;
    address public immutable realitio;
    address public immutable nftDescriptor;
    uint256 public immutable submissionTimeout;

    address public market;
    address public governor;
    address public protocolTraesury;
    address public manager;
    uint256 public protocolFee;

    event NewMarket(address indexed market, bytes32 indexed hash, address manager);

    /**
     *  @dev Constructor.
     *  @param _market Address of the market contract that is going to be used for each new deployment.
     *  @param _arbitrator Address of the arbitrator that is going to resolve Realitio disputes.
     *  @param _realitio Address of the Realitio implementation.
     *  @param _nftDescriptor Address of the nft contract that is going to be used for each new deployment.
     *  @param _manager Address of the manager contract that is going to be used for each new deployment.
     *  @param _governor Address of the governor of this contract.
     *  @param _protocolFee protocol fee in basis points.
     *  @param _protocolTraesury address in which protocol fees will be received.
     *  @param _submissionTimeout Time players have to submit their rankings after the questions were answer in Realitio.
     */
    constructor(
        address _market,
        address _arbitrator,
        address _realitio,
        address _nftDescriptor,
        address _manager,
        address _governor,
        address _protocolTraesury,
        uint256 _protocolFee,
        uint256 _submissionTimeout
    ) {
        market = _market;
        arbitrator = _arbitrator;
        realitio = _realitio;
        nftDescriptor = _nftDescriptor;
        manager = _manager;
        governor = _governor;
        protocolTraesury = _protocolTraesury;
        protocolFee = _protocolFee;
        submissionTimeout = _submissionTimeout;
    }

    function changeGovernor(address _governor) external {
        require(msg.sender == governor, "Not authorized");
        governor = _governor;
    }

    function changeProtocolTreasury(address _protocolTraesury) external {
        require(msg.sender == governor, "Not authorized");
        protocolTraesury = _protocolTraesury;
    }

    function changeProtocolFee(uint256 _protocolFee) external {
        require(msg.sender == governor, "Not authorized");
        protocolFee = _protocolFee;
    }

    function changeMarket(address _market) external {
        require(msg.sender == governor, "Not authorized");
        market = _market;
    }

    function changeManager(address _manager) external {
        require(msg.sender == governor, "Not authorized");
        manager = _manager;
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
    ) external returns(address) {
        Market instance = Market(market.clone());

        bytes32[] memory questionIDs = new bytes32[](questionsData.length);
        {
            // Extra scope prevents Stack Too Deep error.
            bytes32 previousQuestionID = bytes32(0);
            for (uint256 i = 0; i < questionsData.length; i++) {
                require(questionsData[i].openingTS > closingTime, "Cannot open question in the betting period");
                bytes32 questionID = askRealitio(
                    questionsData[i],
                    minBond
                );
                require(questionID >= previousQuestionID, "Questions are in incorrect order");
                previousQuestionID = questionID;
                questionIDs[i] = questionID;
            }
        }

        address payable newManager = payable(address(manager.clone()));
        Manager(newManager).initialize(
            payable(creator),
            creatorFee,
            payable(protocolTraesury),
            protocolFee,
            address(instance)
        );

        Market.MarketInfo memory marketInfo;
        marketInfo.marketName = marketName;
        marketInfo.marketSymbol = marketSymbol;
        marketInfo.fee = uint16(protocolFee + creatorFee);
        marketInfo.royaltyFee = uint16(protocolFee);
        marketInfo.manager = newManager;
        instance.initialize(
            marketInfo, 
            nftDescriptor,
            realitio,
            closingTime,
            price,
            submissionTimeout,
            questionIDs, 
            prizeWeights
        );

        emit NewMarket(address(instance), keccak256(abi.encodePacked(questionIDs)), newManager);
        markets.push(instance);

        return address(instance);
    }

    function askRealitio(
        RealitioQuestion memory questionData,
        uint256 minBond
    ) internal returns(bytes32 questionID) {
        bytes32 content_hash = keccak256(abi.encodePacked(
                questionData.templateID, 
                questionData.openingTS, 
                questionData.question
        ));
        bytes32 question_id = keccak256(abi.encodePacked(
            content_hash,
            arbitrator,
            QUESTION_TIMEOUT,
            minBond,
            address(realitio),
            address(this),
            uint256(0)
        ));
        if (RealityETH_v3_0(realitio).getTimeout(question_id) != 0) {
            // Question already exists.
            questionID = question_id;
        } else {
            questionID = RealityETH_v3_0(realitio).askQuestionWithMinBond(
                questionData.templateID,
                questionData.question,
                arbitrator,
                QUESTION_TIMEOUT,
                questionData.openingTS,
                0,
                minBond
            );
        }
    }

    function allMarkets()
        external view
        returns (Market[] memory)
    {
        return markets;
    }

    function marketCount() external view returns(uint256) {
        return markets.length;
    }
}