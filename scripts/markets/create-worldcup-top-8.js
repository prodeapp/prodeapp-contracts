const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "FIFA World Cup Qatar 2022 - Top 8", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-12-09 14:00:00 UTC"),
  price: ethers.utils.parseUnits("2.0", "ether"), // 2 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300, // 3%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    // Netherlands vs. Argentina
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (before penalty shootout) between Netherlands and Argentina at the FIFA World Cup Qatar 2022?␟\"Netherlands\",\"Argentina\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score Netherlands at the quarter-finals match (before penalty shootout) between Netherlands and Argentina at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score Argentina at the quarter-finals match (before penalty shootout) between Netherlands and Argentina at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 22:00:00 UTC")
    },
    // Croatia vs. Brazil
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (before penalty shootout) between Croatia and Brazil at the FIFA World Cup Qatar 2022?␟\"Croatia\",\"Brazil\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score Croatia at the quarter-finals match (before penalty shootout) between Croatia and Brazil at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score Brazil at the quarter-finals match (before penalty shootout) between Croatia and Brazil at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 18:00:00 UTC")
    },
    // England vs. France
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (before penalty shootout) between England and France at the FIFA World Cup Qatar 2022?␟\"England\",\"France\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score England at the quarter-finals match (before penalty shootout) between England and France at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score France at the quarter-finals match (before penalty shootout) between England and France at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 22:00:00 UTC")
    },
    // Spain vs. Portugal
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (before penalty shootout) between Spain and Portugal at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Portugal\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score Spain at the quarter-finals match (before penalty shootout) between Spain and Portugal at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How many goals will score Portugal at the quarter-finals match (before penalty shootout) between Spain and Portugal at the FIFA World Cup Qatar 2022?␟\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\">7\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 18:00:00 UTC")
    },
    // Finals
    {
      templateID: 2, 
      question: "Who will win the FIFA World Cup Qatar 2022?␟\"Netherlands\",\"England\",\"Argentina\",\"France\",\"Spain\",\"Croatia\",\"Brazil\",\"Portugal\",␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will get the second place at the FIFA World Cup Qatar 2022?␟\"Netherlands\",\"England\",\"Argentina\",\"France\",\"Spain\",\"Croatia\",\"Brazil\",\"Portugal\",␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the third place match at the FIFA World Cup Qatar 2022?␟\"Netherlands\",\"England\",\"Argentina\",\"France\",\"Spain\",\"Croatia\",\"Brazil\",\"Portugal\",␟football␟en_US", 
      openingTS: toTimestamp("2022-12-17 18:00:00 UTC")
    }
  ],
  prizeWeights: [6000, 3000, 1000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const chainConfig = getChain(chainId);

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