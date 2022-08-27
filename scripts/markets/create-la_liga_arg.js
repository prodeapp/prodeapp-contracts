const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionHomevsAway, SOCCER_MATCH_DURATION, toTimestamp} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "La Liga - Torneo Binance 2022 - Fecha #17";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-09-01 20:00:00 GMT-3") - SOCCER_MATCH_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0xa3954B4aDB7caca9C188c325CF9F2991AbB3cF71", // UBIBurner
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1:
    buildQuestionHomevsAway(TEAMS.AR.HURACAN, TEAMS.AR.CENTRAL_CORDOBA, marketName, toTimestamp("2022-09-01 20:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day2:
    buildQuestionHomevsAway(TEAMS.AR.PATRONATO, TEAMS.AR.UNION, marketName, toTimestamp("2022-09-02 19:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.ROSARIO_CENTRAL, TEAMS.AR.TALLERES, marketName, toTimestamp("2022-09-02 21:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.LANUS, TEAMS.AR.TIGRE, marketName, toTimestamp("2022-09-02 21:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day3:
    buildQuestionHomevsAway(TEAMS.AR.ALDOSIVI, TEAMS.AR.SARMIENTO, marketName, toTimestamp("2022-09-03 15:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.VELEZ, TEAMS.AR.NEWELLS, marketName, toTimestamp("2022-09-03 15:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.RACING, TEAMS.AR.ARGENTINOS_JUNIORS, marketName, toTimestamp("2022-09-03 18:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.GIMNASIA_LP, TEAMS.AR.INDEPENDIENTE, marketName, toTimestamp("2022-09-03 20:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day4:
    buildQuestionHomevsAway(TEAMS.AR.PLATENSE, TEAMS.AR.ESTUDIANTES_LP, marketName, toTimestamp("2022-09-04 15:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.COLON, TEAMS.AR.BOCA_JUNIORS, marketName, toTimestamp("2022-09-04 18:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.RIVER, TEAMS.AR.BARRACAS_CENTRAL, marketName, toTimestamp("2022-09-04 20:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day 5:
    buildQuestionHomevsAway(TEAMS.AR.DEFENSA_JUSTICIA, TEAMS.AR.SAN_LORENZO, marketName, toTimestamp("2022-09-05 19:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.GODOY_CRUZ, TEAMS.AR.ARSENAL, marketName, toTimestamp("2022-09-05 19:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.AR.ATLETICO_TUCUMAN, TEAMS.AR.BANFIELD, marketName, toTimestamp("2022-09-05 21:30:00 GMT-3") + SOCCER_MATCH_DURATION),
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