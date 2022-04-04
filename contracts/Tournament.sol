// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@reality.eth/contracts/development/contracts/IRealitio.sol";

contract Tournament {
    string public name;
    address public _owner;
    address public arbitrator;
    IRealitio public realitio;
    bool public started;
    uint256 public gamesCount = 0;

    struct Game {
        string home; // home team name identifier
        string away; // away team name identifier
        uint32 minEnd; // min date to ask for a result
        uint256 result; // 0 = Tie; 1=Home; 2=Away; 0xff..ff=invalid;
        bytes32 questionID; // realitio question identifier
    }

    // Game[] private games; // array containing all the matches in the tournament
    mapping(uint256 => Game) public games;

    constructor(
        string memory _name,
        address _arbitrator,
        address _realityETH
    ) {
        name = _name;
        _owner = msg.sender;
        arbitrator = _arbitrator;
        started = false;
        realitio = IRealitio(_realityETH);
    }

    function startTournament() public {
        require(gamesCount >= 1, "At least one match it's needed to start");
        started = true;
    }

    // Internal function to update the result of a match. Must be called from the
    // function that reads the realitio answer.
    function _updateGamehResult(uint256 _gameID, bytes32 _result) internal {
        Game storage game = games[_gameID];
        game.result = uint256(_result);
    }

    // Ask question to realitio. This must be called when initializing a match
    function _askQuestion(
        string memory home,
        string memory away,
        uint32 _minEnd
    ) internal returns (bytes32) {
        bytes32 delim = "\u241f";
        string memory question = string(
                abi.encodePacked(
                    "Who has won (without considering penalties definition) the match between ",
                    home,
                    " (HOME) and ",
                    away,
                    " (AWAY) in the tournament ",
                    name,
                    "?",
                    delim,
                    "Tie",
                    delim,
                    "Home",
                    delim,
                    "Away",
                    delim,
                    "Sports",
                    delim,
                    "en"
                )
            );
        bytes32 questionID = realitio.askQuestion(
            2,
            question,
            arbitrator,
            1 days,
            _minEnd,
            0
        );
        return questionID;
    }

    function createGame(
        string memory _home,
        string memory _away,
        uint32 _minEnd
    ) external returns (uint256) {
        require(started == false, "Couldn't add match in a started tournament");
        uint256 gameID = gamesCount + 1;
        bytes32 questionID = _askQuestion(_home, _away, _minEnd);
        Game memory game = Game({
            home: _home,
            away: _away,
            minEnd: _minEnd,
            result: 2**256 - 1, // initialize with invalid
            questionID: questionID
        });
        games[gameID] = game;
        gamesCount += 1;
        return gameID;
    }
}
