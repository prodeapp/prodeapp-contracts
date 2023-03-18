const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestionSingleSelect, toTimestamp} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const openingTs = toTimestamp("2023-07-01 00:00:00");
const marketName = `Is hyperinflation coming?`;
const yesNo = ['Yes', 'No'];
const btcPrice = [
  "0-5000 USD",
  "5001-15000 USD",
  "15001-30000 USD",
  "30001-60000 USD",
  "60001-120000 USD",
  "120001-300000 USD",
  "300001-600000 USD",
  "600001-1M USD",,
  ">1M USD",
];
const ethPrice = [
  "0-500 USD",
  "501-1500 USD",
  "1501-3000 USD",
  "3001-6000 USD",
  "6001-12000 USD",
  "12001-30000 USD",
  "30001-60000 USD",
  "60001-100000 USD",,
  "100000 USD",
];
const monthlyInflation = [
  "<0%",
  "0%-0.2%",
  "0.2%-0.5%",
  "0.5%-1%",
  "1%-2%",
  "2%-4%",
  "4%-8%",
  ">8%",
];


const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2023-03-24 00:00:00"),
  price: ethers.utils.parseUnits("10.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),  // 5 xDAI
  questions: [
    buildQuestionSingleSelect(`What will be the price of BTC the 2023-07-01?`, btcPrice, openingTs, 'cryptocurrency'),
    buildQuestionSingleSelect(`What will be the price of ETH the 2023-07-01?`, ethPrice, openingTs, 'cryptocurrency'),
    buildQuestionSingleSelect(`What will be USD inflation rate of June 2023?`, monthlyInflation, openingTs, 'cryptocurrency'),
    buildQuestionSingleSelect(`What will be EURO inflation rate of June 2023?`, monthlyInflation, openingTs, 'cryptocurrency'),
    buildQuestionSingleSelect(`Will Balajis prediction fullfill?`, yesNo, openingTs, 'cryptocurrency'),
    buildQuestionSingleSelect(`Will Balajis pay if he was wrong?`, yesNo, openingTs, 'cryptocurrency'),
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