const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { solidity } = require('ethereum-waffle');
use(solidity);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

async function getMarketParams(marketData, isClosed, factory, arbitrator, realitio, timeout, bettingTime) {
  let currentTS = await getCurrentTimestamp();
  const closingTime = isClosed ? currentTS - 1 : currentTS + bettingTime;
  for (let i = 0; i < marketData.questions.length; i++) {
    marketData.questions[i].openingTS = closingTime + 1;
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

  const MarketParams = {
    marketName: marketData.info.marketName,
    marketSymbol: marketData.info.marketSymbol,
    creatorFee: marketData.managementFee,
    closingTime: closingTime,
    price: marketData.price,
    minBond: marketData.minBond,
    questionsData: orderedQuestions,
    prizeWeights: marketData.prizeWeights
  }

  return MarketParams;
}

describe("LiquidityPool", () => {
  let governor;
  let creator;
  let player1;
  let player2;
  let player3;

  let arbitrator;
  let realitio;
  let factory;
  let lpFactory;
  let Market;
  let Manager;
  let LiquidityPool;
  let betNFTDescriptor;

  const bettingTime = 200;
  const timeout = 129600; // 1.5 days
  const protocolFee = 150; // 1.5 %
  const marketCreatorFee = 5000; // 50%
  const lpCreatorFee = 500; // 5%
  const lpBetMultiplier = 10;
  const marketData = {
    info: {
      marketName: "FIFA World Cup 2022",
      marketSymbol: "FWC22"
    },
    closingTime: 0,
    price: ethers.utils.parseUnits('100'),
    managementFee: marketCreatorFee,
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
      },
      {
        templateID: 2,
        question: "Who won the last match between Barcelona and Madrid?␟\"Barcelona\",\"Madrid\"␟sports␟en_US",
        openingTS: 0
      }
    ],
    prizeWeights: [6000, 3000, 1000]
  };

  async function processBets(players, bets, results, bettingTime, market, realitio) {
    // place bet
    for (let i = 0; i < players.length; i++) {
      await market.connect(players[i]).placeBet(ZERO_ADDRESS, bets[i], { value: marketData.price });
    }

    await ethers.provider.send('evm_increaseTime', [bettingTime]);
    await ethers.provider.send('evm_mine');

    // send results
    for (let i = 0; i < results.length; i++) {
      const questionID = await market.questionIDs(i);
      await realitio.submitAnswer(questionID, results[i], 0, { value: 10 });
    }
    await ethers.provider.send('evm_increaseTime', [timeout]);
    await ethers.provider.send('evm_mine');
    await market.registerAvailabilityOfResults();

    await market.registerAll();

    const marketInfo = await market.marketInfo();
    const managerContract = await Manager.attach(marketInfo.manager);
    await managerContract.distributeRewards();
    await managerContract.executeCreatorRewards();
  }

  function getLiquidityPoolReward(poolDeposits) {
    const marketCreatorRewards = poolDeposits.mul(marketCreatorFee).div(10000);
    const lpCreatorRewards = marketCreatorRewards.mul(lpCreatorFee).div(10000);

    return marketCreatorRewards.sub(lpCreatorRewards);
  }

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
    betNFTDescriptor = await upgrades.deployProxy(BetNFTDescriptor, [curateProxy.address]);

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
    // Deploy Liquidity Pool contract and Factory
    LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const lpImplementation = await LiquidityPool.deploy();
    const LPFactory = await ethers.getContractFactory("LiquidityFactory");
    lpFactory = await LPFactory.deploy(
      factory.address,
      lpImplementation.address,
      governor.address
    );
  });

  describe("Initialization", () => {
    it("Should initialize liquidity pool correctly.", async () => {
      const marketParams = await getMarketParams(marketData, false, factory, arbitrator, realitio, timeout, bettingTime);
      const liquidityParams = {
        creator: creator.address,
        creatorFee: lpCreatorFee,
        betMultiplier: lpBetMultiplier,
        pointsToWin: marketData.questions.length,
      }
      const tx = await lpFactory.createMarketWithLiquidityPool(marketParams, liquidityParams);
      console.log(await tx.wait());
      const totalMarkets = await factory.marketCount();
      const marketAddress = await factory.markets(totalMarkets.sub(BigNumber.from(1)));
      const market = await Market.attach(marketAddress);

      //await liquidityPool.deposit({ value: BigNumber.from(100) });

    });

    it("Should not accept deposits after closingTime has passed.", async () => {
      
    });
  });

  describe("Deposits", () => {
    it("Should accept deposits", async () => {
      const liquidityPool = await createLiquidityPool(LiquidityPool, creator.address, lpCreatorFee, lpBetMultiplier);
      const market = await createMarket(marketData, false, Market, factory, liquidityPool, arbitrator, realitio, timeout, bettingTime);
      await liquidityPool.setMarket(market.address, 3);

      await liquidityPool.deposit({ value: BigNumber.from(100) });

      await expect(
        await liquidityPool.provider.getBalance(liquidityPool.address)
      ).to.be.eq(BigNumber.from(100));
    });

    it("Should not accept deposits after closingTime has passed.", async () => {
      const liquidityPool = await createLiquidityPool(LiquidityPool, creator.address, lpCreatorFee, lpBetMultiplier);

      const market = await createMarket(marketData, true, Market, factory, liquidityPool, arbitrator, realitio, timeout, bettingTime);
      await liquidityPool.setMarket(market.address, 3);

      await expect(
        liquidityPool.deposit({ value: BigNumber.from(100) })
      ).to.be.revertedWith("Deposits not allowed");
    });
  });

  describe("Prizes + Withdraws", () => {

    // excess LP: the LP has excess to cover all the market prizes
    // partial LP: the LP is not enough to cover all the market prizes
    // exact LP: the LP has the right amount to cover all the market prizes

    async function testWinnerAndWithdraw(lpDeposit, lpToMarket, lpWithdraw, hasPerfectWinner) {
      const betsWithPerfectWinner = [
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)], // 3 points
        [numberToBytes32(1), numberToBytes32(1), numberToBytes32(1)], // 2 points
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(2)], // 2 points
      ];

      const betsWithoutPerfectWinner = [
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(0)], // 2 points
        [numberToBytes32(1), numberToBytes32(1), numberToBytes32(0)], // 1 points
        [numberToBytes32(1), numberToBytes32(1), numberToBytes32(0)], // 1 points
      ];

      const bets = hasPerfectWinner ? betsWithPerfectWinner : betsWithoutPerfectWinner;

      const liquidityPool = await createLiquidityPool(LiquidityPool, creator.address, lpCreatorFee, lpBetMultiplier);

      const market = await createMarket(marketData, false, Market, factory, liquidityPool, arbitrator, realitio, timeout, bettingTime);
      await liquidityPool.setMarket(market.address, 3);

      await liquidityPool.connect(creator).deposit({ value: BigNumber.from(lpDeposit) });

      await processBets(
        [player1, player2, player3],
        bets,
        [numberToBytes32(1), numberToBytes32(2), numberToBytes32(1)],
        bettingTime,
        market,
        realitio
      );

      const tokenID = 0;

      if (hasPerfectWinner) {
        // 1st place prize
        tx = await liquidityPool.claimRewards(0, 0, 0);
        receipt = await tx.wait();
        const [_tokenID, _prizeReward] = getEmittedEvent('BetReward', receipt).args;
        expect(_tokenID).to.eq(BigNumber.from(tokenID));

        const expectedReward = lpToMarket.mul(60).div(100); // 60% 1st place

        expect(_prizeReward).to.eq(expectedReward);
      } else {
        await expect(liquidityPool.claimRewards(0, 0, 0)).to.be.revertedWith("Invalid rankIndex");
      }
      
      tx = await liquidityPool.connect(creator).withdraw();
      
      receipt = await tx.wait();
      [_, _amount] = getEmittedEvent('Withdrawn', receipt).args;
      expect(_amount).to.eq(lpWithdraw);

      await expect(liquidityPool.connect(creator).withdraw()).to.be.revertedWith("Not enough balance");
    }

    it("Test full winner with excess LP rewards", async () => {
      await testWinnerAndWithdraw(
        ethers.utils.parseUnits('3100'), 
        ethers.utils.parseUnits('3000'), 
        getLiquidityPoolReward(marketData.price.mul(3)).add(ethers.utils.parseUnits('100')), 
        true
      );
    });

    it("Test full winner with partial LP rewards", async () => {
      await testWinnerAndWithdraw(
        ethers.utils.parseUnits('3000'), 
        ethers.utils.parseUnits('3000'), 
        getLiquidityPoolReward(marketData.price.mul(3)), 
        true
      );
    });

    it("Test full winner with exact LP rewards", async () => {
      await testWinnerAndWithdraw(
        ethers.utils.parseUnits('100'), 
        ethers.utils.parseUnits('100'), 
        getLiquidityPoolReward(marketData.price.mul(3)), 
        true
      );
    });

    it("Test partial winner with excess LP rewards", async () => {
      await testWinnerAndWithdraw(
        ethers.utils.parseUnits('3100'), 
        ethers.utils.parseUnits('0'), 
        ethers.utils.parseUnits('3100').add(getLiquidityPoolReward(marketData.price.mul(3))), 
        false
      );
    });

    it("Test partial winner with partial LP rewards", async () => {
      await testWinnerAndWithdraw(
        ethers.utils.parseUnits('3000'), 
        ethers.utils.parseUnits('0'), 
        ethers.utils.parseUnits('3000').add(getLiquidityPoolReward(marketData.price.mul(3))), 
        false
      );
    });

    it("Test partial winner with exact LP rewards", async () => {
      await testWinnerAndWithdraw(
        ethers.utils.parseUnits('3100'), 
        ethers.utils.parseUnits('0'), 
        ethers.utils.parseUnits('3100').add(getLiquidityPoolReward(marketData.price.mul(3))), 
        false
      );
    });
  })

});