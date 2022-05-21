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

describe("TournamentFactory", () => {
  let governor;
  let creator;
  let other;

  let arbitrator;
  let realitio;
  let factory;
  let Tournament;
  
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

  it("Should not be possibe to initialize a Tournament instance twice.", async () => {
    // Sort questions by Realitio's question ID.
    const timeout = 129600; // 1.5 days
    const questionsIDs = tournamentData.questions
      .map((questionData) => getQuestionID(
        questionData.templateID,
        questionData.openingTS,
        questionData.question,
        arbitrator.address,
        timeout,
        tournamentData.minBond,
        realitio.address,
        factory.address,
      )
    ).sort();
    const orderedQuestions = tournamentData.questions
      .sort((a, b) => getQuestionID(
          a.templateID,
          a.openingTS,
          a.question,
          arbitrator.address,
          timeout,
          tournamentData.minBond,
          realitio.address,
          factory.address,
        ) > getQuestionID(
          b.templateID,
          b.openingTS,
          b.question,
          arbitrator.address,
          timeout,
          tournamentData.minBond,
          realitio.address,
          factory.address,
        ) ? 1 : -1);

    await factory.createTournament(
      tournamentData.info,
      tournamentData.closingTime,
      tournamentData.price,
      tournamentData.managementFee,
      creator.address,
      tournamentData.minBond,
      orderedQuestions,
      tournamentData.prizeWeights
    );
    const tournamentAddress = await factory.tournaments(0);
    const tournament = await Tournament.attach(tournamentAddress);
    await expect(
      tournament.initialize(
        tournamentData.info,
        realitio.address,
        tournamentData.closingTime,
        tournamentData.price,
        0,
        tournamentData.managementFee,
        creator.address,
        questionsIDs,
        tournamentData.prizeWeights
      )
    ).to.be.revertedWith("Already initialized");
  });

  it("Should revert if tournament's prizes don't add up to 100% (10000 basis points).", async () => {
    // Sort questions by Realitio's question ID.
    const timeout = 129600; // 1.5 days
    const orderedQuestions = tournamentData.questions
      .sort((a, b) => getQuestionID(
          a.templateID,
          a.openingTS,
          a.question,
          arbitrator.address,
          timeout,
          tournamentData.minBond,
          realitio.address,
          factory.address,
        ) > getQuestionID(
          b.templateID,
          b.openingTS,
          b.question,
          arbitrator.address,
          timeout,
          tournamentData.minBond,
          realitio.address,
          factory.address,
        ) ? 1 : -1);
    await expect(
      factory.createTournament(
        tournamentData.info,
        tournamentData.closingTime,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.minBond,
        orderedQuestions,
        [100, 200, 300]
      )
    ).to.be.revertedWith(
      "Invalid weights"
    );

    await expect(
      factory.createTournament(
        tournamentData.info,
        tournamentData.closingTime,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.minBond,
        orderedQuestions,
        [10000, 2000, 3000]
      )
    ).to.be.revertedWith(
      "Invalid weights"
    );
  });

  it("Should allow multiple deployments.", async () => {
    // Sort questions by Realitio's question ID.
    const timeout = 129600; // 1.5 days
    const orderedQuestions = tournamentData.questions
      .sort((a, b) => getQuestionID(
          a.templateID,
          a.openingTS,
          a.question,
          arbitrator.address,
          timeout,
          tournamentData.minBond,
          realitio.address,
          factory.address,
        ) > getQuestionID(
          b.templateID,
          b.openingTS,
          b.question,
          arbitrator.address,
          timeout,
          tournamentData.minBond,
          realitio.address,
          factory.address,
        ) ? 1 : -1);
    for (let i = 0; i <= 5; i++) {
      await factory.createTournament(
        tournamentData.info,
        tournamentData.closingTime,
        tournamentData.price + i,
        tournamentData.managementFee,
        creator.address,
        tournamentData.minBond,
        orderedQuestions,
        tournamentData.prizeWeights
      );
      const tournamentClone = await Tournament.attach(await factory.tournaments(i));
      expect(await factory.tournamentCount()).to.eq(BigNumber.from(i + 1));
      expect(await tournamentClone.price()).to.eq(
        BigNumber.from(tournamentData.price + i)
      );
    }
  });

  it("Should revert questions are not ordered by question IDs.", async () => {
    // Sort questions by Realitio's question ID.
    await expect(factory.createTournament(
      tournamentData.info,
      tournamentData.closingTime,
      tournamentData.price,
      tournamentData.managementFee,
      creator.address,
      tournamentData.minBond,
      tournamentData.questions,
      tournamentData.prizeWeights
    )).to.be.revertedWith("Questions are in incorrect order");
  });
});