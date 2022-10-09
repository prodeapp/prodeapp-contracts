const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "FIFA World Cup Qatar 2022 - Simplified", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-11-19 12:00:00 UTC"),
  price: ethers.utils.parseUnits("2.0", "ether"), // 2 xDAI
  creator: "0xa3954B4aDB7caca9C188c325CF9F2991AbB3cF71", // UBIBurner
  creatorFee: 300, // 3%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    // Group A
    {
      templateID: 2, 
      question: "Who will be the winner of group A at the FIFA World Cup Qatar 2022?␟\"Netherlands\",\"Senegal\",\"Ecuador\",\"Qatar\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group A at the FIFA World Cup Qatar 2022?␟\"Netherlands\",\"Senegal\",\"Ecuador\",\"Qatar\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group B
    {
      templateID: 2, 
      question: "Who will be the winner of group B at the FIFA World Cup Qatar 2022?␟\"England\",\"USA\",\"Wales\",\"IR Iran\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group B at the FIFA World Cup Qatar 2022?␟\"England\",\"USA\",\"Wales\",\"IR Iran\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group C
    {
      templateID: 2, 
      question: "Who will be the winner of group C at the FIFA World Cup Qatar 2022?␟\"Argentina\",\"Mexico\",\"Poland\",\"Saudi Arabia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group C at the FIFA World Cup Qatar 2022?␟\"Argentina\",\"Mexico\",\"Poland\",\"Saudi Arabia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group D
    {
      templateID: 2, 
      question: "Who will be the winner of group D at the FIFA World Cup Qatar 2022?␟\"France\",\"Denmark\",\"Tunisia\",\"Australia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group D at the FIFA World Cup Qatar 2022?␟\"France\",\"Denmark\",\"Tunisia\",\"Australia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group E
    {
      templateID: 2, 
      question: "Who will be the winner of group E at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Germany\",\"Japan\",\"Costa Rica\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group E at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Germany\",\"Japan\",\"Costa Rica\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group F
    {
      templateID: 2, 
      question: "Who will be the winner of group F at the FIFA World Cup Qatar 2022?␟\"Belgium\",\"Canada\",\"Croatia\",\"Morocco\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group F at the FIFA World Cup Qatar 2022?␟\"Belgium\",\"Canada\",\"Croatia\",\"Morocco\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group G
    {
      templateID: 2, 
      question: "Who will be the winner of group G at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group G at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Group H
    {
      templateID: 2, 
      question: "Who will be the winner of group H at the FIFA World Cup Qatar 2022?␟\"Portugal\",\"Uruguay\",\"Ghana\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will be the runner-up of group H at the FIFA World Cup Qatar 2022?␟\"Portugal\",\"Uruguay\",\"Ghana\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 00:00:00 UTC")
    },
    // Round of 16
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#49) between 1A and 2B at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#50) between 1C and 2D at the FIFA World Cup Qatar 2022?␟\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-03 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#51) between 1B and 2A at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-04 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#52) between 1D and 2C at the FIFA World Cup Qatar 2022?␟\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-04 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#53) between 1E and 2F at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-05 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#54) between 1G and 2H at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-05 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#55) between 1F and 2E at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-06 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#56) between 1H and 2G at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-06 22:00:00 UTC")
    },
    // Quarter-finals
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#57) between #49 and #50 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#58) between #53 and #54 winners at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-09 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#59) between #51 and #52 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#60) between #55 and #56 winners at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-10 18:00:00 UTC")
    },
    // Semi-finals
    {
      templateID: 2, 
      question: "Who will win the semi-finals match (#61) between #57 and #58 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-13 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the semi-finals match (#62) between #59 and #60 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-14 22:00:00 UTC")
    },
    // Finals
    {
      templateID: 2, 
      question: "Who will win the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-18 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the third place match at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
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