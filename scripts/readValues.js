const { ethers } = require("hardhat");

const arbitrator = "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04";
const realityEth = "0xcB71745d032E16ec838430731282ff6c10D29Dea";

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log(await ethers.provider.getCode("0x67CCFa83C0740Ea57C2552cb3a2f06bffE291D30"))
    // const Tournament = await ethers.getContractFactory("Tournament");
    // const tournament = await Tournament.attach("0x67CCFa83C0740Ea57C2552cb3a2f06bffE291D30");
  
    // console.log("Tournament address:", tournament.address);
    // console.log(await tournament.started());
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });