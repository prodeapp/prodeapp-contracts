const hre = require("hardhat");
const ethers = hre.ethers;
const { upgrades } = require("hardhat");

const params = {
  100: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    curate: "0x86E72802D9AbBF7505a889721fD4D6947B02320E",
    governor: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
    submissionTimeout: 7 * 24 * 60 * 60,
  },
  84532: {
    arbitrator: "",
    realityEth: "0x135D9d131Af9C0c7dd6F82014067D69e9E49e31e",
    curate: "",
    governor: "0xfBc28feEdb679bADBc7Fb2A7101A69e0EA63535a", // This is testnet, we don't have msig deployed
    submissionTimeout: 7 * 24 * 60 * 60,
  },
};

const protocolFee = 150;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy Market contract implementation
  const Market = await ethers.getContractFactory("Market");
  const market = await Market.deploy();
  await market.deployed();

  // Deploy Curate Proxy contract
  let curateProxy;
  if (params[chainId].curate) {
    const CurateProxy = await ethers.getContractFactory("CurateProxy");
    const curateProxy = await CurateProxy.deploy(params[chainId].curate);
    await curateProxy.deployed();
  }

  // Deploy NFT Descriptor contract
  const BetNFTDescriptor = await ethers.getContractFactory("BetNFTDescriptor");
  const betNFTDescriptor = await upgrades.deployProxy(BetNFTDescriptor, [
    curateProxy ? curateProxy.address : ethers.constants.AddressZero,
  ]);
  await betNFTDescriptor.deployed();

  // Deploy manager contract
  const Manager = await ethers.getContractFactory("Manager");
  const manager = await Manager.deploy();
  await manager.deployed();

  // Deploy factory contract
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    market.address,
    params[chainId].arbitrator ? params[chainId].arbitrator : ethers.constants.AddressZero,
    params[chainId].realityEth,
    betNFTDescriptor.address,
    manager.address,
    params[chainId].governor, // governor
    params[chainId].governor, // treasury
    protocolFee,
    params[chainId].submissionTimeout
  );
  await marketFactory.deployed();

  console.log("");
  console.log("Market factory address:", marketFactory.address);
  if (params[chainId].curate) console.log("Curate proxy address:", curateProxy.address);
  console.log("Manager address:", manager.address);
  console.log("NFT descriptor address:", betNFTDescriptor.address);
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
    address: market.address,
  });

  await hre.run("verify:verify", {
    address: betNFTDescriptor.address,
    constructorArguments: [
      params[chainId].curate ? curateProxy.address : ethers.constants.AddressZero,
    ],
  });

  await hre.run("verify:verify", {
    address: manager.address,
  });

  await hre.run("verify:verify", {
    address: marketFactory.address,
    constructorArguments: [
      market.address,
      params[chainId].arbitrator ? params[chainId].arbitrator : ethers.constants.AddressZero,
      params[chainId].realityEth,
      betNFTDescriptor.address,
      manager.address,
      params[chainId].governor, // governor
      params[chainId].governor, // treasury
      protocolFee,
      params[chainId].submissionTimeout,
    ],
  });

  if (params[chainId].curate) {
    await hre.run("verify:verify", {
      address: curateProxy.address,
      constructorArguments: [params[chainId].curate],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
