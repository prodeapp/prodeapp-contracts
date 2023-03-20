const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionPosition, buildQuestionTeamMostPoints, F1_RACE_DURATION, buildQuestionSingleSelect, buildQuestionMultipleSelect, toTimestamp, orderQuestionsV2} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const { DRIVERS } = require("./constants/drivers");
const { ENGINES } = require("./constants/f1_engines");
const { TIRES } = require("./constants/f1_tires");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "F1 Rolex Australian Grand Prix 2023";
const allDrivers = Object.values(DRIVERS.F1);
const allEngines = Object.values(ENGINES.F1);
const allTires = Object.values(TIRES.F1);
const allTeams = Object.values(TEAMS.F1);
const closingTime = toTimestamp("2023-03-31 02:00:00 GMT-3") - F1_RACE_DURATION  // A few hours before practice 2.
const qualyTS = toTimestamp("2023-04-02 02:00:00 GMT-3") + F1_RACE_DURATION  // time where the qualy questions can be answered
const raceTS = toTimestamp("2023-04-02 02:00:00 GMT-3") + F1_RACE_DURATION  // time where the questions can be answered
const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: closingTime,
  price: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    buildQuestionSingleSelect(`Who will set the fastest time in the Q3 at ${marketName}?`, allDrivers, qualyTS, 'F1'),
    buildQuestionPosition(1, allDrivers, marketName, raceTS),
    buildQuestionPosition(2, allDrivers, marketName, raceTS+1),
    buildQuestionPosition(3, allDrivers, marketName, raceTS+2),
    buildQuestionSingleSelect(`Who will get the fastest lap time at ${marketName}?`, allDrivers, raceTS+3, 'F1'),
    buildQuestionSingleSelect(`Who will be the driver of the day at ${marketName}?`, allDrivers, raceTS+4, 'F1'),
    buildQuestionMultipleSelect(`Wich engine will score the most points at ${marketName}?`, allEngines, raceTS+5, 'F1'),
    buildQuestionSingleSelect(`Which tires type has the race's winner at the ${marketName} race end??`, allTires, raceTS+6, 'F1'),
    buildQuestionSingleSelect(`Which driver will receive the DHL Fastest Pit Stop award at ${marketName}?`, allDrivers, raceTS+7, 'F1'),
    buildQuestionTeamMostPoints(allTeams, marketName, raceTS+8),
  ],
  prizeWeights: [5000, 3500, 1500]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);
  console.log(marketData)

  const chainConfig = getChain(chainId);
  // Sort questions by Realitio's question ID.
  const orderedQuestions = orderQuestionsV2(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  const MarketFactoryV2 = await ethers.getContractFactory("MarketFactoryV2");
  const marketFactoryv2 = MarketFactoryV2.attach(chainConfig.factoryV2);
  await marketFactoryv2.createMarket(
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