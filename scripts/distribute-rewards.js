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

const tournamentAddress = "0xb53c73b48294f5c3c9025f65b247ce8d50c4d345";
const transactionBatcher = "0xA73A872eFD768bb23efb24CEeB9e330bcCA259D6";
const subgraphUrl = "https://api.thegraph.com/subgraphs/name/prodeapp/prodeapp";

async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();

  console.log("Account balance:", (await signer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const graph = new GraphQLClient(subgraphUrl);

  const { bets, tournament: tournamentData } = await graph.request(
    gql`
      query rankingQuery($tournamentAddressStart: String, $tournamentAddressEnd: String) {
        bets(where: {id_gt: $tournamentAddressStart, id_lt: $tournamentAddressEnd, points_not: 0}, orderBy: points, orderDirection: desc) {
          points
        }
        tournament(id: $tournamentAddressStart) {
          prizes
        }
      }
    `,
      {
        tournamentAddressStart: tournamentAddress,
        tournamentAddressEnd: tournamentAddress.replace(/.$/,"Z"),
      }
  );

  const Tournament = await ethers.getContractFactory("Tournament");
  const tournament = await Tournament.attach(tournamentAddress);

  let datas = [];
  let rankIndex = 0;
  let previousPoints = bets[0].points;
  for (let i = 0; i < bets.length; i++) {
    rankIndex = previousPoints == bets[i].points ? rankIndex : i;
    if (rankIndex >= tournamentData.prizes.length) break;

    const claimReward = (await tournament.populateTransaction.claimRewards(i)).data;
    datas.push(claimReward);
    
    previousPoints = bets[i].points;
  }
  if (datas.length < tournamentData.prizes.length) {
    const remainingPrizes = (await tournament.populateTransaction.distributeRemainingPrizes()).data;
    datas.push(remainingPrizes);
  } else if (datas.length == 0) {
    return;
  }

  const batcherContract = new ethers.Contract(transactionBatcher, BATCHER_ABI, signer);
  await batcherContract.batchSend(
    Array(datas.length).fill(tournamentAddress),
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