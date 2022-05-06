
const hre = require("hardhat");
const ethers = hre.ethers;

const burners = {
  42: [],
  100: [
    "0x1db3439a222c519ab44bb1144fc28167b4fa6ee6", // vitalik
    "0x2A52309eDF998799C4A8b89324CCAd91848c8676", // siri
    "0x5700f03f87db485fdb90e18b3100f00b235886f1", // ruben
    "0x2ad91063e489cc4009df7fee45c25c8be684cf6a", // juanu
    "0xfd1af514b8b2bf00d1999497668bff26ccdf4c8a", // clement
    "0xc9534a59ef121516e5e1aead8d45d151e768e216", // koki
    "0xa4657b898dd70ef3a4874430bea42e8602847fd9", // nanni
    "0x1f5fae0615ee87196f229ea19d726d58846bdc0e" // rodri
  ]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Deploy Tournament contract implementation
  const GnosisUBIBurner = await ethers.getContractFactory("GnosisUBIBurner");
  const gnosisUBIBurner = await GnosisUBIBurner.deploy(
    burners[chainId]
  );
  await gnosisUBIBurner.deployed();

  console.log("GnosisUBIBurner address:", gnosisUBIBurner.address);

  // Verify contracts
  await hre.run("verify:verify", {
    address: gnosisUBIBurner.address,
    constructorArguments: [
      burners[chainId]
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });