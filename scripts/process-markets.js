const { gql, GraphQLClient } = require('graphql-request')

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

const transactionBatcher = "0xA73A872eFD768bb23efb24CEeB9e330bcCA259D6";
const subgraphUrl = "https://api.thegraph.com/subgraphs/name/prodeapp/prodeapp";
const graph = new GraphQLClient(subgraphUrl);

async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();

  console.log("Account balance:", ethers.utils.formatUnits((await signer.getBalance()).toString(), 18));
  console.log("Chain Id:", chainId);
  
  // fetch candidate markets
  const { markets } = await graph.request(
    gql`
      query marketsQuery($closingTime: Int!) {
        markets(where: {resultSubmissionPeriodStart: 0, closingTime_lt: $closingTime, hasPendingAnswers: false}) {
          id
          name
          bets {
            claim
          }
        }
      }
    `, {
      closingTime: Math.floor(Date.now() / 1000)
    }
  );

  if (markets.length === 0) {
    console.log('No markets found');
    return;
  }

  const args = {targets: [], values: [], datas: []};

  const LiquidityFactory = await ethers.getContractFactory("LiquidityFactory");
  const liquidityFactory = await LiquidityFactory.attach("0x6bbe06d775445f052b9684d98f80161921e67d2a");

  for (const market of markets) {
    console.log("");
    console.log(`${market.name} (${market.id})`);
    const Market = await ethers.getContractFactory("Market");
    const marketContract = await Market.attach(market.id);

    try {
      await market.callStatic.registerAvailabilityOfResults();
    } catch (e) {
      console.log(`Market has pending answers`);
      continue;
    }

    const passPeriod = (await market.populateTransaction.registerAvailabilityOfResults()).data;
    args.targets.push(marketAddress);
    args.datas.push(passPeriod);
    args.values.push(0);
  
    const marketInfo = await marketContract.marketInfo();
    const Manager = await ethers.getContractFactory("Manager");
    const manager = await Manager.attach(marketInfo.manager);

    // Distribute Manager rewards
    const distributeRewards = (await manager.populateTransaction.distributeRewards()).data;
    args.datas.push(distributeRewards);
    args.values.push(0);
    args.targets.push(marketInfo.manager);

    const executeCreatorRewards = (await manager.populateTransaction.executeCreatorRewards()).data;
    args.datas.push(executeCreatorRewards);
    args.values.push(0);
    args.targets.push(marketInfo.manager);

    const executeProtocolRewards = (await manager.populateTransaction.executeProtocolRewards()).data;
    args.datas.push(executeProtocolRewards);
    args.values.push(0);
    args.targets.push(marketInfo.manager);

    // Process market
    const creatorAddress = await manager.creator();

    const hasLiquidity = await liquidityFactory.exists(creatorAddress);
    console.log(hasLiquidity);
    let values;
    if (hasLiquidity) {
      console.log(creatorAddress)
      values = await processMarketWithLiquidity(market.id, market.bets.filter(bet => bet.claim).length, signer);
    } else {
      values = await processMarket(market.id, market.bets.filter(bet => bet.claim).length, signer);
    }
    if (values.targets.length > 0) {
      args.targets = args.targets.concat(values.targets);
      args.values = args.values.concat(Array(values.datas.length).fill(0));
      args.datas = args.datas.concat(values.datas);
    }
  }

  if (args.targets.length === 0) {
    console.log('nothing to distribute');
    return;
  }

  const batcherContract = new ethers.Contract(transactionBatcher, BATCHER_ABI, signer);

  console.log(args);
  await batcherContract.batchSend(
    args.targets,
    args.values,
    args.datas
  );

  console.log('distribution completed!');
}

