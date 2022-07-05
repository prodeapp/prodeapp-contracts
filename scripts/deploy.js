const hre = require("hardhat");
const ethers = hre.ethers;
const { upgrades } = require("hardhat");

const params = {
  42: {
    arbitrator: "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04",
    realityEth: "0xcB71745d032E16ec838430731282ff6c10D29Dea",
    curate: "",
    nftDescriptorGovernor: "",
    submissionTimeout: 1 * 24 * 60 * 60,
  },
  100: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    curate: "0xc96514B3ad962Ae37c2d2c0AeD627306b0418Bf7",
    nftDescriptorGovernor: "",
    submissionTimeout: 7 * 24 * 60 * 60,
  }
};

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
  const CurateProxy = await ethers.getContractFactory("CurateProxy");
  const curateProxy = await CurateProxy.deploy(params[chainId].curate);
  await curateProxy.deployed();

  // Deploy NFT Descriptor contract
  const BetNFTDescriptor = await ethers.getContractFactory("BetNFTDescriptor");
  const betNFTDescriptor = await upgrades.deployProxy(BetNFTDescriptor, [curateProxy.address]);
  await betNFTDescriptor.deployed();

  // Deploy manager contract
  const Manager = await ethers.getContractFactory("Manager");
  const manager = await Manager.deploy();
  await manager.deployed();

  // Deploy factory contract
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const marketFactory = await MarketFactory
    .deploy(
      market.address,
      params[chainId].arbitrator,
      params[chainId].realityEth,
      betNFTDescriptor.address,
      manager.address,
      deployer.address,  // TODO: update to proper Governor
      deployer.address,  // TODO: update to proper treasury
      150,
      params[chainId].submissionTimeout
    );
  await marketFactory.deployed();

  console.log("");
  console.log("Market factory address:", marketFactory.address);
  console.log("Curate proxy address:", curateProxy.address);
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
    address: market.address
  });

  await hre.run("verify:verify", {
    address: marketFactory.address,
    constructorArguments: [
      market.address,
      params[chainId].arbitrator,
      params[chainId].realityEth,
      betNFTDescriptor.address,
      manager.address,
      deployer.address,
      deployer.address,
      150,
      params[chainId].submissionTimeout
    ],
  });

  await hre.run("verify:verify", {
    address: curateProxy.address,
    constructorArguments: [
      params[chainId].curate
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });