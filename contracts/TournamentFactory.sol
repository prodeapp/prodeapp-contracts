// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Tournament.sol";

contract TournamentFactory {
    using Clones for address;

    Tournament[] private _tournaments;
    address public tournament;

    // address public arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D";  //mainnet
    address public arbitrator = address(0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04);  //kovan
    // address public arbitrator = "0xe40DD83a262da3f56976038F1554Fe541Fa75ecd" // gnosis
    address public realitio = address(0xcB71745d032E16ec838430731282ff6c10D29Dea);  // kovan
    uint256 public submissionTimeout = 7 days;

    /**
     *  @dev Constructor.
     *  @param _tournament Address of the tournament contract that is going to be used for each new deployment.
     */
    constructor(address _tournament) {
        tournament = _tournament;
    }

    function createTournament(
        string memory name,
        address owner,
        uint256 closingTime,
        uint256 price,
        uint256 managementFee,
        address manager
    ) public {
        Tournament instance = Tournament(tournament.clone());
        instance.initialize(
            name, 
            owner,
            realitio,
            price,
            closingTime,
            submissionTimeout,
            managementFee,
            manager
        );
        _tournaments.push(instance);
    }

    function allTournaments()
        external view
        returns (Tournament[] memory)
    {
        return _tournaments;
    }
}