const hre = require("hardhat");
const ethers = hre.ethers;

const params = {
  42: {
    factory: "0x69Ac6c006871ab197aB3715bB52874A00Dc22007"
  },
  100: {
    factory: ""
  }
};

const tournamentData = {
  info: {
    tournamentName: "FIFA World Cup 2022", 
    tournamentSymbol: "FWC22", 
    tournamentUri: "URI"
  },
  closingTime: 1650563000,
  price: 100,
  managementFee: 1000,
  manager: "0xc713E11091C74151020ee49e650C3847C7028e32",
  timeout: 1800,
  minBond: 10,
  questions: [
    {
      templateID: 2, 
      question: "Who won the match between Manchester City and Real Madrid at Champions League?␟\"Manchester City\",\"Real Madrid\"␟sports␟en_US", 
      openingTS: 1650484000
    },
    {
      templateID: 2, 
      question: "Who won the last match between Boca and River?␟\"Boca\",\"River\"␟sports␟en_US", 
      openingTS: 1650484000
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

  const Tournament = await ethers.getContractFactory("Tournament");

  const TournamentFactory = await ethers.getContractFactory("TournamentFactory");
  const tournamentFactory = await TournamentFactory.attach(params[chainId].factory);
  await tournamentFactory.createTournament(
    tournamentData.info,
    tournamentData.closingTime,
    tournamentData.price,
    tournamentData.managementFee,
    tournamentData.manager,
    tournamentData.timeout,
    tournamentData.minBond,
    tournamentData.questions,
    tournamentData.prizeWeights
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });