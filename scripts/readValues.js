const { ethers } = require("hardhat");

const params = {
  42: {
    arbitrator: "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04",
    realityEth: "0xcB71745d032E16ec838430731282ff6c10D29Dea",
    curate: "",
    governor: "",
    submissionTimeout: 1 * 24 * 60 * 60,
  },
  100: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    curate: "0x86E72802D9AbBF7505a889721fD4D6947B02320E",
    governor: "0x0029ec18568F96AFE25Ea289Dac6c4703868924d",
    submissionTimeout: 7 * 24 * 60 * 60,
  }
};

async function main() {

    const marketAddress = "0x48cca4b7e5e1c38353295966f6c6b1b1d462b775";
    
    
    const Market = await ethers.getContractFactory("Market");
    const market = await Market.attach(marketAddress);
    const nBets = await market.nextTokenID();
    console.log("Market Name:", await market.name());

    console.log("Next tokenID: ", nBets)
    for (let i=0; i<nBets; i++) {
      let rank = await market.ranking(i)
      console.log('Ranking ', i, ': Points: ', rank.points.toString(), ' -> claimed: ', rank.claimed);
    }
    

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });