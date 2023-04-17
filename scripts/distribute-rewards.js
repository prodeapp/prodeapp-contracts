const { gql, GraphQLClient } = require('graphql-request')
const { BigNumber } = ethers;

// ABI for transaction batcher contract.
const BATCHER_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'datas', type: 'bytes[]' }
    ],
    name: 'batchSend',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function'
  }
]
const ZERO = BigNumber.from(0);

const transactionBatcher = "0xA73A872eFD768bb23efb24CEeB9e330bcCA259D6";
const subgraphUrl = "https://api.thegraph.com/subgraphs/name/prodeapp/prodeapp";
const graph = new GraphQLClient(subgraphUrl);

async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();

  console.log("Account balance:", ethers.utils.formatUnits((await signer.getBalance()).toString(), 18));
  console.log("Chain Id:", chainId);

  // fetch candidate markets
  // markets that used registerPoints()
  let {markets: markets1} = await graph.request(
    gql`
      query marketsQuery($resultSubmissionPeriodStart: Int!) {
        markets(where: {resultSubmissionPeriodStart_gt: $resultSubmissionPeriodStart}) {
          id
          name
          resultSubmissionPeriodStart
          submissionTimeout
          bets {
            claim
          }
          manager {
            id
          }
        }
      }
    `, {
      resultSubmissionPeriodStart: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 14 // Today - 2 weeks
    }
  );

  // markets that used registerAll()
  let {markets: markets2} = await graph.request(
    gql`
      query marketsQuery {
        markets(where: {resultSubmissionPeriodStart: 1}) {
          id
          name
          resultSubmissionPeriodStart
          submissionTimeout
          bets {
            claim
          }
          manager {
            id
          }
        }
      }
    `
  );
  const allMarkets = markets1.concat(markets2);

  const now = Math.floor(Date.now() / 1000);

  const markets = allMarkets.filter(market => now > (Number(market.resultSubmissionPeriodStart) + Number(market.submissionTimeout)))

  if (markets.length === 0) {
    console.log('No markets found');
    return;
  }

  const args = {targets: [], values: [], datas: []};

  for (const market of markets) {
    console.log(`${market.name} (${market.id})`);
    const {datas, liquidityDatas} = await processMarket(market.id, market.bets.filter(bet => bet.claim).length, market.manager.id, signer);

    args.targets = args.targets.concat(Array(datas.length).fill(market.id));
    args.values = args.values.concat(Array(datas.length).fill(0));
    args.datas = args.datas.concat(datas);

    args.targets = args.targets.concat(Array(liquidityDatas.length).fill(market.manager.id));
    args.values = args.values.concat(Array(liquidityDatas.length).fill(0));
    args.datas = args.datas.concat(liquidityDatas);
  }

  if (args.targets.length === 0) {
    console.log('nothing to distribute');
    return;
  }

  const batcherContract = new ethers.Contract(transactionBatcher, BATCHER_ABI, signer);

  await batcherContract.batchSend(
    args.targets,
    args.values,
    args.datas
  );

  console.log('distribution completed!');
}

