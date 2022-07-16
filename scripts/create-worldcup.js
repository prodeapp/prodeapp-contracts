const hre = require("hardhat");
const ethers = hre.ethers;

const params = {
  42: {
    arbitrator: "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04",
    realityEth: "0xcB71745d032E16ec838430731282ff6c10D29Dea",
    factory: ""
  },
  100: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    factory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b"
  }
};

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "FIFA World Cup Qatar 2022", 
  marketSymbol: "PRODE",
  closingTime: 1668988800, // 2022-11-21 00:00:00
  price: ethers.utils.parseUnits("25.0", "ether"), // 25 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Group A
    {
      templateID: 2, 
      question: "What will be the result of the Qatar vs Ecuador match at the FIFA World Cup Qatar 2022 group phase?␟\"Qatar\",\"Ecuador\",\"Draw\"␟football␟en_US", 
      openingTS: 1669057200 // 19 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Senegal vs Netherlands match at the FIFA World Cup Qatar 2022 group phase?␟\"Senegal\",\"Netherlands\",\"Draw\"␟football␟en_US", 
      openingTS: 1669035600 // 13 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Qatar vs Senegal match at the FIFA World Cup Qatar 2022 group phase?␟\"Qatar\",\"Senegal\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Ecuador vs Netherlands match at the FIFA World Cup Qatar 2022 group phase?␟\"Ecuador\",\"Netherlands\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Qatar vs Netherlands match at the FIFA World Cup Qatar 2022 group phase?␟\"Qatar\",\"Netherlands\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Senegal vs Ecuador match at the FIFA World Cup Qatar 2022 group phase?␟\"Senegal\",\"Ecuador\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group B
    {
      templateID: 2, 
      question: "What will be the result of the England vs IR Iran match at the FIFA World Cup Qatar 2022 group phase?␟\"England\",\"IR Iran\",\"Draw\"␟football␟en_US", 
      openingTS: 1669046400 // 16 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the USA vs Wales match at the FIFA World Cup Qatar 2022 group phase?␟\"USA\",\"Wales\",\"Draw\"␟football␟en_US", 
      openingTS: 1669068000 // 22 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs Wales match at the FIFA World Cup Qatar 2022 group phase?␟\"England\",\"Wales\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the USA vs IR Iran match at the FIFA World Cup Qatar 2022 group phase?␟\"USA\",\"IR Iran\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs USA match at the FIFA World Cup Qatar 2022 group phase?␟\"England\",\"USA\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Wales vs IR Iran match at the FIFA World Cup Qatar 2022 group phase?␟\"Wales\",\"IR Iran\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group C
    {
      templateID: 2, 
      question: "What will be the result of the Argentina vs Saudi Arabia match at the FIFA World Cup Qatar 2022 group phase?␟\"Argentina\",\"Saudi Arabia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669122000 // 13 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Mexico vs Poland match at the FIFA World Cup Qatar 2022 group phase?␟\"Mexico\",\"Poland\",\"Draw\"␟football␟en_US", 
      openingTS: 1669143600 // 19 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Argentina vs Poland match at the FIFA World Cup Qatar 2022 group phase?␟\"Argentina\",\"Poland\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Mexico vs Saudi Arabia match at the FIFA World Cup Qatar 2022 group phase?␟\"Mexico\",\"Saudi Arabia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Argentina vs Mexico match at the FIFA World Cup Qatar 2022 group phase?␟\"Argentina\",\"Mexico\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Poland vs Saudi Arabia match at the FIFA World Cup Qatar 2022 group phase?␟\"Poland\",\"Saudi Arabia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group D
    {
      templateID: 2, 
      question: "What will be the result of the France vs Denmark match at the FIFA World Cup Qatar 2022 group phase?␟\"France\",\"Denmark\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Tunisa vs Australia match at the FIFA World Cup Qatar 2022 group phase?␟\"Tunisa\",\"Australia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the France vs Australia match at the FIFA World Cup Qatar 2022 group phase?␟\"France\",\"Australia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669154400 // 22 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Tunisa vs Denmark match at the FIFA World Cup Qatar 2022 group phase?␟\"Tunisa\",\"Denmark\",\"Draw\"␟football␟en_US", 
      openingTS: 1669132800 // 16 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the France vs Tunisa match at the FIFA World Cup Qatar 2022 group phase?␟\"France\",\"Tunisa\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs Denmark match at the FIFA World Cup Qatar 2022 group phase?␟\"Australia\",\"Denmark\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group E
    {
      templateID: 2, 
      question: "What will be the result of the Spain vs Germany match at the FIFA World Cup Qatar 2022 group phase?␟\"Spain\",\"Germany\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Japan vs Costa Rica match at the FIFA World Cup Qatar 2022 group phase?␟\"Japan\",\"Costa Rica\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Spain vs Costa Rica match at the FIFA World Cup Qatar 2022 group phase?␟\"Spain\",\"Costa Rica\",\"Draw\"␟football␟en_US", 
      openingTS: 1669230000 // 19 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Japan vs Germany match at the FIFA World Cup Qatar 2022 group phase?␟\"Japan\",\"Germany\",\"Draw\"␟football␟en_US", 
      openingTS: 1669219200 // 16 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Spain vs Japan match at the FIFA World Cup Qatar 2022 group phase?␟\"Spain\",\"Japan\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Costa Rica vs Germany match at the FIFA World Cup Qatar 2022 group phase?␟\"Costa Rica\",\"Germany\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group F
    {
      templateID: 2, 
      question: "What will be the result of the Belgium vs Canada match at the FIFA World Cup Qatar 2022 group phase?␟\"Belgium\",\"Canada\",\"Draw\"␟football␟en_US", 
      openingTS: 1669240800 // 22 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Morocco vs Croatia match at the FIFA World Cup Qatar 2022 group phase?␟\"Morocco\",\"Croatia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669208400 // 13 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Belgium vs Croatia match at the FIFA World Cup Qatar 2022 group phase?␟\"Belgium\",\"Croatia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Morocco vs Canada match at the FIFA World Cup Qatar 2022 group phase?␟\"Morocco\",\"Canada\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Belgium vs Morocco match at the FIFA World Cup Qatar 2022 group phase?␟\"Belgium\",\"Morocco\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Croatia vs Canada match at the FIFA World Cup Qatar 2022 group phase?␟\"Croatia\",\"Canada\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group G
    {
      templateID: 2, 
      question: "What will be the result of the Brazil vs Serbia match at the FIFA World Cup Qatar 2022 group phase?␟\"Brazil\",\"Serbia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669327200 // 22 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Switzerland vs Cameroon match at the FIFA World Cup Qatar 2022 group phase?␟\"Switzerland\",\"Cameroon\",\"Draw\"␟football␟en_US", 
      openingTS: 1669294800 // 13 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Brazil vs Cameroon match at the FIFA World Cup Qatar 2022 group phase?␟\"Brazil\",\"Cameroon\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Switzerland vs Serbia match at the FIFA World Cup Qatar 2022 group phase?␟\"Switzerland\",\"Serbia\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Brazil vs Switzerland match at the FIFA World Cup Qatar 2022 group phase?␟\"Brazil\",\"Switzerland\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Serbia vs Cameroon match at the FIFA World Cup Qatar 2022 group phase?␟\"Serbia\",\"Cameroon\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Group H
    {
      templateID: 2, 
      question: "What will be the result of the Portugal vs Ghana match at the FIFA World Cup Qatar 2022 group phase?␟\"Portugal\",\"Ghana\",\"Draw\"␟football␟en_US", 
      openingTS: 1669316400 // 19 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Uruguay vs Korea Republic match at the FIFA World Cup Qatar 2022 group phase?␟\"Uruguay\",\"Korea Republic\",\"Draw\"␟football␟en_US", 
      openingTS: 1669305600 // 16 UTC
    },
    {
      templateID: 2, 
      question: "What will be the result of the Portugal vs Korea Republic match at the FIFA World Cup Qatar 2022 group phase?␟\"Portugal\",\"Korea Republic\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Uruguay vs Ghana match at the FIFA World Cup Qatar 2022 group phase?␟\"Uruguay\",\"Ghana\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Portugal vs Uruguay match at the FIFA World Cup Qatar 2022 group phase?␟\"Portugal\",\"Uruguay\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "What will be the result of the Ghana vs Korea Republic match at the FIFA World Cup Qatar 2022 group phase?␟\"Ghana\",\"Korea Republic\",\"Draw\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Round of 16
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#49) between 1A and 2B at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#50) between 1C and 2D at the FIFA World Cup Qatar 2022?␟\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#51) between 1B and 2A at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#52) between 1D and 2C at the FIFA World Cup Qatar 2022?␟\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#53) between 1E and 2F at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#54) between 1G and 2H at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#55) between 1F and 2E at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the round of 16 match (#56) between 1H and 2G at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Quarter-finals
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#57) between #49 and #50 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#58) between #53 and #54 winners at the FIFA World Cup Qatar 2022?␟\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#59) between #51 and #52 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the quarter-finals match (#60) between #55 and #56 winners at the FIFA World Cup Qatar 2022?␟\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Semi-finals
    {
      templateID: 2, 
      question: "Who will win the semi-finals match (#61) between #57 and #58 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the semi-finals match (#62) between #59 and #60 winners at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    },
    // Finals
    {
      templateID: 2, 
      question: "Who will win the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    },
    {
      templateID: 2, 
      question: "Who will win the third place play-off at the FIFA World Cup Qatar 2022?␟\"Qatar\",\"Ecuador\",\"Senegal\",\"Netherlands\",\"England\",\"IR Iran\",\"USA\",\"Wales\",\"Argentina\",\"Saudi Arabia\",\"Mexico\",\"Poland\",\"France\",\"Australia\",\"Denmark\",\"Tunisia\",\"Spain\",\"Costa Rica\",\"Germany\",\"Japan\",\"Belgium\",\"Canada\",\"Morocco\",\"Croatia\",\"Brazil\",\"Serbia\",\"Switzerland\",\"Cameroon\",\"Portugal\",\"Ghana\",\"Uruguay\",\"Korea Republic\"␟football␟en_US", 
      openingTS: 1669075200
    }
  ],
  prizeWeights: [6000, 3000, 1000]
};

function getQuestionID(
  _templateID,
  _openingTS,
  _question,
  _arbitrator,
  _timeout,
  _minBond,
  _realitio,
  _factory
) {
  const contentHash = ethers.utils.solidityKeccak256(
    [ "uint256", "uint32", "string" ],
    [ _templateID, _openingTS, _question ]
  );
  const questionID = ethers.utils.solidityKeccak256(
    [ "bytes32", "address", "uint32", "uint256", "address", "address", "uint256" ],
    [ contentHash, _arbitrator, _timeout, _minBond, _realitio, _factory, 0 ]
  );
  return questionID;
}

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  // Sort questions by Realitio's question ID.
  const orderedQuestions = marketData.questions
    .sort((a, b) => getQuestionID(
        a.templateID,
        a.openingTS,
        a.question,
        params[chainId].arbitrator,
        timeout,
        marketData.minBond,
        params[chainId].realityEth,
        params[chainId].factory,
      ) > getQuestionID(
        b.templateID,
        b.openingTS,
        b.question,
        params[chainId].arbitrator,
        timeout,
        marketData.minBond,
        params[chainId].realityEth,
        params[chainId].factory,
      ) ? 1 : -1);

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.attach(params[chainId].factory);
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