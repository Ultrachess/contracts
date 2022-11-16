/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint no-empty: "off" */

import "hardhat-deploy";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { getAddressBook } from "../src/addressBook";
import {
  BASE_TOKEN_CONTRACT,
  UNI_V3_POOLER_CONTRACT,
} from "../src/contracts/dapp";
import { USDC_TOKEN_CONTRACT } from "../src/contracts/testing";
import { AddressBook } from "../src/interfaces";

//
// Mint the deployer an LP NFT
//

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;

  const { execute } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get the network name
  const networkName = hardhat_re.network.name;

  // Load the contract addresses
  const addressBook: AddressBook = await getAddressBook(networkName);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Mint the deployer an LP NFT to initialize the Uniswap V3 liquidity pool
  //
  //////////////////////////////////////////////////////////////////////////////

  // Amount to mint
  const USDC_AMOUNT = ethers.utils.parseUnits("1", 6); // 1 USDC
  const BASE_TOKEN_AMOUNT = ethers.utils.parseUnits("1", 18); // 1 token

  // Calculate the fee consumed by the Curve Aave pool
  const CURVE_AAVE_FEE_BIPS = 3; // 0.03%
  const CURVE_AAVE_FEE_USDC = USDC_AMOUNT.mul(CURVE_AAVE_FEE_BIPS).div(10_000);

  //
  // Approve deployer's USDC
  //

  console.log("Approving deployer's USDC");

  await execute(
    USDC_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "approve",
    addressBook.uniV3Pooler,
    USDC_AMOUNT.add(CURVE_AAVE_FEE_USDC)
  );

  //
  // Approve deployer's base token
  //

  console.log("Approving deployer's base token");

  await execute(
    BASE_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "approve",
    addressBook.uniV3Pooler,
    BASE_TOKEN_AMOUNT
  );

  //
  // Mint LP NFT
  //

  console.log("Minting LP NFT to deployer");

  await execute(
    UNI_V3_POOLER_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "mintNFTImbalance",
    [0, USDC_AMOUNT.add(CURVE_AAVE_FEE_USDC), 0], // DAI, USDC, USDT
    BASE_TOKEN_AMOUNT,
    deployer
  );
};

module.exports = func;
module.exports.tags = ["MintLpNft"];
