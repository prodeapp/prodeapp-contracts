const hre = require("hardhat");
const ethers = hre.ethers;

const params = {
    42: {
        arbitrator: "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04",
        realityEth: "0xcB71745d032E16ec838430731282ff6c10D29Dea",
        curate: "",
        governor: "",
        submissionTimeout: 1 * 24 * 60 * 60,
        curateContent: "0x0000000000000000000000000000000000000000",  // TODO: Update to curate list address
        curateTechnical: "0x0000000000000000000000000000000000000000"
    },
    100: {
        arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
        realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
        curate: "0x86E72802D9AbBF7505a889721fD4D6947B02320E",
        governor: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
        submissionTimeout: 7 * 24 * 60 * 60,
        curateContent: "0x0000000000000000000000000000000000000000",  // TODO: Update to curate list address
        curateTechnical: "0x0000000000000000000000000000000000000000"
    },
    31337: {
        arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
        realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
        curate: "0x86E72802D9AbBF7505a889721fD4D6947B02320E",
        governor: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
        submissionTimeout: 7 * 24 * 60 * 60,
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
    // TODO: Change to not Mock proxy!
    const CurateProxy = await ethers.getContractFactory("CurateProxySVGMock");
    const curateProxy = await CurateProxy.deploy();
    await curateProxy.deployed();
    console.log("Curate Proxy SVG deployed at ", curateProxy.address);

    // Deploy SVG contract
    const Base64Ad = await ethers.getContractFactory("Base64Ad");
    const base64Ad = await Base64Ad.deploy();
    await base64Ad.deployed();
    console.log("Base64Ad deployed at ", base64Ad.address);

    // Deploy SVG Factory contract
    const Base64AdFactory = await ethers.getContractFactory("Base64AdFactory");
    const base64AdFactory = await Base64AdFactory.deploy(
        base64Ad.address,
        params[chainId].curateTechnical,
        params[chainId].curateContent,
        curateProxy.address
    );
    await base64AdFactory.deployed();
    console.log("Base64AdFactory deployed at ", base64AdFactory.address);

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


    if (chainId === 100) {


        // Verify contracts
        await hre.run("verify:verify", {
            address: curateProxy.address,
        });

        await hre.run("verify:verify", {
            address: base64Ad.address,
        });

        await hre.run("verify:verify", {
            address: base64AdFactory.address,
            constructorArguments: [
                base64Ad.address,
                params[chainId].curateTechnical,
                params[chainId].curateContent,
                curateProxy.address
            ],
        });

        await hre.run("verify:verify", {
            address: billing.address,
            constructorArguments: [
                params[chainId].governor,
                params[chainId].governor
            ],
        });

        await hre.run("verify:verify", {
            address: auctionContract.address,
            constructorArguments: [
                curateProxy.address,
                billing.address
            ],
        });


    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });