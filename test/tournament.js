const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { solidity } = require('ethereum-waffle');
use(solidity);

function numberToBytes32(_number) {
  return ethers.utils.hexZeroPad(ethers.BigNumber.from(_number).toHexString(), 32);
}

async function getCurrentTimestamp(blockNum) {
  blockNum = blockNum || await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp;
}

function getEmittedEvent(eventName, receipt) {
  return receipt.events.find(({ event }) => event === eventName)
}

describe("Tournament", () => {
  let governor;
  let creator;
  let other;
  let user1;
  let player1;
  let player2;
  let player3;

  let arbitrator;
  let realitio;
  let factory;
  let Tournament;
  let tournament;
  
  const tournamentData = {
    info: {
      tournamentName: "FIFA World Cup 2022", 
      tournamentSymbol: "FWC22", 
      tournamentUri: "URI"
    },
    closingTime: 0,
    price: 100,
    managementFee: 1000,
    manager: "",
    timeout: 10,
    minBond: 10,
    questions: [
      {
        templateID: 2, 
        question: "Who won the match between Manchester City and Real Madrid at Champions League?␟\"Manchester City\",\"Real Madrid\"␟sports␟en_US", 
        openingTS: 0
      },
      {
        templateID: 2, 
        question: "Who won the last match between Boca and River?␟\"Boca\",\"River\"␟sports␟en_US", 
        openingTS: 0
      }
    ],
    prizeWeights: [6000, 3000, 1000]
  };

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  before("Get accounts", async () => {
    const accounts = await ethers.getSigners();
    governor = accounts[0];
    creator = accounts[1];
    other = accounts[2];
    user1 = accounts[3];
    player1 = accounts[4];
    player2 = accounts[5];
    player3 = accounts[6];
    player4 = accounts[7];

    // Deploy arbitrator
    const Arbitrator = await ethers.getContractFactory("Arbitrator");
    arbitrator = await Arbitrator.deploy();
    // console.log("Arbitrator Address: ", arbitrator.address)

    // Deploy Realitio
    const RealityEth = await ethers.getContractFactory("RealitioMock");
    realitio = await RealityEth.deploy();
    // console.log("Realitio Address: ", realitio.address)

    // Deploy a Tournament contract and Factory
    Tournament = await ethers.getContractFactory("Tournament");
    implementation = await Tournament.deploy();
    const Factory = await ethers.getContractFactory("TournamentFactory");
    factory = await Factory.deploy(
      implementation.address,
      arbitrator.address,
      realitio.address,
      7*24*60*60
    );
  });

  describe("Betting Period", () => {
    it("Should only accept valid bets.", async () => {
      const currentTS = await getCurrentTimestamp() + 10000;
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);
      
      let predictions;

      predictions = [numberToBytes32(1), numberToBytes32(40)];
      await tournament.placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      await tournament.placeBet(ZERO_ADDRESS, predictions, { value: 200 });
      await expect(
        tournament.placeBet(ZERO_ADDRESS, predictions, { value: 99 })
      ).to.be.revertedWith("Not enough funds");

      predictions = [numberToBytes32(1), numberToBytes32(40), numberToBytes32(50)];
      await expect(
        tournament.placeBet(ZERO_ADDRESS, predictions, { value: 100 })
      ).to.be.revertedWith("Results mismatch");

      predictions = [numberToBytes32(1)];
      await expect(
        tournament.placeBet(ZERO_ADDRESS, predictions, { value: 100 })
      ).to.be.revertedWith("Results mismatch");
    });

    it("Should not accept bets after closingTime has passed.", async () => {
      const currentTS = await getCurrentTimestamp();
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);

      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      await expect(
        tournament.placeBet(ZERO_ADDRESS, predictions, { value: 100 })
      ).to.be.revertedWith("Bets not allowed");
    });

    it("Should emit PlaceBet event.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      const tx = await tournament.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      const receipt = await tx.wait();
      const [player, tokenID, tokenHash, _predictions] = getEmittedEvent('PlaceBet', receipt).args
      expect(player).to.eq(other.address);
      expect(tokenID).to.eq((await tournament.nextTokenID()).sub(BigNumber.from(1)));
      expect(tokenHash).to.eq(ethers.utils.keccak256(ethers.utils.hexConcat(predictions)));
      expect(_predictions).to.deep.equal(predictions);
    });

    it("Should create and transfer ERC721 Bet item correctly.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      await tournament.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });

      const tokenID = (await tournament.nextTokenID()).sub(BigNumber.from(1));
      expect(await tournament.ownerOf(tokenID)).to.eq(other.address);

      await tournament.connect(other).transferFrom(other.address, user1.address, tokenID);
      expect(await tournament.ownerOf(tokenID)).to.eq(user1.address);
      expect(await tournament.balanceOf(user1.address)).to.eq(BigNumber.from(1));
    });

    it("Should send fees to providers if specified in the call.", async () => {
      const currentTS = await getCurrentTimestamp() + 10000;
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      tx = await tournament.placeBet(other.address, predictions, { value: 100 });
      receipt = await tx.wait();
      [_provider, _reward] = getEmittedEvent('ProviderReward', receipt).args;
      expect(_provider).to.eq(other.address);
      expectedReward = BigNumber.from(100).mul(tournamentData.managementFee).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));
      
      tx = await tournament.placeBet(creator.address, predictions, { value: 200 });
      receipt = await tx.wait();
      [_provider, _reward] = getEmittedEvent('ProviderReward', receipt).args;
      expect(_provider).to.eq(creator.address);
      expectedReward = BigNumber.from(200).mul(tournamentData.managementFee).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await tournament.placeBet(ZERO_ADDRESS, predictions, { value: 200 });
      receipt = await tx.wait();
      console.log(getEmittedEvent('ProviderReward', receipt));
    });

    it("Other functions should not be callable during the betting period, except for funding.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);

      await expect(
        tournament.registerAvailabilityOfResults()
      ).to.be.revertedWith("Bets ongoing");
      await expect(
        tournament.registerPoints(0, 0)
      ).to.be.revertedWith("Not in submission period");
      await expect(
        tournament.claimRewards(0)
      ).to.be.revertedWith("Not in claim period");
      await expect(
        tournament.reimbursePlayer(0)
      ).to.be.revertedWith("Not in claim period");
      await expect(
        tournament.distributeRemainingPrizes()
      ).to.be.revertedWith("Not in claim period");
      
      const tx = await tournament.connect(user1).fundPool("Brrrrr", { value: 1000});
      const receipt = await tx.wait();
      const [funder, value, message] = getEmittedEvent('FundingReceived', receipt).args
      expect(funder).to.eq(user1.address);
      expect(value).to.eq(1000);
      expect(message).to.eq("Brrrrr");
      expect(await ethers.provider.getBalance(tournament.address)).to.eq(BigNumber.from(1000));
    });
  });

  describe("Register Points Period", () => {
    it("Should not register points if questions were not settled.", async () => {
      const currentTS = await getCurrentTimestamp();
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);

      await expect(
        tournament.registerAvailabilityOfResults()
      ).to.be.revertedWith("question must be finalized");

      // Should still allow sponsors after bettings closed, only if questions were not settled.
      await tournament.connect(user1).fundPool("Brrrrr", { value: 1000});
    });

    it("Should enter the submission period once questions are settled.", async () => {
      const currentTS = await getCurrentTimestamp();
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        1,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);

      //predictions = [numberToBytes32(1), numberToBytes32(40)];
      const questionID1 = await tournament.questionIDs(0);
      const questionID2 = await tournament.questionIDs(1);
      await realitio.submitAnswer(questionID1, numberToBytes32(1), 0, { value: 10 });
      await realitio.submitAnswer(questionID2, numberToBytes32(40), 0, { value: 10 });
      const tx = await tournament.registerAvailabilityOfResults();
      const receipt = await tx.wait();
      const timestamp = BigNumber.from(await getCurrentTimestamp(receipt.blockNumber));
      expect(await tournament.resultSubmissionPeriodStart()).to.eq(timestamp);
      expect(await tournament.totalPrize()).to.eq(BigNumber.from(0));
      // Should not allow sponsors.
      await expect(
        tournament.connect(user1).fundPool("Brrrrr", { value: 1000})
      ).to.be.revertedWith("Results already available");
    });

    it("Should allow only valid rankings.", async () => {
      const bettingTime = 200;
      const closingTime = await getCurrentTimestamp() + bettingTime;
      const questions = [
        {
          templateID: 2, 
          question: "Who won the match between Manchester City and Real Madrid at Champions League?␟\"Manchester City\",\"Real Madrid\"␟sports␟en_US", 
          openingTS: closingTime + 1
        },
        {
          templateID: 2, 
          question: "Who won the last match between Boca and River?␟\"Boca\",\"River\"␟sports␟en_US", 
          openingTS: closingTime + 1
        },
        {
          templateID: 2, 
          question: "Who won the last match between Barcelona and Madrid?␟\"Barcelona\",\"Madrid\"␟sports␟en_US", 
          openingTS: closingTime + 1
        }
      ]
      await factory.createTournament(
        tournamentData.info,
        closingTime,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        1,
        tournamentData.minBond,
        questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);
  
      const players = [
        player1,
        player2,
        player3,
        player3,
        player4,
        player4,
        player4,
      ];
      const bets = [
        [numberToBytes32(1), numberToBytes32(1), numberToBytes32(1)], // 2 points
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)], // 3 points
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(2)], // 2 points
        [numberToBytes32(2), numberToBytes32(2), numberToBytes32(2)], // 1 points
        [numberToBytes32(0), numberToBytes32(0), numberToBytes32(0)], // 0 points
        [numberToBytes32(1), numberToBytes32(5), numberToBytes32(1)], // 2 points 
        [numberToBytes32(2), numberToBytes32(1), numberToBytes32(2)]  // 0 points
      ];
      const results = [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)];
  
      for (let i = 0; i < bets.length; i++) {
        await tournament.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');
  
      for (let i = 0; i < results.length; i++) {
        const questionID = await tournament.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      const poolBalance = await ethers.provider.getBalance(tournament.address);
      let tx = await tournament.registerAvailabilityOfResults();
      let receipt = await tx.wait();
      const [_manager, _managementReward] = getEmittedEvent('ManagementReward', receipt).args
      expect(_manager).to.eq(creator.address);
      const managementReward = poolBalance.mul(BigNumber.from(tournamentData.managementFee)).div(BigNumber.from(10000));
      expect(_managementReward).to.eq(managementReward);
      expect(await tournament.totalPrize()).to.eq(poolBalance.sub(managementReward));
  
      // Estimate ranking
      const ranking = []
      for (let i = 0; i < bets.length; i++) {
        const predictions_i = bets[i];
        const points = predictions_i.filter((prediction, idx) => prediction == results[idx]).length;
        ranking.push(points);
      }
  
      // Register ranking
      await expect(tournament.registerPoints(100, 0)).to.be.revertedWith("Token does not exist");
  
      // Cannot register a token with 0 points
      await expect(tournament.registerPoints(4, 0)).to.be.revertedWith("You are not a winner");
      await expect(tournament.registerPoints(4, 2)).to.be.revertedWith("You are not a winner");
      await expect(tournament.registerPoints(2, 2)).to.be.revertedWith("Invalid ranking index");
  
      tx = await tournament.registerPoints(2, 0);
      receipt = await tx.wait();
      let [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(2));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[2]));
      expect(_index).to.eq(BigNumber.from(0));
  
      await expect(tournament.registerPoints(4, 0)).to.be.revertedWith("You are not a winner");
      await expect(tournament.registerPoints(4, 1)).to.be.revertedWith("You are not a winner");
      await expect(tournament.registerPoints(4, 2)).to.be.revertedWith("You are not a winner");
  
      // Cannot register a token at a position with fewer points than the current token
      tx = await tournament.registerPoints(3, 0);
      receipt = await tx.wait();
      expect(receipt.events.length).to.eq(0); // No events = ranking was not modified
      // A token can only be registered at its current best possible position, not worse.
      await expect(tournament.registerPoints(3, 2)).to.be.revertedWith("Invalid ranking index");
      tx = await tournament.registerPoints(3, 1);
      receipt = await tx.wait();
      [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(3));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[3]));
      expect(_index).to.eq(BigNumber.from(1));
  
      // If there is a tie between 2 tokens, the second one should be registered pointing to the first token
      tx = await tournament.registerPoints(0, 0);
      receipt = await tx.wait();
      [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(0));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[0]));
      expect(_index).to.eq(BigNumber.from(1));
  
      await expect(tournament.registerPoints(2, 1)).to.be.revertedWith("Invalid ranking index");
      await expect(tournament.registerPoints(2, 0)).to.be.revertedWith("Token already registered");
      await expect(tournament.registerPoints(0, 1)).to.be.revertedWith("Invalid ranking index");
      await expect(tournament.registerPoints(0, 0)).to.be.revertedWith("Token already registered");
  
      // If overwritten, a token can get registered again
      tx = await tournament.registerPoints(3, 2);
      receipt = await tx.wait();
      [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(3));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[3]));
      expect(_index).to.eq(BigNumber.from(2));
    });
  });

  describe("Claims and reimbursements", () => {
    let players;
    let ranking;
    beforeEach("Setup bets", async function () {
      const bettingTime = 200;
      const closingTime = await getCurrentTimestamp() + bettingTime;
      const questions = [
        {
          templateID: 2, 
          question: "Who won the match between Manchester City and Real Madrid at Champions League?␟\"Manchester City\",\"Real Madrid\"␟sports␟en_US", 
          openingTS: closingTime + 1
        },
        {
          templateID: 2, 
          question: "Who won the last match between Boca and River?␟\"Boca\",\"River\"␟sports␟en_US", 
          openingTS: closingTime + 1
        },
        {
          templateID: 2, 
          question: "Who won the last match between Barcelona and Madrid?␟\"Barcelona\",\"Madrid\"␟sports␟en_US", 
          openingTS: closingTime + 1
        }
      ]
      await factory.createTournament(
        tournamentData.info,
        closingTime,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        1,
        tournamentData.minBond,
        questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);

      players = [
        player1,
        player2,
        player3,
        player3,
        player4,
        player4,
        player4,
      ];
      const bets = [
        [numberToBytes32(1), numberToBytes32(1), numberToBytes32(1)], // 2 points
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)], // 3 points
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(2)], // 2 points
        [numberToBytes32(2), numberToBytes32(2), numberToBytes32(2)], // 1 points
        [numberToBytes32(0), numberToBytes32(0), numberToBytes32(0)], // 0 points
        [numberToBytes32(1), numberToBytes32(5), numberToBytes32(1)], // 2 points 
        [numberToBytes32(2), numberToBytes32(1), numberToBytes32(2)]  // 0 points
      ];
      const results = [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)];

      for (let i = 0; i < bets.length; i++) {
        await tournament.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');

      for (let i = 0; i < results.length; i++) {
        const questionID = await tournament.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      await tournament.registerAvailabilityOfResults();

      // Estimate ranking
      ranking = []
      for (let i = 0; i < bets.length; i++) {
        const predictions_i = bets[i];
        const points = predictions_i.filter((prediction, idx) => prediction == results[idx]).length;
        ranking.push(points);
      }
    });

    it("Should register all non zero bets when submitted in the right order.", async () => {
      let tx;
      let receipt;
      // Register all points in the correct order
      const sortedRanking = Array.from(Array(ranking.length).keys()).sort((a, b) => ranking[a] < ranking[b] ? -1 : (ranking[b] < ranking[a]) | 0);
      let currentDuplicateIndex = 0;
      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) break;
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          currentDuplicateIndex = i;
        }
        tx = await tournament.registerPoints(bet_i, currentDuplicateIndex);
        receipt = await tx.wait();
        [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
        expect(_tokenID).to.eq(BigNumber.from(bet_i));
        expect(_totalPoints).to.eq(BigNumber.from(ranking[bet_i]));
        expect(_index).to.eq(BigNumber.from(i));
      }
    });

    it("Should claim all prizes only once.", async () => {
      // Register all points in the correct order
      const sortedRanking = Array.from(Array(ranking.length).keys()).sort((a, b) => ranking[a] < ranking[b] ? -1 : (ranking[b] < ranking[a]) | 0);
      let currentDuplicateIndex = 0;
      let prizeShare = [];
      let realPrizeWeights = [];
      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(tournamentData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          break;
        }
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(tournamentData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          currentDuplicateIndex = i;
        }
        await tournament.registerPoints(bet_i, currentDuplicateIndex);
      }

      await expect(tournament.claimRewards(0)).to.be.revertedWith("Submission period not over");
      await expect(tournament.reimbursePlayer(0)).to.be.revertedWith("Submission period not over");
      await expect(tournament.distributeRemainingPrizes()).to.be.revertedWith("Submission period not over");

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(tournament.reimbursePlayer(0)).to.be.revertedWith("Can't reimburse if there are winners");
      await expect(tournament.distributeRemainingPrizes()).to.be.revertedWith("No vacant prizes");

      const totalPrize = await tournament.totalPrize();
      let rankIndex = 0;
      let bet_i
      for (let i = 0; i < realPrizeWeights.length; i++) {
        bet_i = sortedRanking[sortedRanking.length - rankIndex - 1];
        if (ranking[bet_i] == 0) break;

        for (let j = 0; j < prizeShare[i]; j++) {
          tx = await tournament.claimRewards(rankIndex);
          receipt = await tx.wait();
          [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
          bet_i = sortedRanking[sortedRanking.length - rankIndex - 1];
          expect(_tokenID).to.eq(BigNumber.from(bet_i));
          const expectedReward = totalPrize.mul(realPrizeWeights[i]).div(10000 * prizeShare[i]);
          expect(_reward).to.eq(BigNumber.from(expectedReward));
          rankIndex += 1;
        }
      }

      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) break;
        await expect(tournament.claimRewards(i)).to.be.revertedWith("Already claimed");
      }

    });

    it("Should reimburse players if nobody won/was registered.", async () => {
      // Go straight to the rewards period
      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(tournament.distributeRemainingPrizes()).to.be.revertedWith("No winners");
      const totalPrize = await tournament.totalPrize();
      const totalTokens = players.length;
      const individualReimbursement = totalPrize.div(BigNumber.from(totalTokens));
      let poolBalance = await ethers.provider.getBalance(tournament.address);
      for (let i = 0; i < players.length; i++) {
        await tournament.reimbursePlayer(i);
        await expect(tournament.ownerOf(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
        poolBalance = poolBalance.sub(individualReimbursement);
        expect(await ethers.provider.getBalance(tournament.address)).to.eq(poolBalance);
      }

      for (let i = 0; i < players.length + 2; i++) {
        await expect(tournament.reimbursePlayer(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
      }
    });

    it("Should distribute vacant prices.", async () => {
      // Register only one player's results
      const tokenID = 0;
      await tournament.registerPoints(tokenID, 0);

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(tournament.reimbursePlayer(tokenID)).to.be.revertedWith("Can't reimburse if there are winners");

      tx = await tournament.claimRewards(0);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(tokenID));
      const totalPrize = await tournament.totalPrize();
      expectedReward = totalPrize.mul(tournamentData.prizeWeights[0]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await tournament.distributeRemainingPrizes();
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(tokenID));
      const cumWeights = tournamentData.prizeWeights[1] + tournamentData.prizeWeights[2];
      expectedReward = totalPrize.mul(cumWeights).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));
      
      await expect(tournament.distributeRemainingPrizes()).to.be.revertedWith("Already claimed");
    });

    it("Should distribute vacant prices 2.", async () => {
      // Register only two player's results
      await tournament.registerPoints(1, 0);
      await tournament.registerPoints(2, 1);

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(tournament.reimbursePlayer(1)).to.be.revertedWith("Can't reimburse if there are winners");
      await expect(tournament.reimbursePlayer(2)).to.be.revertedWith("Can't reimburse if there are winners");

      tx = await tournament.claimRewards(0);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(1));
      const totalPrize = await tournament.totalPrize();
      expectedReward = totalPrize.mul(tournamentData.prizeWeights[0]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await tournament.claimRewards(1);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(2));
      expectedReward = totalPrize.mul(tournamentData.prizeWeights[1]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await tournament.distributeRemainingPrizes();
      receipt = await tx.wait();
      expectedReward = totalPrize.mul(tournamentData.prizeWeights[2]).div(10000 * 2);
      for (let i = 0; i < receipt.events.length; i++) {
        [_tokenID, _reward] = receipt.events[i].args;
        expect(_tokenID).to.eq(BigNumber.from(i + 1));
        expect(_reward).to.eq(BigNumber.from(expectedReward));
      }
    });
  });

  describe("Royalties - ERC2981 & IERC165", () => {
    it("Should return the correct royalty info.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < tournamentData.questions.length; i++) {
        tournamentData.questions[i].openingTS = currentTS + 1;
      }
      await factory.createTournament(
        tournamentData.info,
        currentTS,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const totalTournaments = await factory.tournamentCount();
      const tournamentAddress = await factory.tournaments(totalTournaments.sub(BigNumber.from(1)));
      tournament = await Tournament.attach(tournamentAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      await tournament.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });

      const salePrices = [
        ethers.utils.parseUnits("1.0", "wei"),
        ethers.utils.parseUnits("100.0", "gwei"),
        ethers.utils.parseEther("1.0"),
        ethers.utils.parseEther("1000.0"),
        ethers.utils.parseEther("100000000.0")
      ];
      for (let i = 0; i < salePrices.length; i++) {
        const [receiver, amount] = await tournament.royaltyInfo(i, salePrices[i]);
        const expectedRoyalty = salePrices[i].mul(tournamentData.managementFee).div(10000);
        expect(receiver).to.eq(creator.address);
        expect(amount).to.eq(expectedRoyalty);
      }
    });

    it("Should support interfaces ERC165, ERC721, ERC721Metadata and ERC2981.", async () => {
      expect(await tournament.supportsInterface("0x01ffc9a7")).to.be.true; // IERC165
      expect(await tournament.supportsInterface("0x80ac58cd")).to.be.true; // IERC721
      expect(await tournament.supportsInterface("0x5b5e139f")).to.be.true; // IERC721Metadata
      expect(await tournament.supportsInterface("0x2a55205a")).to.be.true; // IERC2981
      expect(await tournament.supportsInterface("0xffffffff")).to.be.false;
      expect(await tournament.supportsInterface("0x00000000")).to.be.false;
      expect(await tournament.supportsInterface("0x12345678")).to.be.false;
    });
  });
});