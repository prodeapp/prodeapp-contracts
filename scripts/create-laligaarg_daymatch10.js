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
  marketName: "La Liga - Torneo Binance 2022 - Fecha #10", 
  marketSymbol: "PRODE",
  closingTime: 1658597400, // 2022-07-23 14:30:00 GMT -3:00
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x64ab34d8cb33F8b8bB3D4b38426896297a3e7f81", // Ubiburner Bridge
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1: Saturday 23-7
    {
      templateID: 2, 
      question: "What will be the result of the Sarmiento vs Colon match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Sarmiento\",\"Colon\",\"Draw\"␟football␟en_US", 
      openingTS: 1658610000 // 18hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Independiente vs Atletico Tucuman match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Independiente\",\"Atletico Tucuman\",\"Draw\"␟football␟en_US", 
      openingTS: 1658620800 // 21hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Central Cordoba vs Racing match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Central Cordoba\",\"Racing\",\"Draw\"␟football␟en_US", 
      openingTS: 1658628000 // 23hs Arg Time
    },
    // Sunday 24-7
    {
      templateID: 2, 
      question: "What will be the result of the Tigre vs Platense match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Tigre\",\"Platense \",\"Draw\"␟football␟en_US", 
      openingTS: 1658685600  // 15 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Aldosivi vs River Plate match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Aldosivi\",\"River Plate\",\"Draw\"␟football␟en_US", 
      openingTS: 1658696400  // 18 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Gimnasia y Esgrima de La Plata vs Lanus match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Gimnasia y Esgrima de La Plata\",\"Lanus\",\"Draw\"␟football␟en_US", 
      openingTS: 1658707200  // 21 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Boca Juniors vs Estudiantes de La Plata match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Boca Juniors\",\"Estudiantes de La Plata\",\"Draw\"␟football␟en_US", 
      openingTS: 1658714400  // 23 hs Arg Time
    },
    // Day 3: Monday 25-7
    {
      templateID: 2, 
      question: "What will be the result of the San Lorenzo vs Talleres match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"San Lorenzo\",\"Talleres\",\"Draw\"␟football␟en_US", 
      openingTS: 1658786400  // 19hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Banfield vs Argentinos Juniors match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Banfield\",\"Argentinos Juniors\",\"Draw\"␟football␟en_US", 
      openingTS: 1658793600  // 21 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Newell's Old Boys vs Defensa y Justicia match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Newell's Old Boys\",\"Defensa y Justicia\",\"Draw\"␟football␟en_US", 
      openingTS: 1658793600  // 21 hs Arg time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Union vs Godoy Cruz match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Union\",\"Godoy Cruz\",\"Draw\"␟football␟en_US", 
      openingTS: 1658804400 // 00 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Velez Sarfield vs Huracan match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Velez Sarfield\",\"Huracan\",\"Draw\"␟football␟en_US", 
      openingTS: 1658804400 // 00 hs Arg Time
    },
    // Day 4: Tuesday 26-7
    {
      templateID: 2, 
      question: "What will be the result of the Arsenal vs Rosario Central match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Arsenal\",\"Rosario Central\",\"Draw\"␟football␟en_US", 
      openingTS: 1658883600 // 22 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Bararcas Central vs Patronato match at La Liga - Torneo Binance 2022 - Fecha #10?␟\"Bararcas Central\",\"Patronato\",\"Draw\"␟football␟en_US", 
      openingTS: 1658883600 // 22 hs Arg Time
    }
  ],
  prizeWeights: [5000, 3500, 1500]
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