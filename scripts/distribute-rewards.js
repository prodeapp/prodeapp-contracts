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

const marketAddress = "";
const transactionBatcher = "0xA73A872eFD768bb23efb24CEeB9e330bcCA259D6";
const subgraphUrl = "https://api.thegraph.com/subgraphs/name/prodeapp/prodeapp";

async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();

  console.log("Account balance:", (await signer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const graph = new GraphQLClient(subgraphUrl);

  const { bets, market: marketData } = await graph.request(
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

  const Market = await ethers.getContractFactory("Market");
  const market = await Market.attach(marketAddress);

  let datas = [];
  let rankIndex = 0;
  let previousPoints = bets[0].points;
  for (let i = 0; i < bets.length; i++) {
    rankIndex = previousPoints == bets[i].points ? rankIndex : i;
    if (rankIndex >= marketData.prizes.length) break;

    // TODO: support shared prizes
    const claimReward = (await market.populateTransaction.claimRewards(i, rankIndex, rankIndex)).data;
    datas.push(claimReward);
    
    previousPoints = bets[i].points;
  }
  if (datas.length < marketData.prizes.length) {
    const remainingPrizes = (await market.populateTransaction.distributeRemainingPrizes()).data;
    datas.push(remainingPrizes);
  } else if (datas.length == 0) {
    return;
  }

  const batcherContract = new ethers.Contract(transactionBatcher, BATCHER_ABI, signer);
  await batcherContract.batchSend(
    Array(datas.length).fill(marketAddress),
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