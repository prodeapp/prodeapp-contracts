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
  return receipt.events.find(({ event }) => event === eventName);
}

function getQuestionID(
  _templateID,
  _openingTS,
  _question,
  _arbitrator,
  _timeout,
  _minBond,
  _realitio,
  _factory
) {
  const contentHash = ethers.utils.solidityKeccak256(
    [ "uint256", "uint32", "string" ],
    [ _templateID, _openingTS, _question ]
  );
  const questionID = ethers.utils.solidityKeccak256(
    [ "bytes32", "address", "uint32", "uint256", "address", "address", "uint256" ],
    [ contentHash, _arbitrator, _timeout, _minBond, _realitio, _factory, 0 ]
  );
  return questionID;
}

describe("Market", () => {
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
  let Market;
  let market;
  let Manager;
  
  const timeout = 129600; // 1.5 days
  const protocolFee = 150; // 1.5 %
  const marketData = {
    info: {
      marketName: "FIFA World Cup 2022", 
      marketSymbol: "FWC22"
    },
    closingTime: 0,
    price: 100,
    managementFee: 1000,
    manager: "",
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

    const curateAddress = "0x0000000000000000000000000000000000000000";
    const CurateProxy = await ethers.getContractFactory("CurateProxy");
    const curateProxy = await CurateProxy.deploy(curateAddress);

    // Deploy NFT Descriptor contract
    const BetNFTDescriptor = await ethers.getContractFactory("BetNFTDescriptor");
    const betNFTDescriptor = await upgrades.deployProxy(BetNFTDescriptor, [curateProxy.address]);

    // Deploy a Market contract and Factory
    Market = await ethers.getContractFactory("Market");
    const implementation = await Market.deploy();
    Manager = await ethers.getContractFactory("Manager");
    const managerImplementation = await Manager.deploy();
    const Factory = await ethers.getContractFactory("MarketFactory");
    factory = await Factory.deploy(
      implementation.address,
      arbitrator.address,
      realitio.address,
      betNFTDescriptor.address,
      managerImplementation.address,
      governor.address,
      governor.address,
      protocolFee,
      7*24*60*60
    );
  });

  describe("Betting Period", () => {
    it("Should only accept valid bets.", async () => {
      const currentTS = await getCurrentTimestamp() + 10000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);
      
      let predictions;

      predictions = [numberToBytes32(1), numberToBytes32(40)];
      await market.placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      await market.placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      await expect(
        market.placeBet(ZERO_ADDRESS, predictions, { value: 101 })
      ).to.be.revertedWith("Wrong value sent");
      await expect(
        market.placeBet(ZERO_ADDRESS, predictions, { value: 99 })
      ).to.be.revertedWith("Wrong value sent");

      predictions = [numberToBytes32(1), numberToBytes32(40), numberToBytes32(50)];
      await expect(
        market.placeBet(ZERO_ADDRESS, predictions, { value: 100 })
      ).to.be.revertedWith("Results mismatch");

      predictions = [numberToBytes32(1)];
      await expect(
        market.placeBet(ZERO_ADDRESS, predictions, { value: 100 })
      ).to.be.revertedWith("Results mismatch");
    });

    it("Should not accept bets after closingTime has passed.", async () => {
      const currentTS = await getCurrentTimestamp();
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      await expect(
        market.placeBet(ZERO_ADDRESS, predictions, { value: 100 })
      ).to.be.revertedWith("Bets not allowed");
    });

    it("Should emit PlaceBet event.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      const tx = await market.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      const receipt = await tx.wait();
      const [player, tokenID, tokenHash, _predictions] = getEmittedEvent('PlaceBet', receipt).args
      expect(player).to.eq(other.address);
      expect(tokenID).to.eq((await market.nextTokenID()).sub(BigNumber.from(1)));
      expect(tokenHash).to.eq(ethers.utils.keccak256(ethers.utils.hexConcat(predictions)));
      expect(_predictions).to.deep.equal(predictions);
    });

    it("Should retrieve token URI correctly.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      const tx = await market.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      const svg = await market.tokenURI(0);
    });

    it("Should create and transfer ERC721 Bet item correctly.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      await market.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });

      const tokenID = (await market.nextTokenID()).sub(BigNumber.from(1));
      expect(await market.ownerOf(tokenID)).to.eq(other.address);

      await market.connect(other).transferFrom(other.address, user1.address, tokenID);
      expect(await market.ownerOf(tokenID)).to.eq(user1.address);
      expect(await market.balanceOf(user1.address)).to.eq(BigNumber.from(1));
    });

    it("Should send fees to providers if specified in the call.", async () => {
      const currentTS = await getCurrentTimestamp() + 10000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      tx = await market.placeBet(other.address, predictions, { value: BigNumber.from(100) });
      receipt = await tx.wait();
      [_attribution] = getEmittedEvent('Attribution', receipt).args;
      expect(_attribution).to.eq(other.address);
      
      tx = await market.placeBet(creator.address, predictions, { value: BigNumber.from(100) });
      receipt = await tx.wait();
      [_attribution] = getEmittedEvent('Attribution', receipt).args;
      expect(_attribution).to.eq(creator.address);

      tx = await market.placeBet(ZERO_ADDRESS, predictions, { value: 100 });
      receipt = await tx.wait();
      console.log(getEmittedEvent('Attribution', receipt));
    });

    it("Other functions should not be callable during the betting period, except for funding.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

      await expect(
        market.registerAvailabilityOfResults()
      ).to.be.revertedWith("Bets ongoing");
      await expect(
        market.registerPoints(0, 0, 0)
      ).to.be.revertedWith("Not in submission period");
      await expect(
        market.claimRewards(0, 0, 0)
      ).to.be.revertedWith("Not in claim period");
      await expect(
        market.reimbursePlayer(0)
      ).to.be.revertedWith("Not in claim period");
      await expect(
        market.distributeRemainingPrizes()
      ).to.be.revertedWith("Not in claim period");
      
      const tx = await market.connect(user1).fundMarket("Brrrrr", { value: 1000});
      const receipt = await tx.wait();
      const [funder, value, message] = getEmittedEvent('FundingReceived', receipt).args
      expect(funder).to.eq(user1.address);
      expect(value).to.eq(1000);
      expect(message).to.eq("Brrrrr");
      expect(await ethers.provider.getBalance(market.address)).to.eq(BigNumber.from(1000));
    });
  });

  describe("Register Points Period", () => {
    it("Should not register points if questions were not settled.", async () => {
      const currentTS = await getCurrentTimestamp();
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

      await expect(
        market.registerAvailabilityOfResults()
      ).to.be.revertedWith("question must be finalized");

      // Should still allow sponsors after bettings closed, only if questions were not settled.
      await market.connect(user1).fundMarket("Brrrrr", { value: 1000});
    });

    it("Should enter the submission period once questions are settled.", async () => {
      const currentTS = await getCurrentTimestamp();
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

      //predictions = [numberToBytes32(1), numberToBytes32(40)];
      const questionID1 = await market.questionIDs(0);
      const questionID2 = await market.questionIDs(1);
      await realitio.submitAnswer(questionID1, numberToBytes32(1), 0, { value: 10 });
      await realitio.submitAnswer(questionID2, numberToBytes32(40), 0, { value: 10 });
      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      const tx = await market.registerAvailabilityOfResults();
      const receipt = await tx.wait();
      const timestamp = BigNumber.from(await getCurrentTimestamp(receipt.blockNumber));
      expect(await market.resultSubmissionPeriodStart()).to.eq(timestamp);
      expect(await market.totalPrize()).to.eq(BigNumber.from(0));
      // Should not allow sponsors.
      await expect(
        market.connect(user1).fundMarket("Brrrrr", { value: 1000})
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
      ];

      // Sort questions by Realitio's question ID.
      const orderedQuestions = questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);
  
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
        await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');
  
      for (let i = 0; i < results.length; i++) {
        const questionID = await market.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      const poolBalance = await ethers.provider.getBalance(market.address);
      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      let tx = await market.registerAvailabilityOfResults();
      let receipt = await tx.wait();
      const [_manager, _managementReward] = getEmittedEvent('ManagementReward', receipt).args
      const marketInfo = await market.marketInfo();
      expect(_manager).to.eq(marketInfo.manager);
      const managementReward = poolBalance.mul(BigNumber.from(marketData.managementFee + protocolFee)).div(BigNumber.from(10000));
      expect(_managementReward).to.eq(managementReward);
      expect(await ethers.provider.getBalance(marketInfo.manager)).to.eq(managementReward);
      expect(await market.totalPrize()).to.eq(poolBalance.sub(managementReward));
  
      // Estimate ranking
      const ranking = []
      for (let i = 0; i < bets.length; i++) {
        const predictions_i = bets[i];
        const points = predictions_i.filter((prediction, idx) => prediction == results[idx]).length;
        ranking.push(points);
      }
  
      // Register ranking
      await expect(market.registerPoints(100, 0, 0)).to.be.revertedWith("Token does not exist");
  
      // Cannot register a token with 0 points
      await expect(market.registerPoints(4, 0, 0)).to.be.revertedWith("You are not a winner");
      await expect(market.registerPoints(4, 2, 0)).to.be.revertedWith("You are not a winner");
      await expect(market.registerPoints(2, 2, 0)).to.be.revertedWith("Invalid ranking index");
  
      tx = await market.registerPoints(2, 0, 0);
      receipt = await tx.wait();
      let [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(2));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[2]));
      expect(_index).to.eq(BigNumber.from(0));
  
      await expect(market.registerPoints(4, 0, 0)).to.be.revertedWith("You are not a winner");
      await expect(market.registerPoints(4, 1, 0)).to.be.revertedWith("You are not a winner");
      await expect(market.registerPoints(4, 2, 0)).to.be.revertedWith("You are not a winner");
  
      // Cannot register a token at a position with fewer points than the current token
      tx = await market.registerPoints(3, 0, 0);
      receipt = await tx.wait();
      expect(receipt.events.length).to.eq(0); // No events = ranking was not modified
      // A token can only be registered at its current best possible position, not worse.
      await expect(market.registerPoints(3, 2, 0)).to.be.revertedWith("Invalid ranking index");
      tx = await market.registerPoints(3, 1, 0);
      receipt = await tx.wait();
      [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(3));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[3]));
      expect(_index).to.eq(BigNumber.from(1));
  
      // If there is a tie between 2 tokens, the second one should be registered pointing to the first token
      tx = await market.registerPoints(0, 0, 1);
      receipt = await tx.wait();
      [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(0));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[0]));
      expect(_index).to.eq(BigNumber.from(1));
  
      await expect(market.registerPoints(2, 1, 0)).to.be.revertedWith("Token already registered");
      await expect(market.registerPoints(2, 0, 0)).to.be.revertedWith("Token already registered");
      await expect(market.registerPoints(0, 1, 0)).to.be.revertedWith("Token already registered");
      await expect(market.registerPoints(0, 0, 0)).to.be.revertedWith("Token already registered");
  
      // If overwritten, a token can get registered again
      tx = await market.registerPoints(3, 2, 0);
      receipt = await tx.wait();
      [_tokenID, _totalPoints, _index] = getEmittedEvent('RankingUpdated', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(3));
      expect(_totalPoints).to.eq(BigNumber.from(ranking[3]));
      expect(_index).to.eq(BigNumber.from(2));
    });
  });

  describe("Claims and Reimbursements", () => {
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
      ];
      // Sort questions by Realitio's question ID.
      const orderedQuestions = questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

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
        await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');

      for (let i = 0; i < results.length; i++) {
        const questionID = await market.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      await market.registerAvailabilityOfResults();

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
      let currentDuplicates = 0;
      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) break;
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          currentDuplicateIndex = i;
          currentDuplicates = 0;
        } else if (i != 0) {
          currentDuplicates += 1;
        }
        tx = await market.registerPoints(bet_i, currentDuplicateIndex, currentDuplicates);
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
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          break;
        }
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          currentDuplicateIndex = i;
        }
        await market.registerPoints(bet_i, currentDuplicateIndex, i - currentDuplicateIndex);
        if (i == sortedRanking.length - 1) {
          prizeShare.push(i + 1 - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i + 1).reduce((a, b) => a + b, 0));
        }
      }

      await expect(market.claimRewards(0, 0, 0)).to.be.revertedWith("Submission period not over");
      await expect(market.reimbursePlayer(0)).to.be.revertedWith("Submission period not over");
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("Submission period not over");

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(market.reimbursePlayer(0)).to.be.revertedWith("Can't reimburse if there are winners");
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("No vacant prizes");

      const totalPrize = await market.totalPrize();
      let rankIndex = 0;
      let bet_i
      for (let i = 0; i < realPrizeWeights.length; i++) {
        bet_i = sortedRanking[sortedRanking.length - rankIndex - 1];
        if (ranking[bet_i] == 0) break;

        const firstBatchRankedIndex = rankIndex;
        const lastBatchRankedIndex = firstBatchRankedIndex + prizeShare[i] - 1;
        for (let j = 0; j < prizeShare[i]; j++) {
          tx = await market.claimRewards(rankIndex, firstBatchRankedIndex, lastBatchRankedIndex);
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
        await expect(market.claimRewards(i, 0, 0)).to.be.revertedWith("Already claimed");
      }
    });
    
    it("Should claim all prizes only once after automatic ranking registration.", async () => {
      // Register all points in the correct order
      const sortedRanking = Array.from(Array(ranking.length).keys()).sort((a, b) => ranking[a] < ranking[b] ? -1 : (ranking[b] < ranking[a]) | 0);
      let currentDuplicateIndex = 0;
      let prizeShare = [];
      let realPrizeWeights = [];
      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          break;
        }
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          currentDuplicateIndex = i;
        }
        if (i == sortedRanking.length - 1) {
          prizeShare.push(i + 1 - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i + 1).reduce((a, b) => a + b, 0));
        }
      }

      await market.registerAll();

      await expect(market.reimbursePlayer(0)).to.be.revertedWith("Can't reimburse if there are winners");
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("No vacant prizes");

      const totalPrize = await market.totalPrize();
      let rankIndex = 0;
      let bet_i;
      let prizesGiven;
      for (let i = 0; i < realPrizeWeights.length; i++) {
        bet_i = sortedRanking[sortedRanking.length - rankIndex - 1];
        if (ranking[bet_i] == 0) break;

        const firstBatchRankedIndex = rankIndex;
        const lastBatchRankedIndex = firstBatchRankedIndex + prizeShare[i] - 1;
        for (let j = 0; j < prizeShare[i]; j++) {
          if (firstBatchRankedIndex >= marketData.prizeWeights.length) break;
          prizesGiven = rankIndex;
          tx = await market.claimRewards(rankIndex, firstBatchRankedIndex, lastBatchRankedIndex);
          receipt = await tx.wait();
          [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
          bet_i = sortedRanking[sortedRanking.length - rankIndex - 1];
          const expectedReward = totalPrize.mul(realPrizeWeights[i]).div(10000 * prizeShare[i]);
          expect(_reward).to.eq(BigNumber.from(expectedReward));
          rankIndex += 1;
        }
      }

      for (let i = 0; i < prizesGiven; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) break;
        await expect(market.claimRewards(i, 0, 0)).to.be.revertedWith("Already claimed");
      }

    });

    it("Should reimburse players if nobody won/was registered.", async () => {
      // Go straight to the rewards period
      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("No winners");
      const totalPrize = await market.totalPrize();
      const totalTokens = players.length;
      const individualReimbursement = totalPrize.div(BigNumber.from(totalTokens));
      let poolBalance = await ethers.provider.getBalance(market.address);
      for (let i = 0; i < players.length; i++) {
        await market.reimbursePlayer(i);
        await expect(market.ownerOf(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
        poolBalance = poolBalance.sub(individualReimbursement);
        expect(await ethers.provider.getBalance(market.address)).to.eq(poolBalance);
      }

      for (let i = 0; i < players.length + 2; i++) {
        await expect(market.reimbursePlayer(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
      }
    });

    it("Should distribute vacant prices.", async () => {
      // Register only one player's results
      const tokenID = 0;
      await market.registerPoints(tokenID, 0, 0);

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(market.reimbursePlayer(tokenID)).to.be.revertedWith("Can't reimburse if there are winners");

      tx = await market.claimRewards(0, 0, 0);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(tokenID));
      const totalPrize = await market.totalPrize();
      expectedReward = totalPrize.mul(marketData.prizeWeights[0]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await market.distributeRemainingPrizes();
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(tokenID));
      const cumWeights = marketData.prizeWeights[1] + marketData.prizeWeights[2];
      expectedReward = totalPrize.mul(cumWeights).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));
      
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("Already claimed");
    });

    it("Should distribute vacant prices 2.", async () => {
      // Register only two player's results
      await market.registerPoints(1, 0, 0);
      await market.registerPoints(2, 1, 0);

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(market.reimbursePlayer(1)).to.be.revertedWith("Can't reimburse if there are winners");
      await expect(market.reimbursePlayer(2)).to.be.revertedWith("Can't reimburse if there are winners");

      tx = await market.claimRewards(0, 0, 0);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(1));
      const totalPrize = await market.totalPrize();
      expectedReward = totalPrize.mul(marketData.prizeWeights[0]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await market.claimRewards(1, 1, 1);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(2));
      expectedReward = totalPrize.mul(marketData.prizeWeights[1]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await market.distributeRemainingPrizes();
      receipt = await tx.wait();
      expectedReward = totalPrize.mul(marketData.prizeWeights[2]).div(10000 * 2);
      for (let i = 0; i < receipt.events.length; i++) {
        [_tokenID, _reward] = receipt.events[i].args;
        expect(_tokenID).to.eq(BigNumber.from(i + 1));
        expect(_reward).to.eq(BigNumber.from(expectedReward));
      }
    });
  });

  describe("Huge Markets", () => {
    let players;
    let ranking;
    beforeEach("Setup bets", async function () {
      const bettingTime = 200;
      const closingTime = await getCurrentTimestamp() + bettingTime;
      const size = 256;
      let questions = [];
      for(let i = 0; i < size; i++) {
        questions.push(
          {
            templateID: 2, 
            question: `Who won the match between Team ${i} and Team ${i+1} at Tournament?␟\"Team ${i}\",\"Team ${i+1}\"␟sports␟en_US`, 
            openingTS: closingTime + 1
          }
        );
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights,
        {
          gasLimit: 30000000
        }
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

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
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))),
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))),
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))),
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))),
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))),
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))),
        Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3)))
      ];
      const results = Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3)));

      for (let i = 0; i < bets.length; i++) {
        await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');

      for (let i = 0; i < results.length; i++) {
        const questionID = await market.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      await market.registerAvailabilityOfResults();

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
      let currentDuplicates = 0;
      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) break;
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          currentDuplicateIndex = i;
          currentDuplicates = 0;
        } else if (i != 0) {
          currentDuplicates += 1;
        }
        tx = await market.registerPoints(bet_i, currentDuplicateIndex, currentDuplicates);
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
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          break;
        }
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          currentDuplicateIndex = i;
        }
        await market.registerPoints(bet_i, currentDuplicateIndex, i - currentDuplicateIndex);
        if (i == sortedRanking.length - 1) {
          prizeShare.push(i + 1 - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i + 1).reduce((a, b) => a + b, 0));
        }
      }

      await expect(market.claimRewards(0, 0, 0)).to.be.revertedWith("Submission period not over");
      await expect(market.reimbursePlayer(0)).to.be.revertedWith("Submission period not over");
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("Submission period not over");

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(market.reimbursePlayer(0)).to.be.revertedWith("Can't reimburse if there are winners");
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("No vacant prizes");

      const totalPrize = await market.totalPrize();
      let rankIndex = 0;
      let bet_i;
      for (let i = 0; i < realPrizeWeights.length; i++) {
        bet_i = sortedRanking[sortedRanking.length - rankIndex - 1];
        if (ranking[bet_i] == 0) break;

        const firstBatchRankedIndex = rankIndex;
        const lastBatchRankedIndex = firstBatchRankedIndex + prizeShare[i] - 1;
        for (let j = 0; j < prizeShare[i]; j++) {
          tx = await market.claimRewards(rankIndex, firstBatchRankedIndex, lastBatchRankedIndex);
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
        await expect(market.claimRewards(i, 0, 0)).to.be.revertedWith("Already claimed");
      }
    });

    it("Should distribute vacant prices.", async () => {
      // Register only one player's results
      const tokenID = 0;
      await market.registerPoints(tokenID, 0, 0);

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(market.reimbursePlayer(tokenID)).to.be.revertedWith("Can't reimburse if there are winners");

      tx = await market.claimRewards(0, 0, 0);
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(tokenID));
      const totalPrize = await market.totalPrize();
      expectedReward = totalPrize.mul(marketData.prizeWeights[0]).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));

      tx = await market.distributeRemainingPrizes();
      receipt = await tx.wait();
      [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
      expect(_tokenID).to.eq(BigNumber.from(tokenID));
      const cumWeights = marketData.prizeWeights[1] + marketData.prizeWeights[2];
      expectedReward = totalPrize.mul(cumWeights).div(10000);
      expect(_reward).to.eq(BigNumber.from(expectedReward));
      
      await expect(market.distributeRemainingPrizes()).to.be.revertedWith("Already claimed");
    });
  });

  describe("Huge Bettor Markets", () => {
    let players;
    let ranking;
    beforeEach("Setup bets", async function () {
      const bettingTime = 1000;
      const closingTime = await getCurrentTimestamp() + bettingTime;
      const size = 10;
      let questions = [];
      for(let i = 0; i < size; i++) {
        questions.push(
          {
            templateID: 2, 
            question: `Who won the match between Team ${i} and Team ${i+1} at Tournament?␟\"Team ${i}\",\"Team ${i+1}\"␟sports␟en_US`, 
            openingTS: closingTime + 1
          }
        );
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights,
        {
          gasLimit: 30000000
        }
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

      const nBets = 100;
      const playersList = [
        player1,
        player2,
        player3,
        player4,
      ];
      players = Array.from({ length: nBets }, (_, idx) => playersList[Math.floor(Math.random() * playersList.length)]);
      const bets = Array.from({ length: nBets }, (_, idx) => Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3))));
      const results = Array.from({ length: size }, (_, idx) => numberToBytes32(Math.floor(Math.random() * 3)));

      for (let i = 0; i < bets.length; i++) {
        await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');

      for (let i = 0; i < results.length; i++) {
        const questionID = await market.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      await market.registerAvailabilityOfResults();

      // Estimate ranking
      ranking = []
      for (let i = 0; i < bets.length; i++) {
        const predictions_i = bets[i];
        const points = predictions_i.filter((prediction, idx) => prediction == results[idx]).length;
        ranking.push(points);
      }
    });

    it("Should register all and claim rewards correctly.", async () => {
      let tx;
      let receipt;

      const sortedRanking = Array.from(Array(ranking.length).keys()).sort((a, b) => ranking[a] < ranking[b] ? -1 : (ranking[b] < ranking[a]) | 0);
      let currentDuplicateIndex = 0;
      let prizeShare = [];
      let realPrizeWeights = [];
      for (let i = 0; i < sortedRanking.length; i++) {
        const bet_i = sortedRanking[sortedRanking.length - i - 1];
        if (ranking[bet_i] == 0) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          break;
        }
        if (i > 0 && ranking[bet_i] != ranking[sortedRanking[sortedRanking.length - i]]) {
          prizeShare.push(i - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i).reduce((a, b) => a + b, 0));
          currentDuplicateIndex = i;
        }
        if (i == sortedRanking.length - 1) {
          prizeShare.push(i + 1 - currentDuplicateIndex);
          realPrizeWeights.push(marketData.prizeWeights.slice(currentDuplicateIndex, i + 1).reduce((a, b) => a + b, 0));
        }
      }

      tx = await market.registerAll();
      const rankingEvents = (await tx.wait()).events;

      const totalPrize = await market.totalPrize();
      let rankIndex = 0;
      for (let i = 0; i < realPrizeWeights.length; i++) {
        const firstBatchRankedIndex = rankIndex;
        const lastBatchRankedIndex = firstBatchRankedIndex + prizeShare[i] - 1;
        for (let j = 0; j < prizeShare[i]; j++) {
          tx = await market.claimRewards(rankIndex, firstBatchRankedIndex, lastBatchRankedIndex);
          receipt = await tx.wait();
          [_tokenID, _reward] = getEmittedEvent('BetReward', receipt).args;
          const expectedReward = totalPrize.mul(realPrizeWeights[i]).div(10000 * prizeShare[i]);
          expect(_reward).to.eq(BigNumber.from(expectedReward));
          expect(rankingEvents[rankIndex].args._tokenID).to.eq(_tokenID);

          rankIndex += 1;
        }
        const betData = await market.ranking(rankIndex);
        if (betData.points.eq(BigNumber.from(0))) break;
      }
      expect(rankingEvents.length).to.eq(rankIndex);
    });
  });

  describe("Getters", () => {
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
      ];
      // Sort questions by Realitio's question ID.
      const orderedQuestions = questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

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
        await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: 100 });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');

      for (let i = 0; i < results.length; i++) {
        const questionID = await market.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      
      await expect(market.getScore(0)).to.be.revertedWith("Results not available");

      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      await market.registerAvailabilityOfResults();

      // Estimate ranking
      ranking = []
      for (let i = 0; i < bets.length; i++) {
        const predictions_i = bets[i];
        const points = predictions_i.filter((prediction, idx) => prediction == results[idx]).length;
        ranking.push(points);
      }
    });

    it("Should get all data correctly.", async () => {
      const numberOfQuestions = await market.numberOfQuestions();
      expect(numberOfQuestions).to.eq(BigNumber.from(3));

      const prizesMultipliers = await market.getPrizes();
      expect(prizesMultipliers).to.deep.equal(marketData.prizeWeights.map(BigNumber.from));

      const tokenID = 1;
      const predictionsView = await market.getPredictions(tokenID);
      expect(predictionsView).to.deep.equal([numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)]);

      const score = await market.getScore(tokenID);
      expect(score).to.eq(ranking[tokenID]);
    });
  });

  describe("Royalties - ERC2981 & IERC165", () => {
    it("Should return the correct royalty info.", async () => {
      const currentTS = await getCurrentTimestamp() + 1000;
      for (let i = 0; i < marketData.questions.length; i++) {
        marketData.questions[i].openingTS = currentTS + 1;
      }
      // Sort questions by Realitio's question ID.
      const orderedQuestions = marketData.questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        currentTS,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);
      
      const predictions = [numberToBytes32(1), numberToBytes32(40)];
      await market.connect(other).placeBet(ZERO_ADDRESS, predictions, { value: 100 });

      const salePrices = [
        ethers.utils.parseUnits("1.0", "wei"),
        ethers.utils.parseUnits("100.0", "gwei"),
        ethers.utils.parseEther("1.0"),
        ethers.utils.parseEther("1000.0"),
        ethers.utils.parseEther("100000000.0")
      ];
      const marketInfo = await market.marketInfo();
      for (let i = 0; i < salePrices.length; i++) {
        const [receiver, amount] = await market.royaltyInfo(i, salePrices[i]);
        const expectedRoyalty = salePrices[i].mul(protocolFee).div(10000);
        const managerContract = await Manager.attach(marketInfo.manager);
        expect(receiver).to.eq(await managerContract.creator());
        expect(amount).to.eq(expectedRoyalty);
      }
    });

    it("Should support interfaces ERC165, ERC721, ERC721Metadata and ERC2981.", async () => {
      expect(await market.supportsInterface("0x01ffc9a7")).to.be.true; // IERC165
      expect(await market.supportsInterface("0x80ac58cd")).to.be.true; // IERC721
      expect(await market.supportsInterface("0x5b5e139f")).to.be.true; // IERC721Metadata
      expect(await market.supportsInterface("0x2a55205a")).to.be.true; // IERC2981
      expect(await market.supportsInterface("0xffffffff")).to.be.false;
      expect(await market.supportsInterface("0x00000000")).to.be.false;
      expect(await market.supportsInterface("0x12345678")).to.be.false;
    });
  });

  describe("Fee Management", () => {
    let players;
    let ranking;
    beforeEach("Setup bets", async function () {
      const bettingTime = 200;
      const betPrice = 2000;
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
      ];
      // Sort questions by Realitio's question ID.
      const orderedQuestions = questions
        .sort((a, b) => getQuestionID(
            a.templateID,
            a.openingTS,
            a.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) > getQuestionID(
            b.templateID,
            b.openingTS,
            b.question,
            arbitrator.address,
            timeout,
            marketData.minBond,
            realitio.address,
            factory.address,
          ) ? 1 : -1);
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        closingTime,
        betPrice,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      market = await Market.attach(marketAddress);

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
      ];
      const results = [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)];

      for (let i = 0; i < bets.length; i++) {
        await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: betPrice });
      }
      await ethers.provider.send('evm_increaseTime', [bettingTime]);
      await ethers.provider.send('evm_mine');

      for (let i = 0; i < results.length; i++) {
        const questionID = await market.questionIDs(i);
        await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
      }
      await ethers.provider.send('evm_increaseTime', [timeout]);
      await ethers.provider.send('evm_mine');
      await market.registerAvailabilityOfResults();

      // Estimate ranking
      ranking = []
      for (let i = 0; i < bets.length; i++) {
        const predictions_i = bets[i];
        const points = predictions_i.filter((prediction, idx) => prediction == results[idx]).length;
        ranking.push(points);
      }
    });

    it("Should send fees only after distribution.", async () => {
      const marketInfo = await market.marketInfo();
      const managerContract = await Manager.attach(marketInfo.manager);

      const feesGenerated = marketData.managementFee + protocolFee;
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(0)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(0)).to.eq(await managerContract.protocolReward());
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeProtocolRewards();
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeRewards();
      expect(BigNumber.from(marketData.managementFee)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(protocolFee)).to.eq(await managerContract.protocolReward());
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(marketData.managementFee)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(protocolFee)).to.eq(await managerContract.protocolReward());
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await expect(managerContract.distributeRewards()).to.be.revertedWith("Reward already claimed");
      
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(protocolFee)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(protocolFee)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeProtocolRewards();
      expect(BigNumber.from(0)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(0)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      expect(BigNumber.from(0)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(0)).to.eq(await managerContract.protocolReward());
    });

    it("Should distribute surplus of xDAI correctly.", async () => {const marketInfo = await market.marketInfo();
      const managerContract = await Manager.attach(marketInfo.manager);
      const surplus = 100;
      await other.sendTransaction({
        to: marketInfo.manager,
        value: surplus,
      });

      const feesGenerated = marketData.managementFee + protocolFee;
      expect(BigNumber.from(feesGenerated + surplus)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(surplus/2)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(surplus/2)).to.eq(await managerContract.protocolReward());
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(feesGenerated + surplus/2)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeProtocolRewards();
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeRewards();
      expect(BigNumber.from(marketData.managementFee)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(protocolFee)).to.eq(await managerContract.protocolReward());
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(marketData.managementFee)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(protocolFee)).to.eq(await managerContract.protocolReward());
      expect(BigNumber.from(feesGenerated)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await expect(managerContract.distributeRewards()).to.be.revertedWith("Reward already claimed");
      
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(protocolFee)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(protocolFee)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeProtocolRewards();
      expect(BigNumber.from(0)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(0)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      expect(BigNumber.from(0)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(0)).to.eq(await managerContract.protocolReward());
    });

    it("Should distribute surplus of xDAI + fees correctly.", async () => {const marketInfo = await market.marketInfo();
      const managerContract = await Manager.attach(marketInfo.manager);
      const surplus = 100;
      await other.sendTransaction({
        to: marketInfo.manager,
        value: surplus,
      });

      const feesGenerated = marketData.managementFee + protocolFee;
      expect(BigNumber.from(feesGenerated + surplus)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(feesGenerated + surplus)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeProtocolRewards();
      expect(BigNumber.from(feesGenerated + surplus)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeRewards();
      expect(BigNumber.from(marketData.managementFee)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(protocolFee)).to.eq(await managerContract.protocolReward());
      expect(BigNumber.from(feesGenerated + surplus)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(marketData.managementFee + surplus/2)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(protocolFee + surplus/2)).to.eq(await managerContract.protocolReward());
      expect(BigNumber.from(feesGenerated + surplus)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await expect(managerContract.distributeRewards()).to.be.revertedWith("Reward already claimed");
      
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(protocolFee + surplus/2)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeCreatorRewards();
      expect(BigNumber.from(protocolFee + surplus/2)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.executeProtocolRewards();
      expect(BigNumber.from(0)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      await managerContract.distributeSurplus();
      expect(BigNumber.from(0)).to.eq(await ethers.provider.getBalance(marketInfo.manager));
      expect(BigNumber.from(0)).to.eq(await managerContract.creatorReward());
      expect(BigNumber.from(0)).to.eq(await managerContract.protocolReward());
    });
  });
});