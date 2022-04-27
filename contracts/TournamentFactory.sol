// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Tournament.sol";

contract TournamentFactory {
    using Clones for address;

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
        Tournament.RealitioQuestion[] memory questionsData,
        uint16[] memory prizeWeights
    ) external {
        Tournament instance = Tournament(payable(tournament.clone()));
        emit NewTournament(address(instance));

        Tournament.RealitioSetup memory realitioSetup;
        realitioSetup.arbitrator = arbitrator;
        realitioSetup.timeout = timeout;
        realitioSetup.minBond = minBond;

        instance.initialize(
            tournamentInfo, 
            realitio,
            closingTime,
            price,
            submissionTimeout,
            managementFee,
            manager,
            realitioSetup,
            questionsData, 
            prizeWeights
        );
        tournaments.push(instance);
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