// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./Tournament.sol";

contract TournamentFactory {
    using Clones for address;

    struct RealitioSetup {
        address arbitrator;
        uint32 timeout;
        uint256 minBond;
    }

    struct RealitioQuestion {
        uint256 templateID;
        string question;
        uint32 openingTS;
    }

    Tournament[] public tournaments;
    address public immutable tournament;
    address public immutable arbitrator;
    address public immutable realitio;
    uint256 public immutable submissionTimeout;

    event NewTournament(address indexed tournament);
    /**
     *  @dev Constructor.
     *  @param _tournament Address of the tournament contract that is going to be used for each new deployment.
     *  @param _arbitrator Address of the arbitrator that is going to resolve Realitio disputes.
     *  @param _realitio Address of the Realitio implementation.
     *  @param _submissionTimeout Time players have to submit their rankings after the questions were answer in Realitio.
     */
    constructor(
        address _tournament,
        address _arbitrator,
        address _realitio,
        uint256 _submissionTimeout
    ) {
        tournament = _tournament;
        arbitrator = _arbitrator;
        realitio = _realitio;
        submissionTimeout = _submissionTimeout;
    }

    function createTournament(
        Tournament.TournamentInfo memory tournamentInfo,
        uint256 closingTime,
        uint256 price,
        uint256 managementFee,
        address manager,
        uint32 timeout,
        uint256 minBond,
        RealitioQuestion[] memory questionsData,
        uint16[] memory prizeWeights
    ) external returns(address) {
        Tournament instance = Tournament(tournament.clone());
        emit NewTournament(address(instance));
        tournaments.push(instance);

        bytes32[] memory questionIDs = new bytes32[](questionsData.length);
        {
            // Extra scope prevents Stack Too Deep error.
            bytes32 previousQuestionID = bytes32(0);
            for (uint256 i = 0; i < questionsData.length; i++) {
                require(questionsData[i].openingTS > closingTime, "Cannot open question in the betting period");
                bytes32 questionID = askRealitio(
                    questionsData[i],
                    timeout,
                    minBond
                );
                require(questionID >= previousQuestionID, "Questions are in incorrect order");
                previousQuestionID = questionID;
                questionIDs[i] = questionID;
            }
        }

        instance.initialize(
            tournamentInfo, 
            realitio,
            closingTime,
            price,
            submissionTimeout,
            managementFee,
            manager,
            questionIDs, 
            prizeWeights
        );
        return address(instance);
    }

    function askRealitio(
        RealitioQuestion memory questionData,
        uint32 timeout,
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
            timeout,
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
                timeout,
                questionData.openingTS,
                0,
                minBond
            );
        }
    }

    function allTournaments()
        external view
        returns (Tournament[] memory)
    {
        return tournaments;
    }

    function tournamentCount() external view returns(uint256) {
        return tournaments.length;
    }
}