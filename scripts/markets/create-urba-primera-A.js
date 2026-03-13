const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionSingleSelectV2, toTimestamp} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const RUGBY_MATCH_DURATION = 60*60*3;
const closingTime = toTimestamp("2026-03-14 15:30:00 GMT-3"); // horario de inicio del primer partido
const openingTs = closingTime + RUGBY_MATCH_DURATION;
const marketName = `Fecha 1 URBA Primera A 2026 by SIN TMO`;

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime,
  price: ethers.utils.parseUnits("0", "ether"),
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("0.0005", "ether"),
  questions: [
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido Hurling vs Universitario (LP)?`,
      ['Hurling', 'Universitario (LP)', 'Empate'],
      openingTs + 1,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido Lomas vs Pueyrredón?`,
      ['Lomas', 'Pueyrredón', 'Empate'],
      openingTs + 2,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido Curupaytí vs San Fernando?`,
      ['Curupaytí', 'San Fernando', 'Empate'],
      openingTs + 3,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido San Luis vs Dep. Francesa?`,
      ['San Luis', 'Dep. Francesa', 'Empate'],
      openingTs + 4,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido Olivos vs San Cirano?`,
      ['Olivos', 'San Cirano', 'Empate'],
      openingTs + 5,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido GEBA vs San Albano?`,
      ['GEBA', 'San Albano', 'Empate'],
      openingTs + 6,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el resultado del partido Pucará vs San Andrés?`,
      ['Pucará', 'San Andrés', 'Empate'],
      openingTs + 7,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el partido con mayor diferencia de puntos?`,
      [
        'Hurling vs Universitario (LP)',
        'Lomas vs Pueyrredón',
        'Curupaytí vs San Fernando',
        'San Luis vs Dep. Francesa',
        'Olivos vs San Cirano',
        'GEBA vs San Albano',
        'Pucará vs San Andrés',
      ],
      openingTs + 8,
      'sports'
    ),
    buildQuestionSingleSelectV2(
      `Fecha 1 URBA Primera A 2026: ¿Cuál va a ser el partido con menor diferencia de puntos?`,
      [
        'Hurling vs Universitario (LP)',
        'Lomas vs Pueyrredón',
        'Curupaytí vs San Fernando',
        'San Luis vs Dep. Francesa',
        'Olivos vs San Cirano',
        'GEBA vs San Albano',
        'Pucará vs San Andrés',
      ],
      openingTs + 9,
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