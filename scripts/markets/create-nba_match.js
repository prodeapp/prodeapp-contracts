const hre = require("hardhat");
const {getChain, buildQuestionSingleSelectV2, toTimestamp, BASKET_MATCH_DURATION, orderQuestionsV2} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const teams = ['Warriors', 'Lakers']
const matchTs = toTimestamp("2023-05-02 23:00:00 GMT-3")
const openingTs = matchTs + BASKET_MATCH_DURATION;
const marketName = `NBA Playoffs 2023 - ${teams[0]} vs ${teams[1]} - Game 1`;
const teamsDraw = teams.concat('Draw');
const yesNo = ['Yes', 'No'];


const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: matchTs,  // can bet until the beggining of the match
  price: ethers.utils.parseUnits("1.0", "ether"), // 1 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),  // 5 xDAI
  questions: [
    buildQuestionSingleSelectV2(`What will be the result of ${marketName}?`, teams, openingTs, 'basketball'),
    buildQuestionSingleSelectV2(`Will ${teams[0]} score more than 110 points at ${marketName}?`, yesNo, openingTs+1, 'basketball'),
    buildQuestionSingleSelectV2(`Will ${teams[1]} score more than 110 points at ${marketName}?`, yesNo, openingTs+2, 'basketball'),
    buildQuestionSingleSelectV2(`Which team will lead at the end of the first quarter in the ${marketName}?`, teamsDraw, openingTs+3, 'basketball'),
    buildQuestionSingleSelectV2(`Which team will lead at the end of half-time in the ${marketName}?`, teamsDraw, openingTs+4, 'basketball'),
    buildQuestionSingleSelectV2(`Which team will lead at the end of the third quarter in the ${marketName}?`, teamsDraw, openingTs+5, 'basketball'),
    buildQuestionSingleSelectV2(`Will the handicap at the end of the game be greater than 4.5 in the ${marketName}?`, yesNo, openingTs+6, 'basketball'),
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
  const orderedQuestions = orderQuestionsV2(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  const MarketFactoryV2 = await ethers.getContractFactory("MarketFactoryV2");
  const marketFactoryV2 = await MarketFactoryV2.attach(chainConfig.factoryV2);

  await marketFactoryV2.createMarket(
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