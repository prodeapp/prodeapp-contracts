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
          events {
            id
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

  for (const market of markets) {
    console.log(`${market.name} (${market.id})`);
    await processMarket(market.id, signer);
  }
}

async function processMarket(marketAddress, signer) {
  const Market = await ethers.getContractFactory("Market");
  const market = await Market.attach(marketAddress);

  try {
    await market.callStatic.registerAvailabilityOfResults();
  } catch (e) {
    console.log(`Market has pending answers`);
    return;
  }

  const { bets, market: marketData } = await graph.request(
    gql`
      query rankingQuery($marketAddress: String) {
        bets(where: {market: $marketAddress, points_not: 0}, orderBy: points, orderDirection: desc) {
          tokenID
          points
        }
        market(id: $marketAddress) {
          prizes
        }
      }
    `,
      {
        marketAddress: marketAddress
      }
  );

  const passPeriod = (await market.populateTransaction.registerAvailabilityOfResults()).data;
  let datas = [passPeriod];

  if (bets.length > 0) {
    let rankIndex = 0;
    let previousPoints = bets[0].points;
    console.log("TokenID - Ranking - DuplicateRanking")
    for (let i = 0; i < bets.length; i++) {
      rankIndex = previousPoints == bets[i].points ? rankIndex : i;
      if (rankIndex >= marketData.prizes.length) break;

      const registerPoints = (await market.populateTransaction.registerPoints(bets[i].tokenID, rankIndex, i - rankIndex)).data;
      datas.push(registerPoints);

      previousPoints = bets[i].points;
      console.log(bets[i].tokenID, ' - ', rankIndex, ' - ', i - rankIndex)
    }
  }

  // Distribute management fees
  const marketInfo = await market.marketInfo();
  const Manager = await ethers.getContractFactory("Manager");
  const manager = await Manager.attach(marketInfo.manager);
  const distributeRewards = (await manager.populateTransaction.distributeRewards()).data;
  datas.push(distributeRewards);
  const executeCreatorRewards = (await manager.populateTransaction.executeCreatorRewards()).data;
  datas.push(executeCreatorRewards);
  const executeProtocolRewards = (await manager.populateTransaction.executeProtocolRewards()).data;
  datas.push(executeProtocolRewards);

  const batcherContract = new ethers.Contract(transactionBatcher, BATCHER_ABI, signer);
  await batcherContract.batchSend(
    Array(datas.length - 3).fill(marketAddress).concat(Array(3).fill(marketInfo.manager)),
    Array(datas.length).fill(0),
    datas
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });