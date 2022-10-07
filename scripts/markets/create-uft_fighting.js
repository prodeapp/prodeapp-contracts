const hre = require('hardhat');
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require('./helpers');

const timeout = 129600; // 1.5 days
const openingTS = toTimestamp('2022-10-13 23:00:00  UTC');
const marketData = {
  marketName: 'Unicorn Fighting Tournament - October 13, 2022', 
  marketSymbol: 'PRODE',
  closingTime: toTimestamp('2022-10-13 15:00:00 UTC'),
  price: ethers.utils.parseUnits('5.0', 'ether'), // 5 xDAI
  creator: '0xbca74372C17597Fa9dA905C7c2B530766768027C', // GnosisUBIBurner
  creatorFee: 300, // 3%
  minBond: ethers.utils.parseUnits('5.0', 'ether'), // 5 xDAI
  questions: [
    {
      templateID: 2, 
      question: 'How far will "The North Man" Iman Samarghandi go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Ruslan" Erich Waidmann go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Assassin" Mehruddin Nikpai go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Lion" Sofian Bohumadi go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Hannibal" Rodrick Nan go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Nightmare" Hafeni Nafuka go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Borz" Isaskha Khizriev go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
    {
      templateID: 2, 
      question: 'How far will "Crime" Zabiullah Mubarez go in the Unicorn Fighting Tournament October 13, 2022?␟\'Champion\',\'Runner-up\',\'Semifinals\',\'Quarterfinals\'␟MMA␟en_US', 
      openingTS: openingTS
    },
  ],
  prizeWeights: [6000, 3000, 1000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());
  console.log('Chain Id:', chainId);

  const chainConfig = getChain(chainId);

  const orderedQuestions = orderQuestions(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  console.log(orderedQuestions);

  const MarketFactory = await ethers.getContractFactory('MarketFactory');
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