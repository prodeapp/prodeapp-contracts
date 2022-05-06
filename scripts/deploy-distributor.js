
const hre = require("hardhat");
const ethers = hre.ethers;

const recipients = {
  42: [],
  100: []
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy Tournament contract implementation
  const Distributor = await ethers.getContractFactory("Distributor");
  const distributor = await Distributor.deploy(recipients[chainId]);
  await distributor.deployed();

  console.log("Distributor address:", distributor.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: distributor.address,
    constructorArguments: [
      recipients[chainId]
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });