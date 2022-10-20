const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "Messi vs Maradona in World Cups", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-11-19 00:00:00 UTC"),
  price: ethers.utils.parseUnits("1.0", "ether"), // 1 xDAI
  creator: "", // Fork DAO address
  creatorFee: 400, // 4%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    {
      templateID: 2, 
      question: "Will Messi score more goals in FWC Qatar 2022 than Maradona (5 goals) in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi make more assists in FWC Qatar 2022 than Maradona (5 assists) in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi have more goal involvements in FWC Qatar 2022 than Maradona (10 assists & goals) in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi win the Adidas Golden Ball Award in FWC Qatar 2022?␟\"Yes\",\"No\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Argentina win the FIFA World Cup Qatar 2022?␟\"Yes\",\"No\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi be fouled more times in FWC Qatar 2022 than Maradona in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },,
    {
      templateID: 2, 
      question: "Will Messi achieve more successful take-ons in FWC Qatar 2022 than Maradona in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi accumulate more goals in World Cups than Maradona after FWC Qatar 2022?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi accumulate more assists in World Cups than Maradona after FWC Qatar 2022?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi win an award as goalscorer at the FIFA World Cup Qatar 2022?␟\"Golden Boot\",\"Silver Boot\",\"Bronze Boot\",\"No Award\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi provoke more cards in FWC Qatar 2022 than Maradona (12) in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi score at least 1 free kick goal at the FIFA World Cup Qatar 2022?␟\"Yes\",\"No\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi score at least 1 goal in the knockout phase matches at the FIFA World Cup Qatar 2022?␟\"Yes\",\"No\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Will Messi score more goals in knockout phase matches in FWC Qatar 2022 than Maradona (4 goals) in FWC Mexico 1986?␟\"Yes\",\"No\",\"Tie\"␟football␟en_US", 
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