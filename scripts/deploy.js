
const hre = require("hardhat");
const ethers = hre.ethers;

const params = {
  42: {
    arbitrator: "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04",
    realityEth: "0xcB71745d032E16ec838430731282ff6c10D29Dea",
    submissionTimeout: 1 * 24 * 60 * 60,
  },
  100: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    submissionTimeout: 7 * 24 * 60 * 60,
  }
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy Tournament contract implementation
  const Tournament = await ethers.getContractFactory("Tournament");
  const tournament = await Tournament.deploy();

  // Deploy factory contract
  const TournamentFactory = await ethers.getContractFactory("TournamentFactory");
  const tournamentFactory = await TournamentFactory
    .deploy(
      tournament.address,
      params[chainId].arbitrator,
      params[chainId].realityEth,
      params[chainId].submissionTimeout
    );

  console.log("Tournament factory address:", tournamentFactory.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: tournament.address
  });

  await hre.run("verify:verify", {
    address: tournamentFactory.address,
    constructorArguments: [
      tournament.address,
      params[chainId].arbitrator,
      params[chainId].realityEth,
      params[chainId].submissionTimeout
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });