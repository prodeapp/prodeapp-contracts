const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionPosition, buildQuestionTeamMostPoints, F1_RACE_DURATION} = require("./helpers");
const {TEAMS} = require("./teams");
const { DRIVERS } = require("./drivers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "F1 2022 Hungary Grand Prix";
const allDrivers = Object.values(DRIVERS.F1);
const allTeams = Object.values(TEAMS.F1);
const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: 1659726000 - F1_RACE_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    buildQuestionPosition(1, allDrivers, marketName, 1659272400 + F1_RACE_DURATION), // 10hs Arg Time
    buildQuestionPosition(2, allDrivers, marketName, 1659272400 + F1_RACE_DURATION), // 10hs Arg Time
    buildQuestionPosition(3, allDrivers, marketName, 1659272400 + F1_RACE_DURATION), // 10hs Arg Time
    buildQuestionPosition(4, allDrivers, marketName, 1659272400 + F1_RACE_DURATION), // 10hs Arg Time
    buildQuestionPosition(5, allDrivers, marketName, 1659272400 + F1_RACE_DURATION), // 10hs Arg Time
    buildQuestionTeamMostPoints(allTeams, marketName, 1659272400 + F1_RACE_DURATION), // 10hs Arg Time
        
  ],
  prizeWeights: [5000, 3500, 1500]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const chainConfig = getChain(chainId);
  // Sort questions by Realitio's question ID.
  const orderedQuestions = orderQuestions(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = MarketFactory.attach(chainConfig.factory);
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