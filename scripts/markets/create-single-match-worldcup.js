const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionSingleSelect, toTimestamp, soccer_MATCH_DURATION, SOCCER_MATCH_DURATION} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "Argentina vs Mexico - FIFA World Cup Qatar 2022 - Group Stage";

const player = 'Messi';
const teams = ['Argentina', 'Mexico']
const teamsDraw = teams.concat('Draw');
const teamsNone = teams.concat('None');
const yesNo = ['Yes', 'No'];
const yesNoDraw = yesNo.concat('Draw')
const openingTs = toTimestamp("2022-11-26 16:00:00 GMT-3") + SOCCER_MATCH_DURATION;

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: openingTs - SOCCER_MATCH_DURATION,
  price: ethers.utils.parseUnits("2.0", "ether"), // 2 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),  // 5 xDAI
  questions: [
    buildQuestionSingleSelect(`What will be the result of ${marketName}?`, teamsDraw, openingTs, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} or ${teams[1]} win the match after trailing by at least one gol at ${marketName}?`, yesNo, openingTs + 1, 'soccer'),
    buildQuestionSingleSelect(`Will ${player} score a goal at ${marketName}?`, yesNo, openingTs + 2, 'soccer'),
    buildQuestionSingleSelect(`A goal at ${marketName} will be annulled due to a VAR decision?`, yesNo, openingTs + 3, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} or ${teams[1]} score a goal in the extra time at ${marketName}?`, yesNo, openingTs + 4, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} or ${teams[1]} score a goal from a free kick at ${marketName}?`, yesNo, openingTs + 5, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} or ${teams[1]} score a goal with the head at ${marketName}?`, yesNo, openingTs + 6, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} or ${teams[1]} score a penalty goal at ${marketName}?`, yesNo, openingTs + 7, 'soccer'),
    buildQuestionSingleSelect(`Which team will receive more yellow cards at ${marketName}?`, teamsNone, openingTs + 8, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} receive more yellow cards than ${teams[1]} at ${marketName}?`, yesNoDraw, openingTs + 9, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[0]} receive at least one red card at ${marketName}?`, yesNo, openingTs + 10, 'soccer'),
    buildQuestionSingleSelect(`Will ${teams[1]} receive at least one red card at ${marketName}?`, yesNo, openingTs + 11, 'soccer'),
    
    
  ],
  prizeWeights: [8000, 2000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);
  console.log(marketData)
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