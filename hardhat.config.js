require("@nomiclabs/hardhat-waffle");
require("@reality.eth/contracts")
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
const { mnemonic, etherscanApiKey, alchemyKey, blockscoutApiKey, PK } = require('./secrets.json');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const FORK_GNOSIS = false;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: false
            }
          }
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 31337,
      forking: FORK_GNOSIS ? {
        url: "https://rpc.gnosischain.com"
      } : undefined,
      loggingEnabled: FORK_GNOSIS ? true : false,
    },
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${alchemyKey}`,
      chainId: 42,
      accounts: [PK]
    },
    gnosis: {
      url: 'https://rpc.gnosischain.com/',
      accounts: [PK],
      chainId: 100,
      gasPrice: 5000000000
    },
    xdai: {
      url: 'https://rpc.gnosischain.com/',
      accounts: [PK],
      chainId: 100,
      gasPrice: 5000000000
    },
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com/',
      accounts: [PK],
      chainId: 80001,
      gasPrice: 5000000000
    }
  },
  etherscan: {
    customChains: [
      {
        network: "gnosis",
        chainId: 100,
        urls: {
          // 3) Select to what explorer verify the contracts
          // Gnosisscan
          //apiURL: "https://api.gnosisscan.io/api",
          //browserURL: "https://gnosisscan.io/",
          // Blockscout
          apiURL: "https://blockscout.com/xdai/mainnet/api",
          browserURL: "https://blockscout.com/xdai/mainnet",
        },
      },
    ],
    apiKey: {
      mainnet: etherscanApiKey,
      kovan: etherscanApiKey,
      xdai: blockscoutApiKey,
      sokol: "no-api-key-needed"
    }
  }
  
};

