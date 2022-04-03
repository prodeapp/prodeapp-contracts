const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Tournament contract", function () {
  beforeEach(async function () {

    // Deploy arbitrator
    const _Arbitrator = await ethers.getContractFactory("Arbitrator");
    const arbitrator = await _Arbitrator.deploy();
    this.arbitrator = arbitrator;
    // console.log("Arbitrator Address: ", arbitrator.address)

    // Deploy Realitio
    const realityEth = await ethers.getContractFactory("Realitio");
    const realitio = await realityEth.deploy();
    this.realitio = realitio;
    // console.log("Realitio Address: ", realitio.address)

    // Deploy a Tournament contract
    const Tournament = await ethers.getContractFactory("Tournament");
    const tournament = await Tournament.deploy("FIFA WORLD CUP 2022", arbitrator.address, realitio.address);
    this.tournament = tournament;
    // console.log("Tournament Deployed with address", tournament.address)
  });

  it("Deployment of a tournamnet should assign realityEth contract and Kleros arbitrator", async function () {
    expect(await this.tournament.started()).to.equals(false);
    expect(await this.tournament.arbitrator()).to.equals(this.arbitrator.address);
    expect(await this.tournament.realitio()).to.equals(this.realitio.address);
  });

  it("Revert if trying to start tournament without games", async function() {
    await expect(this.tournament.startTournament()).to.revertedWith("At least one match it's needed to start");
  });

  it("Create a game and start tournament", async function () {
    await this.tournament.createGame("Argentina", "Brasil", 1649017598);
    const gameID = await this.tournament.gamesCount();
    const game = await this.tournament.games(gameID);
    expect(game.home).to.equals("Argentina");
    expect(game.away).to.equals("Brasil");
    expect(game.minEnd).to.equals(1649017598);
    expect(game.questionID).to.not.be.empty;
    expect(await this.tournament.started()).to.equal(false);

    await this.tournament.startTournament();
    expect(await this.tournament.started()).to.equal(true);
  });
});