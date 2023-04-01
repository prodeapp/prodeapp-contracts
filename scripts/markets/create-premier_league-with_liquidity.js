const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionHomevsAwayV2, toTimestamp, SOCCER_MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "English Premier League - Matchday 30";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2023-04-08 08:00:00 GMT-3"),
  price: ethers.utils.parseUnits("4.0", "ether"), // 4 xDAI
  creatorFee: 4850,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day 1
    buildQuestionHomevsAwayV2(TEAMS.EN.MANCHESTER_UTD, TEAMS.EN.EVERTON, marketName, toTimestamp("2023-04-08 08:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.ASTON_VILLA, TEAMS.EN.NOTTINGHAM, marketName, toTimestamp("2023-04-08 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.BRENTFORD, TEAMS.EN.NEWCASTLE, marketName, toTimestamp("2023-04-08 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.FULHAM, TEAMS.EN.WEST_HAM, marketName, toTimestamp("2023-04-08 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.WOLVES, TEAMS.EN.CHELSEA, marketName, toTimestamp("2023-04-08 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.TOTTENHAM, TEAMS.EN.BRIGHTON, marketName, toTimestamp("2023-04-08 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.LEICESTER, TEAMS.EN.BOURNEMOUTH, marketName, toTimestamp("2023-04-08 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.SOUTHAMPTON, TEAMS.EN.MANCHESTER_CITY, marketName, toTimestamp("2023-04-08 13:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day 2
    buildQuestionHomevsAwayV2(TEAMS.EN.LEEDS, TEAMS.EN.CRYSTAL_PALACE, marketName, toTimestamp("2023-04-09 10:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAwayV2(TEAMS.EN.LIVERPOOL, TEAMS.EN.ARSENAL, marketName, toTimestamp("2023-04-09 12:30:00 GMT-3") + SOCCER_MATCH_DURATION),
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