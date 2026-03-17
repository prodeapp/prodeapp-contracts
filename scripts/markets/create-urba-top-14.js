const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionSingleSelectV2, toTimestamp} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

// Helper function to convert multiline string to array
const listToArray = (listString) => {
  return listString
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

const RUGBY_MATCH_DURATION = 60*60*3;
const closingTime = toTimestamp("2026-03-21 15:30:00 GMT-3"); // horario de inicio del primer partido
const openingTs = closingTime + RUGBY_MATCH_DURATION;
const matchday = "Fecha 2 URBA Top 14 2026"
const marketName = `${matchday} by SIN TMO`;

const MATCHES = [
  {home: 'Belgrano Ath.', away: 'Newman'},
  {home: 'Buenos Aires', away: 'Alumni'},
  {home: 'CUBA', away: 'Champagnat'},
  {home: 'CASI', away: 'Hindú'},
  {home: 'Los Tilos', away: 'La Plata'},
  {home: 'Atl. del Rosario', away: 'Regatas'},
  {home: 'SIC', away: 'Los Matreros'},
];

const allPlayers = listToArray(`Gonzalo Gutierrez Taboada
Juan Akemeier
Santiago Pavlovsky
Agustin Sascaro
Agustín Lamensa
Juan Ignacio Landó
Bautista Santamarina
Fermín Ormaechea
Justo Camerlinckx
Francisco Suárez Folch
Federico Sica
Manuel Nogues
Juan Morales
Santos Panelo
Rafael Benedit 
Valentín Mastroizzi
Bautista Canzani`).sort((a, b) => a.localeCompare(b, 'es'));

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime,
  price: ethers.utils.parseUnits("0", "ether"),
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("0.0005", "ether"),
  questions: [
    ...MATCHES.map(({home, away}, i) =>
      buildQuestionSingleSelectV2(
        `${matchday}: ¿Cuál va a ser el resultado del partido ${home} vs ${away}?`,
        [home, away, 'Empate'],
        openingTs + (i + 1),
        'sports'
      )
    ),
    buildQuestionSingleSelectV2(
      `${matchday}: ¿Cuál va a ser el partido con mayor diferencia de puntos?`,
      MATCHES.map(({home, away}) => `${home} vs ${away}`),
      openingTs + (MATCHES.length + 1),
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `${matchday}: ¿Quién va a ser el goleador de la fecha?`,
      allPlayers.concat(['Otro']),
      openingTs + (MATCHES.length + 2),
      'sports'
    ),
  ],
  prizeWeights: [10000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);
  const chainConfig = getChain(chainId);

  // Sort questions by Realitio's question ID.
  const orderedQuestions = orderQuestionsV2(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  const MarketFactoryV2 = await ethers.getContractFactory("MarketFactoryV2");
  const marketFactoryV2 = MarketFactoryV2.attach(chainConfig.factoryV2);

  // Obtener la dirección del MarketFactory subyacente
  const marketFactoryAddress = await marketFactoryV2.marketFactory();
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = MarketFactory.attach(marketFactoryAddress);

  // Escuchar el evento NewMarket antes de crear el market
  const filter = marketFactory.filters.NewMarket();
  marketFactory.on(filter, (market, hash, manager) => {
    console.log("NewMarket event emitted:");
    console.log("Market address:", market);
    console.log("Hash:", hash);
    console.log("Manager:", manager);
  });

  const tx = await marketFactoryV2.createMarket(
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

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait(2);
  console.log("Transaction confirmed in block:", receipt.blockNumber);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });