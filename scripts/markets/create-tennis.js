const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionSingleSelect, toTimestamp, TENNIS_MATCH_DURATION} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "US Open 2022 Men's Singles Final";

const players = ['Alcaraz', 'Ruud'];
const playersDraw = players.concat('Draw');
const playersNone = players.concat('None');
const yesNo = ['Yes', 'No'];

const openingTs = toTimestamp("2022-09-11 17:00:00 GMT-3");

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: openingTs - 60 * 60 * 2,
  price: ethers.utils.parseUnits("1.0", "ether"), // 1 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),  // 1 xDAI
  questions: [
    buildQuestionSingleSelect(`Who will win the ${marketName}?`, players, openingTs + TENNIS_MATCH_DURATION, 'tennis'),
    buildQuestionSingleSelect(`Will ${players[0]} or ${players[1]} win the match after trailing by at least one set at the ${marketName}?`, yesNo, openingTs + TENNIS_MATCH_DURATION + 1, 'tennis'),
    buildQuestionSingleSelect(`How many sets will be played at the ${marketName}?`, [3, 4, 5], openingTs + TENNIS_MATCH_DURATION + 2, 'tennis'),
    buildQuestionSingleSelect(`Who will have more aces at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 3, 'tennis'),
    buildQuestionSingleSelect(`Who will have more double faults at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 4, 'tennis'),
    buildQuestionSingleSelect(`Who will win more first serve points while serving at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 5, 'tennis'),
    buildQuestionSingleSelect(`Who will win more second serve points while serving at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 6, 'tennis'),
    buildQuestionSingleSelect(`Who will win more break points at the ${marketName}?`, playersNone, openingTs + TENNIS_MATCH_DURATION + 7, 'tennis'),
    buildQuestionSingleSelect(`Who breaks serve first at the ${marketName}?`, playersNone, openingTs + TENNIS_MATCH_DURATION + 8, 'tennis'),
    buildQuestionSingleSelect(`Who will hit more winners at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 9, 'tennis'),
    buildQuestionSingleSelect(`Who will have more unforced errors at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 10, 'tennis'),
    buildQuestionSingleSelect(`Who will have more forced errors at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 11, 'tennis'),
    buildQuestionSingleSelect(`Who will win the most points at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 12, 'tennis'),
    buildQuestionSingleSelect(`Will ${players[0]} or ${players[1]} win at least one set 6-0 at the ${marketName}?`, yesNo, openingTs + TENNIS_MATCH_DURATION + 13, 'tennis'),
    buildQuestionSingleSelect(`Who will cover more distance at the ${marketName}?`, playersDraw, openingTs + TENNIS_MATCH_DURATION + 14, 'tennis'),
  ],
  prizeWeights: [8000, 2000]
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