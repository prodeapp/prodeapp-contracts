const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionHomevsAway, SOCCER_MATCH_DURATION, toTimestamp} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "La Liga - Torneo Binance 2022 - Fecha #16";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-08-26 21:00:00 UTC") - SOCCER_MATCH_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0xa3954B4aDB7caca9C188c325CF9F2991AbB3cF71", // UBIBurner
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1:
    buildQuestionHomevsAway(TEAMS.AR.CENTRAL_CORDOBA, TEAMS.AR.LANUS, marketName, toTimestamp("2022-08-26 21:00:00 UTC") + SOCCER_MATCH_DURATION), // 20hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.ARSENAL, TEAMS.AR.HURACAN, marketName, toTimestamp("2022-08-27 00:00:00 UTC") + SOCCER_MATCH_DURATION), // 20hs Arg Time
    // Day2:
    buildQuestionHomevsAway(TEAMS.AR.SAN_LORENZO, TEAMS.AR.ROSARIO_CENTRAL, marketName, toTimestamp("2022-08-27 16:00:00 UTC") + SOCCER_MATCH_DURATION), // 15:30hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.BANFIELD, TEAMS.AR.DEFENSA_JUSTICIA, marketName, toTimestamp("2022-08-27 18:30:00 UTC") + SOCCER_MATCH_DURATION), // 18hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.NEWELLS, TEAMS.AR.GODOY_CRUZ, marketName, toTimestamp("2022-08-27 18:30:00 UTC") + SOCCER_MATCH_DURATION), // 20:30hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.TALLERES, TEAMS.AR.RACING, marketName, toTimestamp("2022-08-27 21:00:00 UTC") + SOCCER_MATCH_DURATION), // 20:30Hs Arg time
    buildQuestionHomevsAway(TEAMS.AR.ARGENTINOS_JUNIORS, TEAMS.AR.PLATENSE, marketName, toTimestamp("2022-08-27 21:00:00 UTC") + SOCCER_MATCH_DURATION), // 13hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.TIGRE, TEAMS.AR.RIVER, marketName, toTimestamp("2022-08-27 23:30:00 UTC") + SOCCER_MATCH_DURATION), // 13hs Arg Time
    // Day3:
    buildQuestionHomevsAway(TEAMS.AR.SARMIENTO, TEAMS.AR.GIMNASIA_LP, marketName, toTimestamp("2022-08-28 16:00:00 UTC") + SOCCER_MATCH_DURATION), // 15:30hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.INDEPENDIENTE, TEAMS.AR.VELEZ, marketName, toTimestamp("2022-08-28 18:30:00 UTC") + SOCCER_MATCH_DURATION), // 18:00hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.BOCA_JUNIORS, TEAMS.AR.ATLETICO_TUCUMAN, marketName, toTimestamp("2022-08-28 21:00:00 UTC") + SOCCER_MATCH_DURATION), // 20:30hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.ESTUDIANTES_LP, TEAMS.AR.PATRONATO, marketName, toTimestamp("2022-08-28 23:30:00 UTC") + SOCCER_MATCH_DURATION), // 19hs Arg Time
    buildQuestionHomevsAway(TEAMS.AR.UNION, TEAMS.AR.ALDOSIVI, marketName, toTimestamp("2022-08-28 23:30:00 UTC") + SOCCER_MATCH_DURATION), // 19hs Arg Time
    // Day4:
    buildQuestionHomevsAway(TEAMS.AR.BARRACAS_CENTRAL, TEAMS.AR.COLON, marketName, toTimestamp("2022-08-29 18:30:00 UTC") + SOCCER_MATCH_DURATION), // 21:30hs Arg Time
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