async function processMarket(marketAddress, totalClaimed, managerAddress, signer) {
  const LiquidityFactory = await ethers.getContractFactory("LiquidityFactory");
  const liquidityFactory = await LiquidityFactory.attach("0x6bbe06d775445f052b9684d98f80161921e67d2a");
  const exists = await liquidityFactory.exists(managerAddress);
  const managerBalance = await ethers.provider.getBalance(managerAddress);
  const marketBalance = await ethers.provider.getBalance(marketAddress);
  if (marketBalance.eq(ZERO) && (!exists || managerBalance.eq(ZERO))) {
    return {datas: [], liquidityDatas: []};  }

  let { bets, market: marketData } = await graph.request(
    gql`
      query rankingQuery($marketAddress: String) {
        bets(where: {market: $marketAddress, points_not: 0}, orderBy: points, orderDirection: desc) {
          points
        }
        market(id: $marketAddress) {
          prizes
        }
      }
    `,
      {
        marketAddress: marketAddress,
      }
  );

  bets = bets.map(bet => {
    bet.points = Number(bet.points);
    return bet;
  });

  const Market = await ethers.getContractFactory("Market");
  const market = await Market.attach(marketAddress);

  let datas = [];
  let winnersData = [];
  let firstSharedIndex = 0;
  let endSharedIndex = 0;
  let rankIndex = 0;
  for (prizeIndex = 0; prizeIndex < marketData.prizes.length; prizeIndex++) {
    if (bets[firstSharedIndex] === undefined) {
      break;
    }

    let currentRankPoints = bets[firstSharedIndex].points;
    for (let i = firstSharedIndex; i < bets.length; i++) {
      if (currentRankPoints > bets[i].points) {break;}
      else {endSharedIndex = i;}
    }

    for (let j=0; j<=endSharedIndex-firstSharedIndex; j++){
      // console.log('Claim inputs:', rankIndex, currentRankPoints, firstSharedIndex, endSharedIndex)
      winnersData.push({
        points: currentRankPoints,
        rankIndex: rankIndex,
        firstSharedIndex: firstSharedIndex,
        endSharedIndex: endSharedIndex,
      })
      const claimReward = (await market.populateTransaction.claimRewards(rankIndex++, firstSharedIndex, endSharedIndex)).data;
      datas.push(claimReward);
    }

    if (endSharedIndex >= marketData.prizes.length - 1) break;
    firstSharedIndex = endSharedIndex+1
    endSharedIndex = firstSharedIndex
  }

  // Distribute liquidity fees
  const liquidityDatas = [];
  if (exists && managerBalance.gt(ZERO)) {
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.attach(managerAddress);
    const stakedEventFilter = liquidityPool.filters.Staked();
    const stakedEvents = await liquidityPool.queryFilter(stakedEventFilter);
    const stakers = [...new Set(stakedEvents.map(event => event.args._user))];

    for (let j = 0; j < stakers.length; j++){
      const claimLiquidityRewards = (await liquidityPool.populateTransaction.claimLiquidityRewards(stakers[j])).data;
      liquidityDatas.push(claimLiquidityRewards);
    }

    const executeCreatorRewards = (await liquidityPool.populateTransaction.executeCreatorRewards()).data;
    liquidityDatas.push(executeCreatorRewards);

    const pointsToWin = Number(await liquidityPool.pointsToWin());
    for (let j = 0; j < winnersData.length; j++){
      if (winnersData[j].points >= pointsToWin) {
        const claimBettorRewards = (await liquidityPool.populateTransaction.claimBettorRewards(
          winnersData[j].rankIndex,
          winnersData[j].firstSharedIndex,
          winnersData[j].endSharedIndex
        )).data;
        liquidityDatas.push(claimBettorRewards);
      }
    }
  }

  if (datas.length === 0) {
    console.log('nothing to distribute, reimbursing players');
    const numberOfTokens = await market.nextTokenID();
    for (let i = 0; i < numberOfTokens; i++) {
      try {
        await market.callStatic.reimbursePlayer(i);

        const reimbursePlayer = (await market.populateTransaction.reimbursePlayer(i)).data;
        datas.push(reimbursePlayer);
      } catch (e) {
        console.log(`player ${i} already reimbursed`);
      }
    }

    return {datas: datas, liquidityDatas: liquidityDatas};
  }

  if (totalClaimed === datas.length) {
    console.log('prizes already claimed');
    return {datas: [], liquidityDatas: liquidityDatas};
  }

  if (endSharedIndex < marketData.prizes.length) {
    console.log("Distributing remaining prizes for this market")
    const remainingPrizes = (await market.populateTransaction.distributeRemainingPrizes()).data;
    datas.push(remainingPrizes);
  }

  return {datas: datas, liquidityDatas: liquidityDatas};
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });