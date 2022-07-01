const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { solidity } = require('ethereum-waffle');
use(solidity);

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

describe("MarketFactory", () => {
  let governor;
  let creator;
  let other;

  let arbitrator;
  let realitio;
  let factory;
  let betNFTDescriptor;
  let Market;
  let Manager;
  
  const timeout = 129600; // 1.5 days
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
        openingTS: 1
      },
      {
        templateID: 2, 
        question: "Who won the last match between Boca and River?␟\"Boca\",\"River\"␟sports␟en_US", 
        openingTS: 1
      }
    ],
    prizeWeights: [6000, 3000, 1000]
  };

  before("Get accounts", async () => {
    const accounts = await ethers.getSigners();
    governor = accounts[0];
    creator = accounts[1];
    other = accounts[2];
  });

  beforeEach("initialize the contract", async function () {
    // Deploy arbitrator
    const Arbitrator = await ethers.getContractFactory("Arbitrator");
    arbitrator = await Arbitrator.deploy();
    // console.log("Arbitrator Address: ", arbitrator.address)

    // Deploy Realitio
    const RealityEth = await ethers.getContractFactory("RealitioMock");
    realitio = await RealityEth.deploy();
    // console.log("Realitio Address: ", realitio.address)

    // Deploy Curate Proxy contract
    const curateAddress = "0x0000000000000000000000000000000000000000";
    const CurateProxy = await ethers.getContractFactory("CurateProxy");
    const curateProxy = await CurateProxy.deploy(curateAddress);

    // Deploy NFT Descriptor contract
    const BetNFTDescriptor = await ethers.getContractFactory("BetNFTDescriptor");
    betNFTDescriptor = await upgrades.deployProxy(BetNFTDescriptor, [curateProxy.address]);

    // Deploy a Market contract, Manager contract and Factory
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
      150, // protocol fee in basis points
      7*24*60*60
    );
  });

  it("Should not be possibe to initialize a Market instance twice.", async () => {
    // Sort questions by Realitio's question ID.
    const questionsIDs = marketData.questions
      .map((questionData) => getQuestionID(
        questionData.templateID,
        questionData.openingTS,
        questionData.question,
        arbitrator.address,
        timeout,
        marketData.minBond,
        realitio.address,
        factory.address,
      )
    ).sort();
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
      marketData.closingTime,
      marketData.price,
      marketData.minBond,
      orderedQuestions,
      marketData.prizeWeights
    );
    const marketAddress = await factory.markets(0);
    const market = await Market.attach(marketAddress);
    await expect(
      market.initialize(
        {
          fee: 0,
          royaltyFee: 0,
          manager: creator.address,
          marketName: marketData.info.marketName, 
          marketSymbol: marketData.info.marketSymbol
        },
        betNFTDescriptor.address,
        realitio.address,
        marketData.closingTime,
        marketData.price,
        0,
        questionsIDs,
        marketData.prizeWeights
      )
    ).to.be.revertedWith("Already initialized");
  });

  it("Should revert if market's prizes don't add up to 100% (10000 basis points).", async () => {
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
    await expect(
      factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        marketData.closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        [100, 200, 300]
      )
    ).to.be.revertedWith(
      "Invalid weights"
    );

    await expect(
      factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        marketData.closingTime,
        marketData.price,
        marketData.minBond,
        orderedQuestions,
        [10000, 2000, 3000]
      )
    ).to.be.revertedWith(
      "Invalid weights"
    );
  });

  it("Should allow multiple deployments.", async () => {
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
    for (let i = 0; i <= 5; i++) {
      await factory.createMarket(
        marketData.info.marketName,
        marketData.info.marketSymbol,
        creator.address,
        marketData.managementFee,
        marketData.closingTime,
        marketData.price + i,
        marketData.minBond,
        orderedQuestions,
        marketData.prizeWeights
      );
      const marketClone = await Market.attach(await factory.markets(i));
      expect(await factory.marketCount()).to.eq(BigNumber.from(i + 1));
      expect(await marketClone.price()).to.eq(
        BigNumber.from(marketData.price + i)
      );
    }
  });

  it("Should revert questions if they are not ordered by question IDs.", async () => {
    // Wrongly sort questions by Realitio's question ID.
    const unorderedQuestions = marketData.questions
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
      ) ? -1 : 1);

    await expect(factory.createMarket(
      marketData.info.marketName,
      marketData.info.marketSymbol,
      creator.address,
      marketData.managementFee,
      marketData.closingTime,
      marketData.price,
      marketData.minBond,
      unorderedQuestions,
      marketData.prizeWeights
    )).to.be.revertedWith("Questions are in incorrect order");
  });
});