const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionHomevsAway, SOCCER_MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "England Premier League - Matchday 1";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: 1659726000 - SOCCER_MATCH_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1: 5/8
    buildQuestionHomevsAway(TEAMS.EN.CRYSTAL_PALACE, TEAMS.EN.ARSENAL, marketName, 1659726000 + SOCCER_MATCH_DURATION), // 16hs Arg Time
    // Day2: 6/8
    buildQuestionHomevsAway(TEAMS.EN.FULHAM, TEAMS.EN.LIVERPOOL, marketName, 1659785400 + SOCCER_MATCH_DURATION), // 08:30hs Arg Time
    buildQuestionHomevsAway(TEAMS.EN.BOURNEMOUTH, TEAMS.EN.ASTON_VILLA, marketName, 1659794400 + SOCCER_MATCH_DURATION), // 11hs Arg Time
    buildQuestionHomevsAway(TEAMS.EN.LEEDS, TEAMS.EN.WOLVES, marketName, 1659794400 + SOCCER_MATCH_DURATION), // 11hs Arg Time
    buildQuestionHomevsAway(TEAMS.EN.NEWCASTLE, TEAMS.EN.NOTTINGHAM, marketName, 1659794400 + SOCCER_MATCH_DURATION), // 11Hs Arg time
    buildQuestionHomevsAway(TEAMS.EN.TOTTENHAM, TEAMS.EN.SOUTHAMPTON, marketName, 1659794400 + SOCCER_MATCH_DURATION), // 11hs Arg Time
    buildQuestionHomevsAway(TEAMS.EN.EVERTON, TEAMS.EN.CHELSEA, marketName, 1659801600 + SOCCER_MATCH_DURATION), // 13:30hs Arg Time
    // Day3: 7/8
    buildQuestionHomevsAway(TEAMS.EN.LEICESTER, TEAMS.EN.BRENTFORD, marketName, 1659877200 + SOCCER_MATCH_DURATION), // 10hs Arg Time
    buildQuestionHomevsAway(TEAMS.EN.MANCHESTER_UTD, TEAMS.EN.BRIGHTON, marketName, 1659877200 + SOCCER_MATCH_DURATION), // 10hs Arg Time
    buildQuestionHomevsAway(TEAMS.EN.WEST_HAM, TEAMS.EN.MANCHESTER_CITY, marketName, 1659886200 + SOCCER_MATCH_DURATION), // 12:30hs Arg Time
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