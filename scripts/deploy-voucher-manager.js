const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy VoucherManager contract implementation
  const VoucherManager = await ethers.getContractFactory("VoucherManager");
  const voucherManager = await VoucherManager.deploy();
  await voucherManager.deployed();

  console.log("VoucherManager address:", voucherManager.address);

  await voucherManager.whitelistMarketFactory("0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b");

  // Verify contracts
  await hre.run("verify:verify", {
    address: voucherManager.address
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });