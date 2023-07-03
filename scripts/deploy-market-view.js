
const hre = require("hardhat");
const {getChain} = require("./markets/helpers.js")
const ethers = hre.ethers;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();
  const chainConfig = getChain(chainId);

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const MarketView = await ethers.getContractFactory("MarketView");
  const marketView = await MarketView.deploy(chainConfig.realityRegistry, chainConfig.keyvalue, chainConfig.liquidityFactory);
  await marketView.deployed();

  console.log("MarketView address:", marketView.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: marketView.address,
    constructorArguments: [chainConfig.realityRegistry, chainConfig.keyvalue, chainConfig.liquidityFactory],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });