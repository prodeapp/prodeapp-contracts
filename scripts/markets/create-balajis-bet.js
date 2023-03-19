const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionSingleSelectV2, toTimestamp} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const openingTs = toTimestamp("2023-07-01 00:00:00");
const marketName = `Is USD hyperinflation coming?`;
const yesNo = ['Yes', 'No'];
const btcPrice = [
  "0-5000 USD",
  ">5000-15000 USD",
  ">15000-30000 USD",
  ">30000-60000 USD",
  ">60000-120000 USD",
  ">120000-300000 USD",
  ">300000-600000 USD",
  ">600000-1M USD",
  ">1M USD",
];
const ethPrice = [
  "0-500 USD",
  ">500-1500 USD",
  ">1500-3000 USD",
  ">3000-6000 USD",
  ">6000-12000 USD",
  ">12000-30000 USD",
  ">30000-60000 USD",
  ">60000-100000 USD",
  ">100000 USD",
];
const monthlyInflation = [
  "<0%",
  "0% - 0.2%",
  ">0.2% - 0.5%",
  ">0.5% - 1%",
  ">1% - 2%",
  ">2% - 4%",
  ">4% - 8%",
  ">8%",
];

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2023-03-26 00:00:00"),
  price: ethers.utils.parseUnits("10.0", "ether"), // 10 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),  // 5 xDAI
  questions: [
    buildQuestionSingleSelectV2(`What will be the price of BTC the 2023-07-01?`, btcPrice, openingTs, 'cryptocurrency'),
    buildQuestionSingleSelectV2(`What will be the price of ETH the 2023-07-01?`, ethPrice, openingTs + 1, 'cryptocurrency'),
    buildQuestionSingleSelectV2(`What will be the monthly USD inflation rate of June 2023?`, monthlyInflation, openingTs + 2, 'cryptocurrency'),
    buildQuestionSingleSelectV2(`What will be the monthly EURO inflation rate of June 2023?`, monthlyInflation, openingTs + 3, 'cryptocurrency'),
    buildQuestionSingleSelectV2(`Will Balajis prediction about bitcoin price and USD hyperinflation fulfill?`, yesNo, openingTs + 4, 'cryptocurrency'),
  ],
  prizeWeights: [10000]
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