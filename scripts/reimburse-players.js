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

const tournamentAddress = "0xd5b6f4a82d4750a890166282ac0342d840ff2cc4";
const transactionBatcher = "0xA73A872eFD768bb23efb24CEeB9e330bcCA259D6";

async function main() {
  const chainId = hre.network.config.chainId;
  const [signer] = await ethers.getSigners();

  console.log("Account balance:", (await signer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const Tournament = await ethers.getContractFactory("Tournament");
  const tournament = await Tournament.attach(tournamentAddress);

  const numberOfTokens = await tournament.nextTokenID();
  let datas = [];
  for (let i = 0; i < numberOfTokens; i++) {
    const reimbursePlayer = (await tournament.populateTransaction.reimbursePlayer(i)).data;
    datas.push(reimbursePlayer);
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