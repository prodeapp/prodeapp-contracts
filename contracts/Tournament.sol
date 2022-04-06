// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";

// If a version for mainnet was needed, gas could be saved by storing merkle hashes instead of
// all the questions and bets.

contract Tournament {
    string public name;
    address public owner;
    RealityETH_v3_0 public realitio; // Realitio v3
    bool public started;
    bool public initialized;
    uint256 public resultSubmissionPeriodStart;
    uint256 public minBet;
    uint256 public closingTime;
    uint256 public submissionTimeout;

    bytes32[] public questionIDs;
    mapping(address => bytes32[][]) public bets;
    mapping(address => uint256[]) public betsAmount;

    constructor(
        string memory _name,
        address _realityETH,
        uint256 _minBet,
        uint256 _closingTime,
        uint256 _submissionTimeout
    ) {
        name = _name;
        owner = msg.sender;
        realitio = RealityETH_v3_0(_realityETH);
        minBet = _minBet;
        closingTime = _closingTime;
        submissionTimeout = _submissionTimeout;
    }

    // Link all Realitio questions.
    // SHould we add a weight for each question/answer?
    function initializeTournament(bytes32[] calldata _questionIDs) external {
        require(msg.sender == owner, "Not authorized");
        require(!initialized, "Already initialized");

        for (uint256 i = 0; i < _questionIDs.length; i++) {
            require(realitio.getTimeout(_questionIDs[i]) > 0, "Question not created");
        }

        questionIDs = _questionIDs;

        initialized = true;
    }

    function placeBet(bytes32[] calldata _results) external payable {
        require(initialized, "Not initialized");
        require(_results.length == questionIDs.length, "Results mismatch");
        require(msg.value >= minBet, "Not enough funds");
        require(block.timestamp < closingTime, "Bets not allowed");

        bets[msg.sender].push(_results);
        betsAmount[msg.sender].push(msg.value);
    }

    function registerAvailabilityOfResults() external {
        require(block.timestamp > closingTime, "Bets not allowed");

        for (uint256 i = 0; i < questionIDs.length; i++) {
            bytes32 questionId = questionIDs[i];
            realitio.resultForOnceSettled(questionId); // Reverts if not finalized.
        }

        resultSubmissionPeriodStart = block.timestamp;
    }

    function reopenQuestion(
        uint256 questionIndex,
        uint256 template_id, 
        string memory question, 
        address arbitrator, 
        uint32 timeout, 
        uint32 opening_ts, 
        uint256 nonce,
        uint256 min_bond,
        address author
    ) external {
        //require parameters to calculate/check the previous questionId etc
        bytes32 content_hash = keccak256(abi.encodePacked(template_id, opening_ts, question));
        bytes32 question_id = keccak256(abi.encodePacked(content_hash, arbitrator, timeout, min_bond, address(realitio), author, nonce));

        require(question_id == questionIDs[questionIndex], "Incorrect question data");
        require(realitio.isSettledTooSoon(question_id), "Cannot reopen question");

        bytes32 reopenedQuestionID = realitio.reopenQuestion(
            template_id, 
            question, 
            arbitrator, 
            timeout, 
            opening_ts, 
            nonce + 1, 
            min_bond,
            question_id
        );
    }

    function registerPoints(address _account, uint256 _betNumber) external {
        require(resultSubmissionPeriodStart != 0, "Not in submission period");
        require(block.timestamp < resultSubmissionPeriodStart + submissionTimeout, "Submission period over");
        uint256 totalPoints;
        for (uint256 i = 0; i < questionIDs.length; i++) {
            bytes32 questionId = questionIDs[i];
            bytes32 result = realitio.resultForOnceSettled(questionId); // Reverts if not finalized.
            if (result == bets[_account][_betNumber][i]) {
                totalPoints += 1;
            }
        }

        // Check if winner

        // Register winner
    }

    function claimRewards(address _account, uint256 _betNumber) external {
        require(resultSubmissionPeriodStart != 0, "Not in claim period");
        require(block.timestamp > resultSubmissionPeriodStart + submissionTimeout, "Submission period not over");

    }

}
