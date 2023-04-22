const hre = require("hardhat");
const { getChain, F1_RACE_DURATION, buildQuestionSingleSelectV2, toTimestamp, buildQuestionPositionV2, buildQuestionTeamMostPointsV2, orderQuestionsV2, buildQuestionMultipleSelectV2 } = require("./helpers");
const { TEAMS } = require("./constants/teams");
const { DRIVERS } = require("./constants/drivers");
const { ENGINES } = require("./constants/f1_engines");
const { TIRES } = require("./constants/f1_tires");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "F1 Azerbaijan Grand Prix 2023";
const allDrivers = Object.values(DRIVERS.F1);
const allEngines = Object.values(ENGINES.F1);
const allTires = Object.values(TIRES.F1);
const allTeams = Object.values(TEAMS.F1);
const closingTime = toTimestamp("2023-04-28 10:00:00 GMT-3") - F1_RACE_DURATION  // A few hours before practice 2 or Qualifying if sprint.
const qualyTS = toTimestamp("2023-04-28 10:00:00 GMT-3") + F1_RACE_DURATION  // time where the qualy questions can be answered
const sprintTS = toTimestamp("2023-04-29 10:30:00 GMT-3") + F1_RACE_DURATION  // time where the sprint questions can be answered
const raceTS = toTimestamp("2023-04-30 08:00:00 GMT-3") + F1_RACE_DURATION  // time where the questions can be answered
const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: closingTime,
  price: ethers.utils.parseUnits("3.0", "ether"), // 5 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 4850,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    buildQuestionSingleSelectV2(`Who will set the fastest time in the Q3 at ${marketName}?`, allDrivers, qualyTS, 'F1'),
    buildQuestionSingleSelectV2(`Who will finish in the position #1 at ${marketName} sprint race?`, allDrivers, sprintTS, 'F1'), // Only if Sprint in race
    buildQuestionPositionV2(1, allDrivers, marketName, raceTS),
    buildQuestionPositionV2(2, allDrivers, marketName, raceTS + 1),
    buildQuestionPositionV2(3, allDrivers, marketName, raceTS + 2),
    buildQuestionSingleSelectV2(`Who will get the fastest lap time at ${marketName}?`, allDrivers, raceTS + 3, 'F1'),
    buildQuestionSingleSelectV2(`Who will be the driver of the day at ${marketName}?`, allDrivers, raceTS + 4, 'F1'),
    buildQuestionMultipleSelectV2(`Wich engine will score the most points at ${marketName}?`, allEngines, raceTS + 5, 'F1'),
    buildQuestionSingleSelectV2(`Which tires type has the race's winner at the ${marketName} race end??`, allTires, raceTS + 6, 'F1'),
    buildQuestionSingleSelectV2(`Which driver will receive the DHL Fastest Pit Stop award at ${marketName}?`, allDrivers, raceTS + 7, 'F1'),
    buildQuestionTeamMostPointsV2(allTeams, marketName, raceTS + 8),
  ],
  prizeWeights: [6000, 4000]
};

const liquidityParameters = {
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 0,
  betMultiplier: "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
  pointsToWin: marketData.questions.length,
};


async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

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
  const marketFactoryV2 = MarketFactoryV2.attach(chainConfig.factoryV2);
  const [marketAddress, LPAddress] = await marketFactoryV2.createMarketWithLiquidityPool(
    marketData.marketName,
    marketData.marketSymbol,
    marketData.creatorFee,
    marketData.closingTime,
    marketData.price,
    marketData.minBond,
    orderedQuestions,
    marketData.prizeWeights,
    liquidityParameters
  );
  console.log(marketAddress, LPAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });