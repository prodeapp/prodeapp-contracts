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
  marketName: "La Liga - Torneo Binance 2022 - Fecha #9", 
  marketSymbol: "PRODE",
  closingTime: 1658253600, // 2022-07-19 15:00:00 GMT -3:00
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1: tuesday 19-7
    {
      templateID: 2, 
      question: "What will be the result of the Colon vs Aldosivi match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Colon\",\"Aldosivi\",\"Draw\"␟football␟en_US", 
      openingTS: 1658268000 // 19hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Platense vs Central Cordoba match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Platense\",\"Central Cordoba\",\"Draw\"␟football␟en_US", 
      openingTS: 1658268000 // 19hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Atletico Tucuman vs Sarmiento match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Atletico Tucuman\",\"Sarmiento\",\"Draw\"␟football␟en_US", 
      openingTS: 1658278800 // 22hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Racing vs Arsenal match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Racing\",\"Arsenal\",\"Draw\"␟football␟en_US", 
      openingTS: 1658278800 // 22hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Argentinos Juniors vs Boca Juniors match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Argentinos Juniors\",\"Boca Juniors\",\"Draw\"␟football␟en_US", 
      openingTS: 1658286000  // 0Hs Arg time
    },
    // wendsday 20-7
    {
      templateID: 2, 
      question: "What will be the result of the San Lorenzo vs Union match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"San Lorenzo\",\"Union \",\"Draw\"␟football␟en_US", 
      openingTS: 1658347200  // 17 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Patronato vs Tigre match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Patronato\",\"Tigre\",\"Draw\"␟football␟en_US", 
      openingTS: 1658354400  // 19 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Defensa y Justicia vs Independiente match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Defensa y Justicia\",\"Independiente\",\"Draw\"␟football␟en_US", 
      openingTS: 1658365200  // 22 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Estudiantes de la Plata vs Barracas Central match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Estudiantes de la Plata\",\"Barracas Central\",\"Draw\"␟football␟en_US", 
      openingTS: 1658365200  // 22 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Huracan vs Godoy Cruz match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Huracan\",\"Godoy Cruz\",\"Draw\"␟football␟en_US", 
      openingTS: 1658372400  // 0hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Lanus vs Velez Sarfield match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Lanus\",\"Velez Sarfield\",\"Draw\"␟football␟en_US", 
      openingTS: 1658372400  // 0hs Arg Time
    },
    // Day 3: thursday 21-7
    {
      templateID: 2, 
      question: "What will be the result of the Rosario Central vs Newell's All Boys match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Rosario Central\",\"Newell's All Boys\",\"Draw\"␟football␟en_US", 
      openingTS: 1658440800  // 19 hs Arg Time
    },
    {
      templateID: 2, 
      question: "What will be the result of the Talleres vs Banfield match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"Talleres\",\"Banfield\",\"Draw\"␟football␟en_US", 
      openingTS: 1658451600  // 22 hs Arg time
    },
    {
      templateID: 2, 
      question: "What will be the result of the River Plate vs Gimnasia y Esgrima de La Plata match at La Liga - Torneo Binance 2022 - Fecha #9?␟\"River Plate\",\"Gimnasia y Esgrima de La Plata\",\"Draw\"␟football␟en_US", 
      openingTS: 1658458800 // 0 hs Arg Time
    },
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