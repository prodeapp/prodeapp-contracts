const hre = require("hardhat");
const {getChain, orderQuestions, buildQuestion, MATCH_DURATION} = require("./helpers");
const {TEAMS} = require("./teams");
const ethers = hre.ethers;

const timeout = 129600; // 1.5 days

const marketName = "La Liga - Torneo Binance 2022 - Fecha #11";

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: 1659135600 - MATCH_DURATION,
  price: ethers.utils.parseUnits("3.0", "ether"), // 3 xDAI
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("5.0", "ether"),
  questions: [
    // Day1: 29/7
    buildQuestion(TEAMS.AR.GODOY_CRUZ, TEAMS.AR.VELEZ, marketName, 1659135600 + MATCH_DURATION), // 20hs Arg Time
    buildQuestion(TEAMS.AR.TALLERES, TEAMS.AR.UNION, marketName, 1659135600 + MATCH_DURATION), // 20hs Arg Time
    // Day2: 30/7
    buildQuestion(TEAMS.AR.ARGENTINOS_JUNIORS, TEAMS.AR.SAN_LORENZO, marketName, 1659205800 + MATCH_DURATION), // 15:30hs Arg Time
    buildQuestion(TEAMS.AR.ESTUDIANTES_LP, TEAMS.AR.BANFIELD, marketName, 1659214800 + MATCH_DURATION), // 18hs Arg Time
    buildQuestion(TEAMS.AR.ATLETICO_TUCUMAN, TEAMS.AR.NEWELLS, marketName, 1659223800 + MATCH_DURATION), // 20:30hs Arg Time
    buildQuestion(TEAMS.AR.HURACAN, TEAMS.AR.GIMNASIA_LP, marketName, 1659223800 + MATCH_DURATION), // 20:30Hs Arg time
    // Day3: 31/7
    buildQuestion(TEAMS.AR.LANUS, TEAMS.AR.ALDOSIVI, marketName, 1659283200 + MATCH_DURATION), // 13hs Arg Time
    buildQuestion(TEAMS.AR.PLATENSE, TEAMS.AR.BARRACAS_CENTRAL, marketName, 1659283200 + MATCH_DURATION), // 13hs Arg Time
    buildQuestion(TEAMS.AR.RACING, TEAMS.AR.TIGRE, marketName, 1659292200 + MATCH_DURATION), // 15:30hs Arg Time
    buildQuestion(TEAMS.AR.PATRONATO, TEAMS.AR.BOCA_JUNIORS, marketName, 1659301200 + MATCH_DURATION), // 18:00hs Arg Time
    buildQuestion(TEAMS.AR.RIVER, TEAMS.AR.SARMIENTO, marketName, 1659310200 + MATCH_DURATION), // 20:30hs Arg Time
    // Day4: 1/8
    buildQuestion(TEAMS.AR.ROSARIO_CENTRAL, TEAMS.AR.CENTRAL_CORDOBA, marketName, 1659391200 + MATCH_DURATION), // 19hs Arg Time
    buildQuestion(TEAMS.AR.DEFENSA_JUSTICIA, TEAMS.AR.ARSENAL, marketName, 1659391200 + MATCH_DURATION), // 19hs Arg Time
    buildQuestion(TEAMS.AR.COLON, TEAMS.AR.INDEPENDIENTE, marketName, 1659400200 + MATCH_DURATION), // 21:30hs Arg Time
  ],
  prizeWeights: [5000, 3500, 1500]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const chainConfig = getChain(chainId);

  // Sort questions by Realitio's question ID.
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