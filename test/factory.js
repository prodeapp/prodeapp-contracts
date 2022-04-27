const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { solidity } = require('ethereum-waffle');
use(solidity);

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
    timeout: 1800,
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
    await factory.createTournament(
      tournamentData.info,
      tournamentData.closingTime,
      tournamentData.price,
      tournamentData.managementFee,
      creator.address,
      tournamentData.timeout,
      tournamentData.minBond,
      tournamentData.questions,
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
        {
          arbitrator: arbitrator.address,
          timeout: tournamentData.timeout,
          minBond: tournamentData.minBond
        },
        tournamentData.questions,
        tournamentData.prizeWeights
      )
    ).to.be.revertedWith("Already initialized");
  });

  it("Should revert if tournament's prizes don't add up to 100% (10000 basis points).", async () => {
    await expect(
      factory.createTournament(
        tournamentData.info,
        tournamentData.closingTime,
        tournamentData.price,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
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
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        [10000, 2000, 3000]
      )
    ).to.be.revertedWith(
      "Invalid weights"
    );
  });

  it("Should allow multiple deployments.", async () => {
    for (let i = 0; i <= 5; i++) {
      await factory.createTournament(
        tournamentData.info,
        tournamentData.closingTime,
        tournamentData.price + i,
        tournamentData.managementFee,
        creator.address,
        tournamentData.timeout,
        tournamentData.minBond,
        tournamentData.questions,
        tournamentData.prizeWeights
      );
      const tournamentClone = await Tournament.attach(await factory.tournaments(i));
      expect(await factory.tournamentCount()).to.eq(BigNumber.from(i + 1));
      expect(await tournamentClone.price()).to.eq(
        BigNumber.from(tournamentData.price + i)
      );
    }
  });
});