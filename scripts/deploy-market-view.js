
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const MarketView = await ethers.getContractFactory("MarketView");
  const marketView = await MarketView.deploy();
  await marketView.deployed();

  console.log("MarketView address:", marketView.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: marketView.address,
    constructorArguments: [],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });