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

const openingTs = toTimestamp("2025-10-25 03:00:00");
const marketName = `URBA Top 12 Playoffs 2025`;

// Teams
const teams = [
  "CASI",
  "Belgrano Athletic", 
  "Newman",
  "SIC"
];

// Players by team
const casiPlayers = listToArray(`Joaquín Britto
Juan Torres Obeid
Facundo Scaiano
Salvador Ochoa
Ignacio Larrague
Leo Mazzini
Eugenio Sartori
Joaquín Sanchez
Felipe Hileman
Tomás Phelan
Benjamín Belaga
Jerónimo Solveyra
Jerónimo Tumbarello
Juan Akemeier
Felix Paolucci
Agustín Posleman
Benjamín Rocca Rivarola
Francisco Lescano
Santiago Viaña
Matías Phelan
Alejo Lavayén
Eliseo Morales
Juan Ignacio Rizzuti
Ignacio Torrado
Bruno Devoto
Benito Paolucci
Juan Albareda
Vicente Mamolitti
Pedro Repetto
Hugo García
Joaquín Saenz de Miera
Martín Landajo`);

const belgranoAthleticPlayers = listToArray(`Francisco Ferronato
Francisco Lusarreta
Lisandro García Dragui
Ramón Duggan
Juan Penoucos
Augusto Vaccarino
Julián Rebussone
Franco Vega
Theo Blaksley
Joaquín Mihura
Ignacio Díaz
Martín Arana
Tomás Etchepare
Pedro Arana
Juan Landó
Santiago Villegas
Valentín Chiodi
Eliseo Marchetti
Luciano Tecca
Mikael Bloom Quesada
Mateo Gasparotti
Francisco Gradin
Agustín Rocca
Carlos Bottini
Nicolás Spinelli
Juan Brescia
Santino Ruzzante
Tobías Bernabé
Joaquín de la Serna
Rodrigo Fernández Criado
Mauro Rebussone
Lucas Moro
Octavio Carroll
Juan Aparicio
Tomas Rosati
Tomás Cubelli
Mateo Etchecoin`);

const newmanPlayers = listToArray(`Miguel Prince
Marcelo Brandi
Bautista Bosch
Pablo Cardinal
Alejandro Urtubey
Jerónimo Ureta
Joaquín De la Vega
Rodrigo Díaz de Vivar
Lucas Nava
Gonzalo Gutiérrez Taboada
Santiago Marolda
Tomás Keena
Benjamín Lanfranco
Cruz Ulloa
Juan Bautista Daireaux
Lucas Marguery
Rodrigo Pueyrredón
Francisco Lascombes
Tomás Cáceres
Miguel Urtubey
Félix Branca
Marcos Zirolli
Jerónimo Ulloa
Mariano Urtubey
Tomás Ureta
Florencio Llerena
Justo Ortiz Basualdo
Facundo Brandi
Manuel Lozano
Luciano Borio
Faustino Santarelli
James Wright
Beltrán Salese
Teófilo Garay
Tomás Valls`);

const sicPlayers = listToArray(`Marcos Piccinini
Ignacio Bottazzini
Lucas Sommer
Bautista Viero
Andrea Panzarini
Franco Delger
Santos Fernández de Oliveira
Mateo Albanese
Santiago Pavlovsky
Jacinto Campbell
Santos Rubio
Carlos Piran 
Nicanor Acosta
Bernabé López Fleming
Francisco Calandra
Simon Fitz Gerald
Ciro Plorutti
Facundo Miguens
Felipe Sáscaro
Alberto Miguens
Gregorio Pérez Pardo
Estanislao Pérez Pardo
Tomás Meyrelles
Lucas Rocha
Benjamín Chiappe
Alejandro Daireaux
Agustín Sascaro
Agustin Garcia Herdt
Lucas Albanese
Ignacio Cohelo
Mateo Busso
Ignacio Villegas
Manuel Curuchaga
Tomas Legarre
Juan Soares Gache
Tomas Longo
Facundo Madero
Tadeo Ledesma
Felipe Ledesma
Timoteo Silva`);

// All players combined
const allPlayers = [...casiPlayers, ...belgranoAthleticPlayers, ...newmanPlayers, ...sicPlayers];

// Semifinal 1: Belgrano Athletic vs Newman
const semifinal1Players = [...belgranoAthleticPlayers, ...newmanPlayers];

// Semifinal 2: CASI vs SIC  
const semifinal2Players = [...casiPlayers, ...sicPlayers];

// Referees
const referees = [
  "Tomás Bertazza", 
  "Pablo Deluca",
  "Mauro Rossi"
];

// Point difference options
const pointDifference = [
  "0-5 puntos",
  "6-10 puntos", 
  "11-15 puntos",
  "16-20 puntos",
  "Más de 20 puntos"
];

const yesNo = ['Sí', 'No'];

const marketData = {
  marketName: marketName,
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2025-10-24 23:00:00"),
  price: ethers.utils.parseUnits("0", "ether"),
  creator: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
  creatorFee: 300,
  minBond: ethers.utils.parseUnits("0.0005", "ether"),
  questions: [
    buildQuestionSingleSelectV2(`¿Quién gana el partido Belgrano Athletic vs Newman?`, ['Belgrano Athletic', 'Newman'], openingTs + 1, 'sports'),
    buildQuestionSingleSelectV2(`¿Cuál será la diferencia de puntos en Belgrano Athletic vs Newman?`, pointDifference, openingTs + 2, 'sports'),
    buildQuestionSingleSelectV2(`¿Qué jugador anota el primer try en Belgrano Athletic vs Newman?`, semifinal1Players, openingTs + 3, 'sports'),
    
    buildQuestionSingleSelectV2(`¿Quién gana el partido CASI vs SIC?`, ['CASI', 'SIC'], openingTs + 4, 'sports'),
    buildQuestionSingleSelectV2(`¿Cuál será la diferencia de puntos en CASI vs SIC?`, pointDifference, openingTs + 5, 'sports'),
    buildQuestionSingleSelectV2(`¿Qué jugador anota el primer try en CASI vs SIC?`, semifinal2Players, openingTs + 6, 'sports'),
    
    buildQuestionSingleSelectV2(`¿Quién sale campeón?`, teams, openingTs + 7, 'sports'),
    buildQuestionSingleSelectV2(`¿Va a haber más de 10 puntos de diferencia en la final?`, yesNo, openingTs + 8, 'sports'),
    buildQuestionSingleSelectV2(`¿Quién será el jugador del partido de la final?`, allPlayers, openingTs + 9, 'sports'),
    
    buildQuestionSingleSelectV2(`¿Qué jugador anotará más puntos durante los playoffs?`, allPlayers, openingTs + 10, 'sports'),
    buildQuestionSingleSelectV2(`¿Qué jugador anotará más tries durante los playoffs?`, allPlayers, openingTs + 11, 'sports'),
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
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });