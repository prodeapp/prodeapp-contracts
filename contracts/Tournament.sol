// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";

// If a version for mainnet was needed, gas could be saved by storing merkle hashes instead of
// all the questions and bets.

contract Tournament {

    struct Result {
        address account;
        uint88 points;
        bool claimed;
    }

    uint256 public constant DIVISOR = 10000;

    address public owner;
    address public manager;
    RealityETH_v3_0 public realitio; // Realitio v3
    string public name;
    bool public initialized;
    bool public tournamentInitialized;
    uint256 public resultSubmissionPeriodStart;
    uint256 public price;
    uint256 public closingTime;
    uint256 public submissionTimeout;
    uint256 public managementFee;
    uint256 private totalPrize;

    bytes32[] public questionIDs;
    uint16[] public prizeWeights;
    mapping(address => bytes32[][]) public bets; // bets[account][betNumber]
    mapping(uint256 => Result) public ranking; // ranking[index]

    function initialize(
        string memory _name,
        address _owner,
        address _realityETH,
        uint256 _price,
        uint256 _closingTime,
        uint256 _submissionTimeout,
        uint256 _managementFee,
        address _manager
    ) external {
        require(!initialized, "Already initialized.");

        name = _name;
        owner = _owner;
        realitio = RealityETH_v3_0(_realityETH);
        price = _price;
        closingTime = _closingTime;
        submissionTimeout = _submissionTimeout;
        managementFee = _managementFee;
        manager = _manager;

        initialized = true;
    }

    // Link all Realitio questions.
    // Should we add a weight for each question/answer?
    function setTournament(bytes32[] calldata _questionIDs, uint16[] calldata _prizeWeights) external {
        require(msg.sender == owner, "Not authorized");
        require(!tournamentInitialized, "Already initialized");

        for (uint256 i = 0; i < _questionIDs.length; i++) {
            require(realitio.getTimeout(_questionIDs[i]) > 0, "Question not created");
        }
        questionIDs = _questionIDs;

        uint256 sumWeights;
        for (uint256 i = 0; i < _prizeWeights.length; i++) {
            sumWeights += uint256(_prizeWeights[i]);
        }
        require(sumWeights == DIVISOR, "Invalid weights");
        prizeWeights = _prizeWeights;

        tournamentInitialized = true;
    }

    function placeBet(bytes32[] calldata _results) external payable returns(uint256 betIndex) {
        require(tournamentInitialized, "Not initialized");
        require(_results.length == questionIDs.length, "Results mismatch");
        require(msg.value >= price, "Not enough funds");
        require(block.timestamp < closingTime, "Bets not allowed");

        bets[msg.sender].push(_results);
        return bets[msg.sender].length - 1;
    }

    function registerAvailabilityOfResults() external {
        require(block.timestamp > closingTime, "Bets not allowed");

        for (uint256 i = 0; i < questionIDs.length; i++) {
            bytes32 questionId = questionIDs[i];
            realitio.resultForOnceSettled(questionId); // Reverts if not finalized.
        }

        resultSubmissionPeriodStart = block.timestamp;
        uint256 poolBalance = address(this).balance;
        uint256 managementReward = poolBalance * managementFee / DIVISOR;
        payable(manager).send(managementReward);
        totalPrize = poolBalance - managementReward;
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

    function registerPoints(address _account, uint256 _betIndex, uint256 _rankIndex) external {
        require(resultSubmissionPeriodStart != 0, "Not in submission period");
        require(block.timestamp < resultSubmissionPeriodStart + submissionTimeout, "Submission period over");

        uint256 totalPoints;
        for (uint256 i = 0; i < questionIDs.length; i++) {
            bytes32 questionId = questionIDs[i];
            bytes32 result = realitio.resultForOnceSettled(questionId); // Reverts if not finalized.
            if (result == bets[_account][_betIndex][i]) {
                totalPoints += 1;
            }
        }

        if (totalPoints > ranking[_rankIndex].points && (totalPoints < ranking[_rankIndex - 1].points || _rankIndex == 0)) {
            ranking[_rankIndex].points = uint88(totalPoints);
            ranking[_rankIndex].account = _account;
        } else if (ranking[_rankIndex].points == totalPoints) {
            uint256 i = 1;
            while (ranking[_rankIndex + i].points == totalPoints) {
                i += 1;
            }
            ranking[_rankIndex + i].points = uint88(totalPoints);
            ranking[_rankIndex + i].account = _account;
        }
    }

    function claimRewards(uint256 _rankIndex) external {
        require(resultSubmissionPeriodStart != 0, "Not in claim period");
        require(block.timestamp > resultSubmissionPeriodStart + submissionTimeout, "Submission period not over");
        require(!ranking[_rankIndex].claimed, "Already claimed");

        uint88 points = ranking[_rankIndex].points;
        uint256 numberOfPrizes = prizeWeights.length;
        bool rankingFound = false;
        uint256 rankingPosition = 0;

        uint256 cumWeigths = 0;
        uint256 shareBetween = 0;

        while (!rankingFound) {
            if (ranking[rankingPosition].points > points) {
                rankingPosition += 1;
            } else if (ranking[rankingPosition].points == points) {

                if (rankingPosition < numberOfPrizes) {
                    cumWeigths += prizeWeights[rankingPosition];
                }
                shareBetween += 1;
                rankingPosition += 1;
            } else {
                rankingFound = true;
            }
        }

        uint256 reward = totalPrize * cumWeigths / (DIVISOR * shareBetween);
        ranking[_rankIndex].claimed = true;
        payable(ranking[_rankIndex].account).send(reward);
    }
}
