const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionHomevsAwayV2, toTimestamp, SOCCER_MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "La Liga - Torneo Binance 2023 - Fecha #10";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2023-04-07 18:00:00 GMT-3"),
  price: ethers.utils.parseUnits("2.0", "ether"), // 2 xDAI
  creatorFee: 4850,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1:
    buildQuestionHomevsAwayV2(TEAMS.AR.PLATENSE, TEAMS.AR.INSTITUTO, marketName, toTimestamp("2023-04-07 19:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.LANUS, TEAMS.AR.ARSENAL, marketName, toTimestamp("2023-04-07 19:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.TALLERES, TEAMS.AR.BARRACAS_CENTRAL, marketName, toTimestamp("2023-04-07 21:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.VELEZ, TEAMS.AR.BANFIELD, marketName, toTimestamp("2023-04-07 21:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day3:
    buildQuestionHomevsAwayV2(TEAMS.AR.SARMIENTO, TEAMS.AR.ARGENTINOS_JUNIORS, marketName, toTimestamp("2023-04-08 15:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.UNION, TEAMS.AR.BELGRANO, marketName, toTimestamp("2023-04-08 18:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.GIMNASIA_LP, TEAMS.AR.RACING, marketName, toTimestamp("2023-04-08 18:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.DEFENSA_JUSTICIA, TEAMS.AR.CENTRAL_CORDOBA, marketName, toTimestamp("2023-04-08 20:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.ATLETICO_TUCUMAN, TEAMS.AR.SAN_LORENZO, marketName, toTimestamp("2023-04-08 20:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day4:
    buildQuestionHomevsAwayV2(TEAMS.AR.GODOY_CRUZ, TEAMS.AR.TIGRE, marketName, toTimestamp("2023-04-09 14:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.INDEPENDIENTE, TEAMS.AR.ESTUDIANTES_LP, marketName, toTimestamp("2023-04-09 14:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.NEWELLS, TEAMS.AR.ROSARIO_CENTRAL, marketName, toTimestamp("2023-04-09 16:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.HURACAN, TEAMS.AR.RIVER, marketName, toTimestamp("2023-04-09 19:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.AR.BOCA_JUNIORS, TEAMS.AR.COLON, marketName, toTimestamp("2023-04-09 21:30:00 GMT-3") + SOCCER_MATCH_DURATION),
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