/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "ethers";
import * as hardhat from "hardhat";
import { DeploymentsExtension } from "hardhat-deploy/types";

import { getAddressBook } from "../addressBook";
import {
  assetTokenAbi,
  baseTokenAbi,
  curveAavePoolerAbi,
  curveAaveStakerAbi,
  lpSftAbi,
  uniV3PoolerAbi,
  uniV3StakerAbi,
  uniV3SwapperAbi,
} from "../contracts/dapp";
import {
  aTokenAbi,
  curveTokenV3Artifact,
  liquidityGaugeArtifact,
  stableSwapAaveArtifact,
  uniswapV3FactoryAbi,
  uniswapV3NftManagerAbi,
  uniswapV3PoolAbi,
  uniswapV3StakerAbi,
} from "../contracts/depends";
import { daiTokenAbi, usdcTokenAbi, usdtTokenAbi } from "../contracts/testing";
import { AddressBook, ContractLibrary } from "../interfaces";

//
// Fixture setup
//

async function setupFixture({
  deployments,
}: {
  deployments: DeploymentsExtension;
}): Promise<ContractLibrary> {
  // Ensure we start from a fresh deployment
  await deployments.fixture();

  // Get the beneficiary signer
  const signers = await hardhat.ethers.getSigners();
  const beneficiary: SignerWithAddress = signers[1];

  // Get network name
  const networkName: string = hardhat.network.name;

  // Load contract addresses
  const addressBook: AddressBook = await getAddressBook(networkName);

  // Construct the contracts for beneficiary wallet
  const adaiTokenContract = new ethers.Contract(
    addressBook.adaiToken,
    aTokenAbi,
    beneficiary
  );
  const adaiTokenProxyContract = new ethers.Contract(
    addressBook.adaiTokenProxy,
    aTokenAbi,
    beneficiary
  );
  const assetTokenContract = new ethers.Contract(
    addressBook.assetToken,
    assetTokenAbi,
    beneficiary
  );
  const ausdcTokenContract = new ethers.Contract(
    addressBook.ausdcToken,
    aTokenAbi,
    beneficiary
  );
  const ausdcTokenProxyContract = new ethers.Contract(
    addressBook.ausdcTokenProxy,
    aTokenAbi,
    beneficiary
  );
  const ausdtTokenContract = new ethers.Contract(
    addressBook.ausdtToken,
    aTokenAbi,
    beneficiary
  );
  const ausdtTokenProxyContract = new ethers.Contract(
    addressBook.ausdtTokenProxy,
    aTokenAbi,
    beneficiary
  );
  const baseTokenContract = new ethers.Contract(
    addressBook.baseToken,
    baseTokenAbi,
    beneficiary
  );
  const daiTokenContract = new ethers.Contract(
    addressBook.daiToken,
    daiTokenAbi,
    beneficiary
  );
  const curveAaveGaugeContract = new ethers.Contract(
    addressBook.curveAaveGauge,
    JSON.stringify(liquidityGaugeArtifact.abi), // Work around TypeScript problem
    beneficiary
  );
  const curveAaveLpTokenContract = new ethers.Contract(
    addressBook.curveAaveLpToken,
    JSON.stringify(curveTokenV3Artifact.abi), // Work around TypeScript problem
    beneficiary
  );
  const curveAavePoolContract = new ethers.Contract(
    addressBook.curveAavePool,
    JSON.stringify(stableSwapAaveArtifact.abi), // Work around TypeScript problem
    beneficiary
  );
  const curveAavePoolerContract = new ethers.Contract(
    addressBook.curveAavePooler,
    curveAavePoolerAbi,
    beneficiary
  );
  const curveAaveStakerContract = new ethers.Contract(
    addressBook.curveAaveStaker,
    curveAaveStakerAbi,
    beneficiary
  );
  const lpSftContract = new ethers.Contract(
    addressBook.lpSft,
    lpSftAbi,
    beneficiary
  );
  const uniswapV3FactoryContract = new ethers.Contract(
    addressBook.uniswapV3Factory,
    uniswapV3FactoryAbi,
    beneficiary
  );
  const uniswapV3NftManagerContract = new ethers.Contract(
    addressBook.uniswapV3NftManager,
    uniswapV3NftManagerAbi,
    beneficiary
  );
  const uniswapV3PoolContract = new ethers.Contract(
    addressBook.uniswapV3Pool,
    uniswapV3PoolAbi,
    beneficiary
  );
  const uniswapV3StakerContract = new ethers.Contract(
    addressBook.uniswapV3Staker,
    uniswapV3StakerAbi,
    beneficiary
  );
  const uniV3PoolerContract = new ethers.Contract(
    addressBook.uniV3Pooler,
    uniV3PoolerAbi,
    beneficiary
  );
  const uniV3StakerContract = new ethers.Contract(
    addressBook.uniV3Staker,
    uniV3StakerAbi,
    beneficiary
  );
  const uniV3SwapperContract = new ethers.Contract(
    addressBook.uniV3Swapper,
    uniV3SwapperAbi,
    beneficiary
  );
  const usdcTokenContract = new ethers.Contract(
    addressBook.usdcToken,
    usdcTokenAbi,
    beneficiary
  );
  const usdtTokenContract = new ethers.Contract(
    addressBook.usdtToken,
    usdtTokenAbi,
    beneficiary
  );

  return {
    adaiTokenContract,
    adaiTokenProxyContract,
    assetTokenContract,
    ausdcTokenContract,
    ausdcTokenProxyContract,
    ausdtTokenContract,
    ausdtTokenProxyContract,
    baseTokenContract,
    daiTokenContract,
    curveAaveGaugeContract,
    curveAaveLpTokenContract,
    curveAavePoolContract,
    curveAavePoolerContract,
    curveAaveStakerContract,
    lpSftContract,
    uniswapV3FactoryContract,
    uniswapV3NftManagerContract,
    uniswapV3PoolContract,
    uniswapV3StakerContract,
    uniV3PoolerContract,
    uniV3StakerContract,
    uniV3SwapperContract,
    usdcTokenContract,
    usdtTokenContract,
  };
}

export { setupFixture };