async function processMarketWithLiquidity(marketAddress, totalClaimed, signer) {
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

  const rank0 = await market.ranking(0);
  const rankingRegistered = rank0.points.toNumber() > 0;

  const marketInfo = await market.marketInfo();
  const Manager = await ethers.getContractFactory("Manager");
  const manager = await Manager.attach(marketInfo.manager);
  const creatorAddress = await manager.creator();

  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.attach(creatorAddress);
  const pointsToWin = (await liquidityPool.pointsToWin()).toNumber();
  let poolWinners = 0;

  let datas = [];
  let targets = [];
  
  let firstSharedIndex = 0;
  let endSharedIndex = 0;
  let rankIndex = 0;
  if (rankingRegistered) {
    for (prizeIndex = 0; prizeIndex < marketData.prizes.length; prizeIndex++) {
      if (bets[firstSharedIndex] === undefined) {
        break;
      }
  
      let currentRankPoints = bets[firstSharedIndex].points;
      for (let i = firstSharedIndex; i < bets.length; i++) {
        if (currentRankPoints > bets[i].points) {break;}
        else {endSharedIndex = i;}
      }
      if (currentRankPoints == 0) continue;
  
      for (let j=0; j<=endSharedIndex-firstSharedIndex; j++){
        // console.log('Claim inputs:', rankIndex, currentRankPoints, firstSharedIndex, endSharedIndex)
        const claimReward = (await market.populateTransaction.claimRewards(rankIndex++, firstSharedIndex, endSharedIndex)).data;
        datas.push(claimReward);
        targets.push(marketAddress);
  
        if (currentRankPoints >= pointsToWin) {
          const claimLiquidityReward = (await liquidityPool.populateTransaction.claimBettorRewards(rankIndex++, firstSharedIndex, endSharedIndex)).data;
          datas.push(claimLiquidityReward);
          targets.push(creatorAddress);
          poolWinners++;
        }
      }
  
      if (endSharedIndex >= marketData.prizes.length) break;
      firstSharedIndex = endSharedIndex+1
      endSharedIndex = firstSharedIndex
    }
  }

  if (datas.length === 0) {
    console.log('nothing to distribute, reimbursing players');
    const numberOfTokens = (await market.nextTokenID()).toNumber();
    console.log(numberOfTokens);
    for (let i = 0; i < numberOfTokens; i++) {
      try {
        const reimbursePlayer = (await market.populateTransaction.reimbursePlayer(i)).data;
        datas.push(reimbursePlayer);
        targets.push(marketAddress);
      } catch (e) {
        console.log(`player ${i} already reimbursed`);
      }
    }
    
    return {
      datas: datas,
      targets: targets
    }
  }

  if (totalClaimed === datas.length - poolWinners) {
    console.log('prizes already claimed');
    return [];
  }

  const stakedEventFilter = liquidityPool.filters.Staked();
  const stakedEvents = await liquidityPool.queryFilter(stakedEventFilter);
  const stakers = [...new Set(stakedEvents.map(event => event.args._user))];

  for (let j = 0; j < stakers.length; j++){
    const claimLiquidity = (await liquidityPool.populateTransaction.claimLiquidityRewards(stakers[j])).data;
    datas.push(claimLiquidity);
    targets.push(creatorAddress);
  }

  const executeCreatorRewards = (await liquidityPool.populateTransaction.executeCreatorRewards()).data;
  datas.push(executeCreatorRewards);
  targets.push(creatorAddress);

  if (endSharedIndex < marketData.prizes.length) {
    console.log("Distributing remaining prizes for this market")
    const remainingPrizes = (await market.populateTransaction.distributeRemainingPrizes()).data;
    datas.push(remainingPrizes);
    targets.push(marketAddress);
  }

  return {
    datas: datas,
    targets: targets
  };
}

async function processMarket(marketAddress, totalClaimed, signer) {
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
  let targets = [];
  
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
      const claimReward = (await market.populateTransaction.claimRewards(rankIndex++, firstSharedIndex, endSharedIndex)).data;
      datas.push(claimReward);
      targets.push(marketAddress);
    }

    if (endSharedIndex >= marketData.prizes.length) break;
    firstSharedIndex = endSharedIndex+1
    endSharedIndex = firstSharedIndex
  }

  if (datas.length === 0) {
    console.log('nothing to distribute, reimbursing players');
    const numberOfTokens = await market.nextTokenID();
    for (let i = 0; i < numberOfTokens; i++) {
      try {
        const reimbursePlayer = (await market.populateTransaction.reimbursePlayer(i)).data;
        datas.push(reimbursePlayer);
        targets.push(marketAddress);
      } catch (e) {
        console.log(`player ${i} already reimbursed`);
      }
    }

    return datas;
  }

  if (totalClaimed === datas.length) {
    console.log('prizes already claimed');
    return [];
  }

  if (endSharedIndex < marketData.prizes.length) {
    console.log("Distributing remaining prizes for this market")
    const remainingPrizes = (await market.populateTransaction.distributeRemainingPrizes()).data;
    datas.push(remainingPrizes);
    targets.push(marketAddress);
  }

  return {
    datas: datas,
    targets: targets
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });