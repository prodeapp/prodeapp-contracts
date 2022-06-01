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
    factory: "0xF1404D34905caff47F7c621d806978CB25389C14"
  }
};

const timeout = 129600; // 1.5 days
const marketData = {
  info: {
    marketName: "FIFA World Cup 2022", 
    marketSymbol: "FWC22"
  },
  closingTime: 1654200000,
  price: 100,
  managementFee: 100,
  manager: "0xc713E11091C74151020ee49e650C3847C7028e32",
  minBond: 1,
  questions: [
    {
      templateID: 2, 
      question: "Who won the match between Manchester City and Real Madrid at Champions League?␟\"Manchester City\",\"Real Madrid\"␟sports␟en_US", 
      openingTS: 1654201829
    },
    {
      templateID: 2, 
      question: "Who won the last match between Boca and River?␟\"Boca\",\"River\"␟sports␟en_US", 
      openingTS: 1654201829
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
    marketData.info,
    marketData.closingTime,
    marketData.price,
    marketData.managementFee,
    marketData.manager,
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