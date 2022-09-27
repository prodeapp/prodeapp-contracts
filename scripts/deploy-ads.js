const hre = require("hardhat");
const ethers = hre.ethers;

const params = {
    42: {
        governor: "",
        curateContent: "0x0000000000000000000000000000000000000000",  // TODO: Update to curate list address
        curateTechnical: "0x0000000000000000000000000000000000000000"
    },
    100: {
        governor: "",
        curateContent: "0x76D159faDCDE966d68885b7267Ce42F4F655238D",  // TODO: Update to curate list address
        curateTechnical: "0x6E6Bc2032d5A19728Aeb30f06507e7Cb43e4bBFD"
    },
    31337: {
        governor: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
        curateContent: "0x0000000000000000000000000000000000000000",  // TODO: Update to curate list address
        curateTechnical: "0x0000000000000000000000000000000000000000"
    }
};


async function main() {
    const chainId = hre.network.config.chainId;
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    console.log("Chain Id:", chainId);

    // Curate SVG Proxy
    const CurateProxy = await ethers.getContractFactory("CurateProxySVG");
    const curateProxy = await CurateProxy.deploy(
        params[chainId].curateTechnical,
        params[chainId].curateContent
    );
    await curateProxy.deployed();
    console.log("Curate Proxy SVG deployed at ", curateProxy.address);

    // Deploy SVG contract
    const SVG = await ethers.getContractFactory("SVG");
    const svg = await SVG.deploy();
    await svg.deployed();
    console.log("SVG deployed at ", svg.address);

    // Deploy SVG Factory contract
    const SVGFactory = await ethers.getContractFactory("SVGFactory");
    const svgFactory = await SVGFactory.deploy(
        svg.address,
        params[chainId].curateTechnical,
        params[chainId].curateContent,
        curateProxy.address
    );
    await svgFactory.deployed();
    console.log("SVGFactory deployed at ", svgFactory.address);

    // Deploy Billing contract
    const Billing = await ethers.getContractFactory("Billing");
    const billing = await Billing.deploy(params[chainId].governor, params[chainId].governor);
    await billing.deployed();
    console.log("Billing deployed at ", billing.address);

    // Deploy NFT Descriptor contract
    const FirstPriceAuction = await ethers.getContractFactory("FirstPriceAuction");
    const auctionContract = await FirstPriceAuction.deploy(curateProxy.address, billing.address);
    await auctionContract.deployed();
    console.log("Auction deployed at ", auctionContract.address);

    const verifyCurate = `npx hardhat verify --network gnosis ${curateProxy.address} "${params[chainId].curateTechnical}" "${params[chainId].curateContent}"`;
    const verifyAd = `npx hardhat verify --network gnosis ${svg.address}`;
    const verifyFactory = `npx hardhat verify --network gnosis ${svgFactory.address} "${svg.address}" "${params[chainId].curateTechnical}" "${params[chainId].curateContent}" "${curateProxy.address}"`;
    const verifyBilling = `npx hardhat verify --network gnosis ${billing.address} "${params[chainId].governor}" "${params[chainId].governor}"`;
    const verifyAuction = `npx hardhat verify --network gnosis ${auctionContract.address} "${curateProxy.address}" "${billing.address}"`;
    console.log("");
    console.log("Run the following to verify the contracts");
    console.log();
    console.log(`${verifyCurate} && ${verifyAd} && ${verifyFactory} && ${verifyBilling} && ${verifyAuction}`);
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });