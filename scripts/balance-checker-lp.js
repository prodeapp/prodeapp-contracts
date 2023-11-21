async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();
  const provider = await signer.provider;

  console.log("Account balance:", ethers.utils.formatUnits((await signer.getBalance()).toString(), 18));
  console.log("Chain Id:", chainId);

  const LiquidityFactory = await ethers.getContractFactory("LiquidityFactory");
  const liquidityFactory = await LiquidityFactory.attach("0x6bbe06d775445f052b9684d98f80161921e67d2a");

  const totalPools = (await liquidityFactory.poolCount()).toNumber();
  const pools = await liquidityFactory.getPools(27, totalPools); // 
  for (const pool of pools) {
    console.log("---------");
    console.log("");

    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.attach(pool);
    const marketAddress = await liquidityPool.market();
    const Market = await ethers.getContractFactory("Market");
    const marketContract = await Market.attach(marketAddress);
    const marketName = await marketContract.name();

    console.log(`${marketName}`);
    const marketBalance = await provider.getBalance(marketAddress);
    console.log(`${marketBalance} (${marketAddress})`);
    const poolBalance = await provider.getBalance(pool);
    console.log(`${poolBalance} (${pool})`);
  
    const marketInfo = await marketContract.marketInfo();
    const managerBalance = await provider.getBalance(marketInfo.manager);
    console.log(`${managerBalance} (${marketInfo.manager})`);

  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });