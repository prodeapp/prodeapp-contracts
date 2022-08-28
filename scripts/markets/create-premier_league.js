const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionHomevsAway, toTimestamp, SOCCER_MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "English Premier League - Matchday 4";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-08-27 08:30:00 GMT-3") - SOCCER_MATCH_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1: 27/8
    buildQuestionHomevsAway(TEAMS.EN.SOUTHAMPTON, TEAMS.EN.MANCHESTER_UTD, marketName, toTimestamp("2022-08-27 08:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.BRENTFORD, TEAMS.EN.EVERTON, marketName, toTimestamp("2022-08-27 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.BRIGHTON, TEAMS.EN.LEEDS, marketName, toTimestamp("2022-08-27 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.CHELSEA, TEAMS.EN.LEICESTER, marketName, toTimestamp("2022-08-27 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.LIVERPOOL, TEAMS.EN.BOURNEMOUTH, marketName, toTimestamp("2022-08-27 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.MANCHESTER_CITY, TEAMS.EN.CRYSTAL_PALACE, marketName, toTimestamp("2022-08-27 11:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.ARSENAL, TEAMS.EN.FULHAM, marketName, toTimestamp("2022-08-27 13:30:00 GMT-3") + SOCCER_MATCH_DURATION),
    // Day2: 28/8
    buildQuestionHomevsAway(TEAMS.EN.ASTON_VILLA, TEAMS.EN.WEST_HAM, marketName, toTimestamp("2022-08-28 10:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.WOLVES, TEAMS.EN.NEWCASTLE, marketName, toTimestamp("2022-08-28 10:00:00 GMT-3") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.EN.NOTTINGHAM, TEAMS.EN.TOTTENHAM, marketName, toTimestamp("2022-08-28 12:30:00 GMT-3") + SOCCER_MATCH_DURATION),
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