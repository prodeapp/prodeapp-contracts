const hre = require("hardhat");
const ethers = hre.ethers;
const { upgrades } = require("hardhat");

const params = {
  100: {
    realityRegistry: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    marketFactory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b",
    governor: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  },
  84532: {
    realityRegistry: "0x135D9d131Af9C0c7dd6F82014067D69e9E49e31e",
    marketFactory: "0xa9349d9bb7222dd984c15d57ba031a26b07b41b6",
    governor: "0xfBc28feEdb679bADBc7Fb2A7101A69e0EA63535a", // This is testnet, we don't have msig deployed
  },
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy LiquidityPool
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy();
  await liquidityPool.deployed();
  console.log("LiquidityPool deployed to:", liquidityPool.address);

  // Deploy Liquidity Factory
  const LiquidityFactory = await ethers.getContractFactory("LiquidityFactory");
  const liquidityFactory = await LiquidityFactory.deploy(
    params[chainId].marketFactory,
    liquidityPool.address,
    params[chainId].governor
  );
  await liquidityFactory.deployed();
  console.log("LiquidityFactory deployed to:", liquidityFactory.address);

  // Deploy KeyValue
  const KeyValue = await ethers.getContractFactory("KeyValue");
  const keyValue = await KeyValue.deploy();
  await keyValue.deployed();
  console.log("KeyValue deployed to:", keyValue.address);

  // Deploy MarketFactoryV2
  const MarketFactoryV2 = await ethers.getContractFactory("MarketFactoryV2");
  const marketFactoryV2 = await MarketFactoryV2.deploy(
    params[chainId].realityRegistry,
    keyValue.address,
    params[chainId].marketFactory,
    liquidityFactory.address
  );
  await marketFactoryV2.deployed();
  console.log("MarketFactoryV2 deployed to:", marketFactoryV2.address);

  console.log("");

  // async function changeProxyAdmin(
  //   proxyAddress: string,
  //   newAdmin: string,
  // ): Promise<void>
  // async function transferProxyAdminOwnership(
  //   newAdmin: string,
  // ): Promise<void>

  // npx hardhat verify --network mainnet PROXY_ADDRESS

  // Verify contracts
  await hre.run("verify:verify", {
    address: liquidityPool.address,
  });
  console.log("Verified LiquidityPool");

  await hre.run("verify:verify", {
    address: keyValue.address,
  });
  console.log("Verified KeyValue");

  await hre.run("verify:verify", {
    address: liquidityFactory.address,
    constructorArguments: [
      params[chainId].marketFactory,
      liquidityPool.address,
      params[chainId].governor,
    ],
  });
  console.log("Verified LiquidityFactory");

  await hre.run("verify:verify", {
    address: marketFactoryV2.address,
    constructorArguments: [
      params[chainId].realityRegistry,
      keyValue.address,
      params[chainId].marketFactory,
      liquidityFactory.address,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
