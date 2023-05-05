const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionHomevsAwayV2, toTimestamp, SOCCER_MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "La Liga Santander - Jornada 28";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2023-04-07 15:00:00 GMT-3"),
  price: ethers.utils.parseUnits("6.0", "ether"), // 6 xDAI
  creatorFee: 4850,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1:
    buildQuestionHomevsAwayV2(TEAMS.ES.SEVILLA, TEAMS.ES.CELTA_VIGO, marketName, toTimestamp("2023-04-07 16:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day2:
    buildQuestionHomevsAwayV2(TEAMS.ES.OSASUNA, TEAMS.ES.ELCHE, marketName, toTimestamp("2023-04-08 09:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.ES.ESPANYOL, TEAMS.ES.ATHLETIC_CLUB, marketName, toTimestamp("2023-04-08 11:15:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.ES.REAL_SOCIEDAD, TEAMS.ES.GETAFE, marketName, toTimestamp("2023-04-08 13:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.ES.REAL_MADRID, TEAMS.ES.VILLARREAL, marketName, toTimestamp("2023-04-08 16:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day3:
    buildQuestionHomevsAwayV2(TEAMS.ES.VALLADOLID, TEAMS.ES.MALLORCA, marketName, toTimestamp("2023-04-09 09:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.ES.REAL_BETIS, TEAMS.ES.CADIZ, marketName, toTimestamp("2023-04-09 11:15:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.ES.ALMERIA, TEAMS.ES.VALENCIA, marketName, toTimestamp("2023-04-09 13:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.ES.RAYO_VALLECANO, TEAMS.ES.ATLETICO_MADRID, marketName, toTimestamp("2023-04-09 16:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day4
    buildQuestionHomevsAwayV2(TEAMS.ES.BARCELONA, TEAMS.ES.GIRONA, marketName, toTimestamp("2023-04-10 16:00:00 GMT-3") + SOCCER_MATCH_DURATION),
  ],
  prizeWeights: [8000, 2000]
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
  const marketFactoryV2 = await MarketFactoryV2.attach(chainConfig.factoryV2);
  await marketFactoryV2.createMarketWithLiquidityPool(
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });