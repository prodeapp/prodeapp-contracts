const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "FIFA World Cup Qatar 2022 - Positions", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-11-19 00:00:00 UTC"),
  price: ethers.utils.parseUnits("25.0", "ether"), // 25 xDAI
  creator: "0xE0Ed01B57920D51c5421b3DBadEC8e5FB5C64Faa", // Ownable creator contract CreatorRelayer.sol
  creatorFee: 500, // 6%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    {
      templateID: 2, 
      question: "How far will Qatar go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Ecuador go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Senegal go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Netherlands go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will England go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Iran go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will USA go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Wales go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Argentina go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Saudi Arabia go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Mexico go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Poland go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will France go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Australia go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Denmark go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Tunisa go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Spain go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Costa Rica go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Germany go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Japan go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Belgium go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Canada go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Morocco go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Croatia go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Brazil go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Serbia go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Switzerland go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Cameroon go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Portugal go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Ghana go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will Uruguay go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "How far will South Korea go in the FIFA World Cup Qatar 2022?␟\"Champion\",\"Runner-up\",\"Third Place\",\"Fourth Place\",\"Quarterfinals\",\"Round of 16\",\"Eliminated in Group Phase\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    }
  ],
  prizeWeights: [7500, 2500]
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