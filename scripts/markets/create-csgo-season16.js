const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "ESL Pro League Season 16 - Team Performance", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-08-31 00:00:00 UTC"),
  price: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  creator: "0xa3954B4aDB7caca9C188c325CF9F2991AbB3cF71", // GnosisUBIBurner
  creatorFee: 300, // 3%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    {
      templateID: 2, 
      question: "How far will Natus Vincere go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Ninjas in Pyjamas go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Team Vitality go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Fnatic go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Team Spirit go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Endpoint go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will FaZe Clan go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will G2 Esports go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will BIG go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Outsiders go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will MIBR go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will FTW Esports go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will ENCE go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Heroic go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Astralis go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will MOUZ go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Complexity go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will HEET go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Cloud9 go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Movistar Riders go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Team Liquid go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will FURIA Esports go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Evil Geniuses go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Eternal Fire go in the ESL Pro League Season 16?␟\"Champion\",\"Runner-up\",\"Semifinals\",\"Quarterfinals\",\"Round of 12\",\"Eliminated in Group Phase\"␟esports␟en_US", 
      openingTS: toTimestamp("2022-09-27 00:00:00 UTC")
    }
  ],
  prizeWeights: [6000, 3000, 1000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const chainConfig = getChain(chainId);

  const orderedQuestions = orderQuestions(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.attach(chainConfig.factory);
  await marketFactory.createMarket(
    marketData.marketName,
    marketData.marketSymbol,
    marketData.creator,
    marketData.creatorFee,
    marketData.closingTime,
    marketData.price,
    marketData.minBond,
    orderedQuestions,
    marketData.prizeWeights
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });