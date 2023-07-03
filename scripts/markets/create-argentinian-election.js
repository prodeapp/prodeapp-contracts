const hre = require("hardhat");
const {getChain, orderQuestionsV2, buildQuestionSingleSelectV2, toTimestamp} = require("./helpers");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const openingTs = toTimestamp("2023-08-14 00:00:00");
const marketName = `Argentinean Presidential Primary election (PASO) 2023`;
const JxCCandidates = [
  "Bullrich - Petri",
  "Rodriguez Larreta - Morales",
];
const UxPCandidates = [
    "Massa - Rossi",
    "Grabois - Abal Medina",
  ];
const FdICandidates = [
    "Bregman - del Caño",
    "Solano - Ripol",
  ];
const ranges = [
  "<1%",
  ">1% - 5%",
  ">5% - 10%",
  ">10% - 15%",
  ">15% - 20%",
  ">20%",
];

const parties = [
    "Union por la Patria",
    "Juntos por el Cambio",
    "La Libertad Avanza",
    "Hacemos por Nuestro Pais",
    "Frente de Izquierda y los Trabajadores-Unidad",
    "Nuevo MAS",
    "Politica Obrera",
    "Libres del Sur",
    "Frente Principios y Valores",
    "Frente Patriota Federal",
    "Demos",
    "MIJD",
    "Frente Liber.ar",
    "Paz, Democracia y Soberania",
]

const candidates = [
    "Massa",
    "Grabois",
    "Rodriguez Larreta",
    "Bullrich",
    "Milei",
    "Schiaretti",
    "Bregman",
    "Solano",
    "Castañeira",
    "Ramal",
    "Escobar",
    "Moreno",
    "Biondini",
    "Etchepare",
    "Bárbaro",
    "Castells",
    "Cúneo",
    "Gobbi",
    "Giardinelli",
]

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2023-08-13 08:00:00 GMT-3"),
  price: ethers.utils.parseUnits("2.0", "ether"), // 10 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),  // 5 xDAI
  questions: [
    buildQuestionSingleSelectV2(`Who will win the ${marketName} within the Juntos por el Cambio party?`, JxCCandidates, openingTs, 'Politics'),
    buildQuestionSingleSelectV2(`Who will win the ${marketName} within the Union por la Patria party?`, UxPCandidates, openingTs+1, 'Politics'),
    buildQuestionSingleSelectV2(`Who will win the ${marketName} within the Frente de Izquierda party?`, FdICandidates, openingTs+2, 'Politics'),
    buildQuestionSingleSelectV2(`What percentage of votes will get Milei-Villaroel at the ${marketName}?`, ranges, openingTs+3, 'Politics'),
    buildQuestionSingleSelectV2(`What percentage of votes will get Schiaretti-Randazzo at the ${marketName}?`, ranges, openingTs+4, 'Politics'),
    buildQuestionSingleSelectV2(`Which party will get the most votes at the ${marketName}?`, parties, openingTs+5, 'Politics'),
    buildQuestionSingleSelectV2(`Which party will get the second most votes at the ${marketName}?`, parties, openingTs+6, 'Politics'),
    buildQuestionSingleSelectV2(`Which candidate will get the most votes at the ${marketName}?`, candidates, openingTs+7, 'Politics'),
  ],
  prizeWeights: [10000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);
  console.log(marketData)
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
  const marketFactoryV2 = await MarketFactoryV2.attach(chainConfig.factoryV2);

  const marketContract = await marketFactoryV2.createMarket(
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
  console.log(`Market deployed at ${marketContract.address.toString()}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });