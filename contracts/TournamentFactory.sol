// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Tournament.sol";

contract TournamentFactory {
    Tournament[] private _tournaments;
    // address public arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D";  //mainnet
    address public arbitrator = address(0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04);  //kovan
    // address public arbitrator = "0xe40DD83a262da3f56976038F1554Fe541Fa75ecd" // gnosis
    address public realitio = address(0xcB71745d032E16ec838430731282ff6c10D29Dea);  // kovan
    
    function createTournament(
        string memory name
    ) public {
        Tournament tournament = new Tournament(name, arbitrator, realitio);
        _tournaments.push(tournament);
    }

    function allTournaments()
        external view
        returns (Tournament[] memory)
    {
        return _tournaments;
    }
}