const { BigNumber } = ethers;

const DISTRIBUTOR_ADDRESS = "0xAd93D54f63218b4d85ABa8313e43c741708289D4";
// Prod
const MARKET_FACTORY_ADDRESS = "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b";
// Betsi tests
//const MARKET_FACTORY_ADDRESS = '0xc02fcc3250419d31a3b18fa9317535f17063c8ab'
const LIQUIDITY_FACTORY_ADDRESS = "0x6bbe06d775445f052b9684d98f80161921e67d2a";
const MARKET_VIEW_ADDRESS = "0xd46E1632D38FfF984c35B22fEf9dB7986fd50E2E";

async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();

  console.log(
    "Account balance:",
    ethers.utils.formatUnits((await signer.getBalance()).toString(), 18)
  );
  console.log("Chain Id:", chainId);

  const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
  const rewardsDistributor = await RewardsDistributor.attach(DISTRIBUTOR_ADDRESS);

  const Market = await ethers.getContractFactory("Market");

  const pendingMarkets = (
    await rewardsDistributor.getPendingMarkets(MARKET_FACTORY_ADDRESS, 20)
  ).filter((market) => market !== "0x0000000000000000000000000000000000000000");

  if (pendingMarkets.length === 0) {
    console.log("No pending markets found");
    return;
  }

  for (const pendingMarket of pendingMarkets) {
    const market = Market.attach(pendingMarket);
    const marketInfo = await market.marketInfo();
    console.log(`${await marketInfo.marketName} (${pendingMarket})`);

    try {
      await processMarket(rewardsDistributor, pendingMarket, marketInfo.manager);
    } catch (e) {
      console.log(e)
    }
  }

  console.log("distribution completed!");
}

function getWinnersData(bets, prizesCount) {
  let winnersData = [];
  let firstSharedIndex = 0;
  let endSharedIndex = 0;
  let rankIndex = 0;
  for (prizeIndex = 0; prizeIndex < prizesCount; prizeIndex++) {
    if (bets[firstSharedIndex] === undefined) {
      break;
    }

    let currentRankPoints = bets[firstSharedIndex];
    for (let i = firstSharedIndex; i < bets.length; i++) {
      if (currentRankPoints > bets[i]) {
        break;
      } else {
        endSharedIndex = i;
      }
    }

    for (let j = 0; j <= endSharedIndex - firstSharedIndex; j++) {
      // console.log('Claim inputs:', rankIndex, currentRankPoints, firstSharedIndex, endSharedIndex)
      winnersData.push({
        points: currentRankPoints,
        rankIndex: rankIndex++,
        firstSharedIndex: firstSharedIndex,
        endSharedIndex: endSharedIndex,
      });
    }

    if (endSharedIndex >= prizesCount - 1) break;
    firstSharedIndex = endSharedIndex + 1;
    endSharedIndex = firstSharedIndex;
  }

  return winnersData;
}

async function processMarket(rewardsDistributor, marketAddress, managerAddress) {
  const MarketView = await ethers.getContractFactory("MarketView");
  const marketView = await MarketView.attach(MARKET_VIEW_ADDRESS);

  const prizes = (await marketView.getPrizes(marketAddress)).filter((p) => p.gt(0));

  const bets = (await marketView.getMarketBets(marketAddress))
    .map((b) => b.points.toNumber())
    .sort((a, b) => b - a);

  const LiquidityFactory = await ethers.getContractFactory("LiquidityFactory");
  const liquidityFactory = await LiquidityFactory.attach(LIQUIDITY_FACTORY_ADDRESS);
  const hasLiquidityPool = await liquidityFactory.exists(managerAddress);

  let stakers = [];

  if (hasLiquidityPool) {
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.attach(managerAddress);
    const stakedEventFilter = liquidityPool.filters.Staked();
    const stakedEvents = await liquidityPool.queryFilter(stakedEventFilter);
    stakers = [...new Set(stakedEvents.map((event) => event.args._user))];
  }

  return await rewardsDistributor.distributeRewards(
    marketAddress,
    LIQUIDITY_FACTORY_ADDRESS,
    getWinnersData(bets, prizes.length),
    stakers
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
