/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-abi-exporter";
import "hardhat-deploy";
import "hardhat-gas-reporter";

import { HardhatUserConfig } from "hardhat/config";
import { HttpNetworkUserConfig } from "hardhat/types";

// read MNEMONIC from env variable
const mnemonic = process.env.MNEMONIC;

const infuraNetwork = (
  network: string,
  chainId?: number,
  gas?: number
): HttpNetworkUserConfig => {
  return {
    url: `https://${network}.infura.io/v3/${process.env.PROJECT_ID}`,
    chainId,
    gas,
    accounts: mnemonic ? { mnemonic } : undefined,
  };
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: mnemonic ? { mnemonic } : undefined,
      allowUnlimitedContractSize: true,
      saveDeployments: true,
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: mnemonic ? { mnemonic } : undefined,
      allowUnlimitedContractSize: true,
      saveDeployments: true,
    },
    docker: {
      url: "http://hardhat:8545",
      accounts: mnemonic ? { mnemonic } : undefined,
    },
    mainnet: infuraNetwork("mainnet", 1, 6283185),
    goerli: infuraNetwork("goerli", 5, 6283185),
    polygon_mumbai: infuraNetwork("polygon-mumbai", 80001),
    arbitrum_goerli: infuraNetwork("arbitrum-goerli", 421613),
    optimism_goerli: infuraNetwork("optimism-goerli", 420),
  },
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
      {
        // Required by OpenZeppelin V3
        // Required by Uniswap V3
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
      {
        // Required by Aave V2
        version: "0.6.12",
        settings: {
          evmVersion: "berlin",
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
      {
        // Required by Cartesi token
        // Required by OpenZeppelin V2
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
  },
  paths: {
    artifacts: "artifacts",
    deploy: "deploy",
    deployments: "deployments",
  },
  abiExporter: {
    // Path to ABI export directory (relative to Hardhat root)
    path: "./src/abi",
    // Whether to automatically export ABIs during compilation
    runOnCompile: true,
    // Whether to delete old files in path
    clear: true,
    // Whether to use interface-style formatting of output for better readability
    pretty: true,
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  external: {
    deployments: {
      localhost: ["deployments/localhost"],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    beneficiary: {
      default: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

export default config;
