const hre = require("hardhat");
const ethers = hre.ethers;

const params = {
  100: {
    realityRegistry: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    keyValue: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b",
    LiquidityFactory: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
    marketFactory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b",
  },
  84532: {
    realityRegistry: "0x135D9d131Af9C0c7dd6F82014067D69e9E49e31e",
    keyValue: "0xb15AE0549AFe3634acc5c871BfE548cAEdC08561",
    LiquidityFactory: "0x771BCa25Cd778A5A4520EDb8faDF7eF2aACc6c49",
    marketFactory: "0xd3246af138e7e5fff220856c735fbaaa860086b8",
  },
};
async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const MarketView = await ethers.getContractFactory("MarketView");
  const marketView = await MarketView.deploy(
    params[chainId].realityRegistry,
    params[chainId].keyValue,
    params[chainId].LiquidityFactory,
    params[chainId].marketFactory
  );
  await marketView.deployed();

  console.log("MarketView address:", marketView.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: marketView.address,
    constructorArguments: [
      params[chainId].realityRegistry,
      params[chainId].keyValue,
      params[chainId].LiquidityFactory,
      params[chainId].marketFactory,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
