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
  let firstSharedIndex = 0;
  let endSharedIndex = 0;
  for (rankIndex = 0; rankIndex < marketData.prizes.length; rankIndex++) {
    let currentRankPoints = bets[firstSharedIndex].points;
    for (let i = firstSharedIndex; i < bets.length; i++) {
      if (currentRankPoints > bets[i].points) {break;}
      else {endSharedIndex = i;}
    }
    for (let j=0; j<=endSharedIndex-firstSharedIndex; j++){
      // console.log('Claim inputs:', rankIndex+j, currentRankPoints, firstSharedIndex, endSharedIndex)
      const claimReward = (await market.populateTransaction.claimRewards(rankIndex+j, firstSharedIndex, endSharedIndex)).data;
      datas.push(claimReward);
    }
    
    if (endSharedIndex >= marketData.prizes.length) break;
    firstSharedIndex = endSharedIndex+1
    endSharedIndex = firstSharedIndex
  }
  
  if (endSharedIndex < marketData.prizes.length) {
    // console.log("Distributing remaining prizes for this market")
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