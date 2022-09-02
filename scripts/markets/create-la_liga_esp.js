const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionHomevsAway, toTimestamp, SOCCER_MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./constants/teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "La Liga Santander - Jornada 5";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-09-09 15:00:00 GMT-4") - SOCCER_MATCH_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1: 09/9
    buildQuestionHomevsAway(TEAMS.ES.GIRONA, TEAMS.ES.VALLADOLID, marketName, toTimestamp("2022-09-09 15:00:00 GMT-4") + SOCCER_MATCH_DURATION),
    // Day2: 10/9
    buildQuestionHomevsAway(TEAMS.ES.RAYO_VALLECANO, TEAMS.ES.VALENCIA, marketName, toTimestamp("2022-09-10 08:00:00 GMT-4") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.ES.ESPANYOL, TEAMS.ES.SEVILLA, marketName, toTimestamp("2022-09-10 10:15:00 GMT-4") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.ES.CADIZ, TEAMS.ES.BARCELONA, marketName, toTimestamp("2022-09-10 12:30:00 GMT-4") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.ES.ATLETICO_MADRID, TEAMS.ES.CELTA_VIGO, marketName, toTimestamp("2022-09-10 15:00:00 GMT-4") + SOCCER_MATCH_DURATION),
    // Day3: 11/9
    buildQuestionHomevsAway(TEAMS.ES.REAL_MADRID, TEAMS.ES.MALLORCA, marketName, toTimestamp("2022-09-11 08:00:00 GMT-4") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.ES.ELCHE, TEAMS.ES.ATHLETIC_CLUB, marketName, toTimestamp("2022-09-11 10:15:00 GMT-4") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.ES.GETAFE, TEAMS.ES.REAL_SOCIEDAD, marketName, toTimestamp("2022-09-11 12:30:00 GMT-4") + SOCCER_MATCH_DURATION),
    buildQuestionHomevsAway(TEAMS.ES.REAL_BETIS, TEAMS.ES.VILLARREAL, marketName, toTimestamp("2022-09-11 15:00:00 GMT-4") + SOCCER_MATCH_DURATION),
    // Day4: 12/9
    buildQuestionHomevsAway(TEAMS.ES.ALMERIA, TEAMS.ES.OSASUNA, marketName, toTimestamp("2022-09-12 15:00:00 GMT-4") + SOCCER_MATCH_DURATION),
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