# ProdeApp Contracts

This project it's build to create a descentralized betting game using Realitio and Kleros.
The contracts should be able to create a tournament with a number of matches where the user can bet who wins or tie in each match up to one hour previous to the beggining of the match. If the user was right, earns 3 points, if the not, 0. With all the matches results a users ranking has to be created and the rewards are distributed according to the ranking.
The results of each match are known by the Smart Contracts beacuse when a match it's created, a question it's raised in Realitio, that has to be answered, having Kleros as ultimate dispute resolution mechanism.

So, the SC has to create a tournament (aka, will be a TournamentFactory):
 - A fixed price of participation has to be defined (for this v1)
 - The tournament will create all the matches. If it's a prode of the FIFA World Cup, could be the first 16 matches (the first 2 matches per team).
 - Each match has a home team, away team, minimum end time, result and the link to the question where realitio has to answer the result.
 - The users can bet in each match for the home team, away team or tie. If the user guess the results, earn 3 points.
 - When the last match ends, the user can claim a reward according to their ranking position. Better qualified, more reward, and we can add surprise bounties.

 ## Events
 This SC emit different events so the tournament can be easily tracked with a subgraph.
 - tournamentCreated(metadata)
    When a tournament it's created, a first event it's created with the link to the metadata of the tournament (json in ipfs)
 - matchCreated(homeTeam, awaiTeam, startTime, tournament)
    Event with the home and away teams, startTime and the tournament which belongs (address of the SC)
 - newBet(teamOrTie, tournament, user)
    When an user perform a Bet, emit an event with the information of the winner team or tie, and who is doing the bet.
 - matchResult(teamOrTie, tournament)
    When the result of a match it's received, emit an event with the result
 - rewardDistribution(amount, user)
    Track the rewards sent to the users.