
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const REALITY_REGISTRY = '0xad3aa4da922ab968d8e9733ecf32699756970193'
  const KEY_VALUE = '0x47C255D92F6e800312835f08f7906Bc9019a210C'
  const LIQUIDITY_FACTORY = '0x6bbe06d775445f052b9684d98f80161921e67d2a'
  const MARKET_FACTORY = '0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b'

  const MarketView = await ethers.getContractFactory("MarketView");
  const marketView = await MarketView.deploy(
    REALITY_REGISTRY,
    KEY_VALUE,
    LIQUIDITY_FACTORY,
    MARKET_FACTORY
  );
  await marketView.deployed();

  console.log("MarketView address:", marketView.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: marketView.address,
    constructorArguments: [
      REALITY_REGISTRY,
      KEY_VALUE,
      LIQUIDITY_FACTORY,
      MARKET_FACTORY
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });