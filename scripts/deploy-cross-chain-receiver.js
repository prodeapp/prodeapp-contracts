
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy Tournament contract implementation
  const GnosisChainReceiver = await ethers.getContractFactory("GnosisChainReceiver");
  const gnosisChainReceiver = await GnosisChainReceiver.deploy();
  await gnosisChainReceiver.deployed();

  console.log("GnosisChainReceiver address:", gnosisChainReceiver.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: gnosisChainReceiver.address,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });