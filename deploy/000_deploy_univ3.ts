/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint no-empty: "off" */

import fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployOptions } from "hardhat-deploy/types";

// Contract names
const UNISWAP_V3_FACTORY_CONTRACT = "UniswapV3Factory";
const UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT = "NonfungibleTokenPositionDescriptor";
const UNISWAP_V3_NFT_MANAGER_CONTRACT = "NonfungiblePositionManager";
const UNISWAP_V3_STAKER_CONTRACT = "UniswapV3Staker";
const WETH_CONTRACT = "WETH";

// Library names
const NFT_DESCRIPTOR_LIBRARY = "NFTDescriptor";

// Address book
interface AddressBook {
  wrappedNative: string;
  uniswapV3Factory: string;
  uniswapV3NftDescriptor: string;
  uniswapV3NftManager: string;
  uniswapV3Staker: string;
}
let addressBook: AddressBook | undefined;

//
// Utility functions
//

function loadAddresses(network: string): void {
  try {
    addressBook = JSON.parse(
      fs
        .readFileSync(`${__dirname}/../src/addresses/${network}.json`)
        .toString()
    );
  } catch (e) {}
}

function loadDeployment(network: string, contract: string): string | undefined {
  try {
    const deployment = JSON.parse(
      fs
        .readFileSync(`${__dirname}/../deployments/${network}/${contract}.json`)
        .toString()
    );
    if (deployment.address) return deployment.address;
  } catch (e) {}

  // Address not found
  return;
}

const getContractAddress = (
  contractSymbol: string,
  contractName: string,
  network: string
): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook[contractSymbol])
    return addressBook[contractSymbol];

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, contractName);
  if (deploymentAddress) return deploymentAddress;

  // Address not found
  return;
};

function writeAddress(
  network: string,
  contract: string,
  address: string
): void {
  console.log(`Deployed ${contract} to ${address}`);
  const addressFile = `${__dirname}/../deployments/${network}/${contract}.json`;
  fs.writeFileSync(addressFile, JSON.stringify({ address }, undefined, 2));
}

//
// Deploy the Uniswap V3 environment
//

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;
  const { deployer } = await getNamedAccounts();

  const opts: DeployOptions = {
    deterministicDeployment: true,
    from: deployer,
    log: true,
  };

  // Get the network name
  const network = hardhat_re.network.name;
  const chainId = await hardhat_re.getChainId();

  // Log the wallet addresses
  const namedAccounts = await hardhat_re.getNamedAccounts();
  console.log(`Deployer: ${namedAccounts.deployer}`);
  console.log(`Beneficiary: ${namedAccounts.beneficiary}`);

  // Get the contract addresses
  loadAddresses(network);
  let wrappedNativeAddress = getContractAddress(
    "wrappedNative",
    WETH_CONTRACT,
    network
  );
  let uniswapV3FactoryAddress = getContractAddress(
    "uniswapV3Factory",
    UNISWAP_V3_FACTORY_CONTRACT,
    network
  );
  let uniswapV3NftDescriptorAddress = getContractAddress(
    "uniswapV3NftDescriptor",
    UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
    network
  );
  let uniswapV3NftManagerAddress = getContractAddress(
    "uniswapV3NftManager",
    UNISWAP_V3_NFT_MANAGER_CONTRACT,
    network
  );
  let uniswapV3StakerAddress = getContractAddress(
    "uniswapV3Staker",
    UNISWAP_V3_STAKER_CONTRACT,
    network
  );

  // Deploy wrapped native token
  if (wrappedNativeAddress) {
    console.log(`Using ${WETH_CONTRACT} at ${wrappedNativeAddress}`);
  } else {
    console.log(`Deploying ${WETH_CONTRACT}`);
    const tx = await deployments.deploy(WETH_CONTRACT, opts);
    wrappedNativeAddress = tx.address;
  }

  // Deploy uniswapV3Factory
  if (uniswapV3FactoryAddress) {
    console.log(
      `Using ${UNISWAP_V3_FACTORY_CONTRACT} at ${uniswapV3FactoryAddress}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_FACTORY_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_FACTORY_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    uniswapV3FactoryAddress = tx.address;
  }

  //
  // Deploy UniswapV3NFTDescriptor
  //
  // TODO: This contract must be deployed with the ethers contract factory
  // because it requires a library, and as a result deployment files are
  // not generated. This is a known issue with hardhat-deploy.
  //
  if (uniswapV3NftDescriptorAddress && network !== "hardhat") {
    console.log(
      `Using ${UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT} at ${uniswapV3NftDescriptorAddress}`
    );
  } else {
    // Deploy NFTDescriptor
    console.log(`Deploying ${NFT_DESCRIPTOR_LIBRARY}`);
    const NFTDescriptor = await ethers.getContractFactory(
      NFT_DESCRIPTOR_LIBRARY,
      opts
    );
    const nftDescriptor = await NFTDescriptor.deploy();

    // Deploy UniswapV3NFTDescriptor
    console.log(`Deploying ${UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT}`);
    const UniswapV3NftDescriptor = await ethers.getContractFactory(
      UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
      {
        ...opts,
        libraries: {
          NFTDescriptor: nftDescriptor.address,
        },
      }
    );
    const uniswapV3NftDescriptor = await UniswapV3NftDescriptor.deploy(
      wrappedNativeAddress,
      ethers.utils.formatBytes32String("W-ETH")
    );
    uniswapV3NftDescriptorAddress = uniswapV3NftDescriptor.address;
  }

  // Mine the next block to commit contractfactory deployment
  await ethers.provider.send("evm_mine", []);

  // Deploy UniswapV3NftManager
  if (uniswapV3NftManagerAddress) {
    console.log(
      `Using ${UNISWAP_V3_NFT_MANAGER_CONTRACT} at ${uniswapV3NftManagerAddress}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_NFT_MANAGER_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_NFT_MANAGER_CONTRACT, {
      ...opts,
      args: [
        uniswapV3FactoryAddress,
        wrappedNativeAddress,
        uniswapV3NftDescriptorAddress,
      ],
    });
    uniswapV3NftManagerAddress = tx.address;
  }

  // Deploy UniswapV3Staker
  if (uniswapV3StakerAddress) {
    console.log(
      `Using ${UNISWAP_V3_STAKER_CONTRACT} at ${uniswapV3StakerAddress}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_STAKER_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_STAKER_CONTRACT, {
      ...opts,
      args: [
        uniswapV3FactoryAddress,
        uniswapV3NftManagerAddress,
        0, // maxIncentiveStartLeadTime
        ethers.constants.MaxUint256, // maxIncentiveDuration
      ],
    });
    uniswapV3StakerAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  // Created directory if it doesn't exist
  const deploymentDir = `${__dirname}/../deployments/${network}`;
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  // Create .chainId, needed for hardhat-deploy, if it doesn't exist
  const chainIdFile = `${__dirname}/../deployments/${network}/.chainId`;
  if (!fs.existsSync(chainIdFile)) {
    fs.writeFileSync(chainIdFile, chainId);
  }

  writeAddress(
    network,
    UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
    uniswapV3NftDescriptorAddress
  );
};

export default func;
func.tags = ["UniswapV3"];
