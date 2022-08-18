const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "FIFA World Cup Qatar 2022", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-11-19 00:00:00 UTC"),
  price: ethers.utils.parseUnits("25.0", "ether"), // 25 xDAI
  creator: "0xE0Ed01B57920D51c5421b3DBadEC8e5FB5C64Faa", // Ownable creator contract CreatorRelayer.sol
  creatorFee: 500, // 5%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    // Group A
    {
      templateID: 2, 
      question: "What will be the result of the Qatar vs Ecuador match at the FIFA World Cup Qatar 2022 group phase?␟\"Qatar\",\"Ecuador\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-20 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Senegal vs Netherlands match at the FIFA World Cup Qatar 2022 group phase?␟\"Senegal\",\"Netherlands\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-21 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Qatar vs Senegal match at the FIFA World Cup Qatar 2022 group phase?␟\"Qatar\",\"Senegal\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-25 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Ecuador vs Netherlands match at the FIFA World Cup Qatar 2022 group phase?␟\"Ecuador\",\"Netherlands\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-25 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Qatar vs Netherlands match at the FIFA World Cup Qatar 2022 group phase?␟\"Qatar\",\"Netherlands\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-29 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Senegal vs Ecuador match at the FIFA World Cup Qatar 2022 group phase?␟\"Senegal\",\"Ecuador\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-29 18:00:00 UTC")
    },
    // Group B
    {
      templateID: 2, 
      question: "What will be the result of the England vs IR Iran match at the FIFA World Cup Qatar 2022 group phase?␟\"England\",\"IR Iran\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-21 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the USA vs Wales match at the FIFA World Cup Qatar 2022 group phase?␟\"USA\",\"Wales\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-21 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs USA match at the FIFA World Cup Qatar 2022 group phase?␟\"England\",\"USA\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-25 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Wales vs IR Iran match at the FIFA World Cup Qatar 2022 group phase?␟\"Wales\",\"IR Iran\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-25 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs Wales match at the FIFA World Cup Qatar 2022 group phase?␟\"England\",\"Wales\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-29 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the USA vs IR Iran match at the FIFA World Cup Qatar 2022 group phase?␟\"USA\",\"IR Iran\",\"Draw\"␟football␟en_US", 
      openingTS:toTimestamp("2022-11-29 22:00:00 UTC")
    },
    // Group C
    {
      templateID: 2, 
      question: "What will be the result of the Argentina vs Saudi Arabia match at the FIFA World Cup Qatar 2022 group phase?␟\"Argentina\",\"Saudi Arabia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-22 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Mexico vs Poland match at the FIFA World Cup Qatar 2022 group phase?␟\"Mexico\",\"Poland\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-22 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Argentina vs Mexico match at the FIFA World Cup Qatar 2022 group phase?␟\"Argentina\",\"Mexico\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-26 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Poland vs Saudi Arabia match at the FIFA World Cup Qatar 2022 group phase?␟\"Poland\",\"Saudi Arabia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-26 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Argentina vs Poland match at the FIFA World Cup Qatar 2022 group phase?␟\"Argentina\",\"Poland\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-30 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Mexico vs Saudi Arabia match at the FIFA World Cup Qatar 2022 group phase?␟\"Mexico\",\"Saudi Arabia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-30 22:00:00 UTC")
    },
    // Group D
    {
      templateID: 2, 
      question: "What will be the result of the France vs Australia match at the FIFA World Cup Qatar 2022 group phase?␟\"France\",\"Australia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-22 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Tunisia vs Denmark match at the FIFA World Cup Qatar 2022 group phase?␟\"Tunisia\",\"Denmark\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-22 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the France vs Denmark match at the FIFA World Cup Qatar 2022 group phase?␟\"France\",\"Denmark\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-26 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Tunisia vs Australia match at the FIFA World Cup Qatar 2022 group phase?␟\"Tunisia\",\"Australia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-26 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the France vs Tunisia match at the FIFA World Cup Qatar 2022 group phase?␟\"France\",\"Tunisia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-30 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs Denmark match at the FIFA World Cup Qatar 2022 group phase?␟\"Australia\",\"Denmark\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-30 18:00:00 UTC")
    },
    // Group E
    {
      templateID: 2, 
      question: "What will be the result of the Spain vs Costa Rica match at the FIFA World Cup Qatar 2022 group phase?␟\"Spain\",\"Costa Rica\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-23 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Japan vs Germany match at the FIFA World Cup Qatar 2022 group phase?␟\"Japan\",\"Germany\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-23 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Spain vs Germany match at the FIFA World Cup Qatar 2022 group phase?␟\"Spain\",\"Germany\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-27 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Japan vs Costa Rica match at the FIFA World Cup Qatar 2022 group phase?␟\"Japan\",\"Costa Rica\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-27 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Spain vs Japan match at the FIFA World Cup Qatar 2022 group phase?␟\"Spain\",\"Japan\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-01 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Costa Rica vs Germany match at the FIFA World Cup Qatar 2022 group phase?␟\"Costa Rica\",\"Germany\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-01 22:00:00 UTC")
    },
    // Group F
    {
      templateID: 2, 
      question: "What will be the result of the Belgium vs Canada match at the FIFA World Cup Qatar 2022 group phase?␟\"Belgium\",\"Canada\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-23 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Morocco vs Croatia match at the FIFA World Cup Qatar 2022 group phase?␟\"Morocco\",\"Croatia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-23 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Belgium vs Morocco match at the FIFA World Cup Qatar 2022 group phase?␟\"Belgium\",\"Morocco\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-27 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Croatia vs Canada match at the FIFA World Cup Qatar 2022 group phase?␟\"Croatia\",\"Canada\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-27 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Belgium vs Croatia match at the FIFA World Cup Qatar 2022 group phase?␟\"Belgium\",\"Croatia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-01 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Morocco vs Canada match at the FIFA World Cup Qatar 2022 group phase?␟\"Morocco\",\"Canada\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-01 18:00:00 UTC")
    },
    // Group G
    {
      templateID: 2, 
      question: "What will be the result of the Brazil vs Serbia match at the FIFA World Cup Qatar 2022 group phase?␟\"Brazil\",\"Serbia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-24 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Switzerland vs Cameroon match at the FIFA World Cup Qatar 2022 group phase?␟\"Switzerland\",\"Cameroon\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-24 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Brazil vs Switzerland match at the FIFA World Cup Qatar 2022 group phase?␟\"Brazil\",\"Switzerland\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-28 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Serbia vs Cameroon match at the FIFA World Cup Qatar 2022 group phase?␟\"Serbia\",\"Cameroon\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-28 13:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Brazil vs Cameroon match at the FIFA World Cup Qatar 2022 group phase?␟\"Brazil\",\"Cameroon\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-02 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Switzerland vs Serbia match at the FIFA World Cup Qatar 2022 group phase?␟\"Switzerland\",\"Serbia\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-02 22:00:00 UTC")
    },
    // Group H
    {
      templateID: 2, 
      question: "What will be the result of the Portugal vs Ghana match at the FIFA World Cup Qatar 2022 group phase?␟\"Portugal\",\"Ghana\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-24 19:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Uruguay vs Korea Republic match at the FIFA World Cup Qatar 2022 group phase?␟\"Uruguay\",\"Korea Republic\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-24 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Portugal vs Uruguay match at the FIFA World Cup Qatar 2022 group phase?␟\"Portugal\",\"Uruguay\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-28 22:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Ghana vs Korea Republic match at the FIFA World Cup Qatar 2022 group phase?␟\"Ghana\",\"Korea Republic\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-11-28 16:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Portugal vs Korea Republic match at the FIFA World Cup Qatar 2022 group phase?␟\"Portugal\",\"Korea Republic\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-02 18:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Uruguay vs Ghana match at the FIFA World Cup Qatar 2022 group phase?␟\"Uruguay\",\"Ghana\",\"Draw\"␟football␟en_US", 
      openingTS: toTimestamp("2022-12-02 18:00:00 UTC")
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