const arbitrator = "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04";
const realityEth = "0xcB71745d032E16ec838430731282ff6c10D29Dea";

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const Tournament = await ethers.getContractFactory("Tournament");
    const tournament = await Tournament.deploy("FIFA WORLD CUP 2022", arbitrator, realityEth);
  
    console.log("Tournament address:", tournament.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });