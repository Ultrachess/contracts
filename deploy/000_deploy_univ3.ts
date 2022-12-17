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

import { getAddressBook, writeAddress } from "../src/addressBook";
import {
  NFT_DESCRIPTOR_CONTRACT,
  UNISWAP_V3_FACTORY_CONTRACT,
  UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
  UNISWAP_V3_NFT_MANAGER_CONTRACT,
  UNISWAP_V3_STAKER_CONTRACT,
  WRAPPED_NATIVE_CONTRACT,
} from "../src/contracts/depends";
import { AddressBook } from "../src/interfaces";

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
  const networkName = hardhat_re.network.name;
  const chainId = await hardhat_re.getChainId();

  // Log the wallet addresses
  const namedAccounts = await hardhat_re.getNamedAccounts();
  console.log(`Deployer: ${namedAccounts.deployer}`);
  console.log(`Beneficiary: ${namedAccounts.beneficiary}`);

  // Get the contract addresses
  const addressBook: AddressBook = await getAddressBook(networkName);

  // Deploy wrapped native token
  if (addressBook.wrappedNative) {
    console.log(
      `Using ${WRAPPED_NATIVE_CONTRACT} at ${addressBook.wrappedNative}`
    );
  } else {
    console.log(`Deploying ${WRAPPED_NATIVE_CONTRACT}`);
    const tx = await deployments.deploy(WRAPPED_NATIVE_CONTRACT, opts);
    addressBook.wrappedNative = tx.address;
  }

  // Deploy uniswapV3Factory
  if (addressBook.uniswapV3Factory) {
    console.log(
      `Using ${UNISWAP_V3_FACTORY_CONTRACT} at ${addressBook.uniswapV3Factory}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_FACTORY_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_FACTORY_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    addressBook.uniswapV3Factory = tx.address;
  }

  //
  // Deploy UniswapV3NFTDescriptor
  //
  // TODO: This contract must be deployed with the ethers contract factory
  // because it requires a library, and as a result deployment files are
  // not generated. This is a known issue with hardhat-deploy.
  //
  if (addressBook.uniswapV3NftDescriptor && networkName !== "hardhat") {
    console.log(
      `Using ${UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT} at ${addressBook.uniswapV3NftDescriptor}`
    );
  } else {
    // Deploy NFTDescriptor
    console.log(`Deploying ${NFT_DESCRIPTOR_CONTRACT}`);
    const NFTDescriptor = await ethers.getContractFactory(
      NFT_DESCRIPTOR_CONTRACT,
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
      addressBook.wrappedNative,
      ethers.utils.formatBytes32String("W-ETH")
    );
    addressBook.uniswapV3NftDescriptor = uniswapV3NftDescriptor.address;
  }

  // Mine the next block to commit contractfactory deployment
  await ethers.provider.send("evm_mine", []);

  // Deploy UniswapV3NftManager
  if (addressBook.uniswapV3NftManager) {
    console.log(
      `Using ${UNISWAP_V3_NFT_MANAGER_CONTRACT} at ${addressBook.uniswapV3NftManager}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_NFT_MANAGER_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_NFT_MANAGER_CONTRACT, {
      ...opts,
      args: [
        addressBook.uniswapV3Factory,
        addressBook.wrappedNative,
        addressBook.uniswapV3NftDescriptor,
      ],
    });
    addressBook.uniswapV3NftManager = tx.address;
  }

  // Deploy UniswapV3Staker
  if (addressBook.uniswapV3Staker) {
    console.log(
      `Using ${UNISWAP_V3_STAKER_CONTRACT} at ${addressBook.uniswapV3Staker}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_STAKER_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_STAKER_CONTRACT, {
      ...opts,
      args: [
        addressBook.uniswapV3Factory,
        addressBook.uniswapV3NftManager,
        0, // maxIncentiveStartLeadTime
        ethers.constants.MaxUint256, // maxIncentiveDuration
      ],
    });
    addressBook.uniswapV3Staker = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  // Created directory if it doesn't exist
  const deploymentDir = `${__dirname}/../deployments/${networkName}`;
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  // Create .chainId, needed for hardhat-deploy, if it doesn't exist
  const chainIdFile = `${__dirname}/../deployments/${networkName}/.chainId`;
  if (!fs.existsSync(chainIdFile)) {
    fs.writeFileSync(chainIdFile, chainId);
  }

  writeAddress(
    networkName,
    UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
    addressBook.uniswapV3NftDescriptor
  );
};

export default func;
func.tags = ["UniswapV3"];
