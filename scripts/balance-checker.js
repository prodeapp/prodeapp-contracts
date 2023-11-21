async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();
  const provider = await signer.provider;

  console.log("Account balance:", ethers.utils.formatUnits((await signer.getBalance()).toString(), 18));
  console.log("Chain Id:", chainId);

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.attach("0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b");

  let marketIndex = 0;
  const markets = await marketFactory.allMarkets(); // 
  for (const marketAddress of markets) {

    const Market = await ethers.getContractFactory("Market");
    const marketContract = await Market.attach(marketAddress);
    const marketName = await marketContract.name();

    const marketBalance = await provider.getBalance(marketAddress);
  
    const marketInfo = await marketContract.marketInfo();
    const managerBalance = await provider.getBalance(marketInfo.manager);

    if (marketBalance.gt(ethers.BigNumber.from('100000000000000000')) || managerBalance.gt(ethers.BigNumber.from('100000000000000000')) ) {
      console.log("---------");
      console.log("");
      console.log(marketIndex);

      console.log(`${marketName}`);
      console.log(`${marketBalance} (${marketAddress})`);
      console.log(`${managerBalance} (${marketInfo.manager})`);
      if (managerBalance.gt(ethers.BigNumber.from('100000000000000000'))) {
        // Referidos?
        const totalAttr = await marketContract.totalAttributions();
        console.log("Referidos");
        console.log(totalAttr);
      }
    }
    marketIndex++;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });