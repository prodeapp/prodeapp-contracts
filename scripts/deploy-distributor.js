
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const Distributor = await ethers.getContractFactory("RewardsDistributor");
  const distributor = await Distributor.deploy();
  await distributor.deployed();

  console.log("Distributor address:", distributor.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: distributor.address,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });