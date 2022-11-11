/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

import { ethers } from "ethers";
import fs from "fs";

// TODO: Fully qualified contract names
const MASTER_CHEF_V2_CONTRACT = "MiniChefV2";
const UNI_V2_ROUTER_CONTRACT = "UniswapV2Router02";
const USDC_CONTRACT = "USDC";
const WMATIC_CONTRACT = "WMATIC";

// Path to generated address file
const GENERATED_ADDRESSES = `${__dirname}/../addresses.json`;

// Constants (observed on 2022-06-24)
const MATIC_PRICE = 61; // In hundredths ($0.61)
const WMATIC_ASSETS = ethers.constants.WeiPerEther.mul(549072); // About $322,869
const USDC_ASSETS = ethers.BigNumber.from(1000000).mul(322625); // About $322,625
const MATIC_BALANCE = ethers.utils
  .parseEther("1000000.0")
  .mul(100)
  .div(MATIC_PRICE); // About 1,639,000 MATIC ($1,000,000)

/**
 * Steps to deploy the Retro Dapp environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { execute, read } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  //
  // Load contract addresses
  //
  // TODO: Load addresses from deployments folder
  //
  let generatedNetworks = {};

  try {
    generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
  } catch (err) {
    console.log(`Skipping addresses.json: ${err}`);
  }

  const generatedAddresses = generatedNetworks[chainId] || {};

  //////////////////////////////////////////////////////////////////////////////
  //
  // Seed the WMATIC-USDC pool with some funds
  //
  //////////////////////////////////////////////////////////////////////////////

  // Send the deployer some MATIC
  await hardhat_re.network.provider.request({
    method: "hardhat_setBalance",
    params: [deployer, MATIC_BALANCE.toHexString().replace(/0x0+/, "0x")],
  });

  // Check for previously seeded
  const wmaticBalance = await read(
    WMATIC_CONTRACT,
    { from: deployer, log: true },
    "balanceOf",
    deployer
  );

  if (wmaticBalance.lt(WMATIC_ASSETS)) {
    console.log("Adding funds to WMATIC contract");

    // Deposit MATIC
    await execute(
      WMATIC_CONTRACT,
      {
        from: deployer,
        log: true,
        value: WMATIC_ASSETS.sub(wmaticBalance),
      },
      "deposit"
    );
  }

  // Check for previously seeded
  const usdcBalance = await read(
    USDC_CONTRACT,
    { from: deployer, log: true },
    "balanceOf",
    deployer
  );

  if (usdcBalance.lt(USDC_ASSETS)) {
    console.log("Adding funds to USDC contract");

    // Mint USDC
    await execute(
      USDC_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "mint",
      deployer,
      USDC_ASSETS.sub(usdcBalance)
    );
  }

  //
  // Approve
  //

  const wmaticAllowance = await read(
    WMATIC_CONTRACT,
    { from: deployer, log: true },
    "allowance",
    deployer,
    generatedAddresses.uniV2Router
  );

  if (wmaticAllowance.lt(WMATIC_ASSETS)) {
    console.log("Approving WMATIC transfer");

    // Approve WMATIC
    await execute(
      WMATIC_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "approve",
      generatedAddresses.uniV2Router,
      WMATIC_ASSETS.sub(wmaticAllowance)
    );
  }

  const usdcAllowance = await read(
    USDC_CONTRACT,
    { from: deployer, log: true },
    "allowance",
    deployer,
    generatedAddresses.uniV2Router
  );

  if (usdcAllowance.lt(USDC_ASSETS)) {
    console.log("Approving USDC transfer");

    // Approve USDC
    await execute(
      USDC_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "approve",
      generatedAddresses.uniV2Router,
      USDC_ASSETS.sub(usdcAllowance)
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Seed the WMATIC-USDC pool with some funds in return for SushiLP (SushiSwap
  // LP Pool)
  //
  //////////////////////////////////////////////////////////////////////////////

  console.log("Adding funds to WMATIC-USDC Uni-V2 pool");

  await execute(
    UNI_V2_ROUTER_CONTRACT,
    {
      from: deployer,
      gasLimit: 2000000, // 2M GWei
      log: true,
    },
    "addLiquidity",
    generatedAddresses.wmatic,
    generatedAddresses.usdcToken,
    WMATIC_ASSETS,
    USDC_ASSETS,
    0,
    0,
    deployer,
    Math.floor(Date.now() / 1000) + 60 * 20 // 20 mins
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Add LP pool to MasterChef V2 (MCV2) contract
  //
  //////////////////////////////////////////////////////////////////////////////

  console.log("Checking if LP pool has been added to MasterChef V2 contract");

  const tokenAdded = await read(
    MASTER_CHEF_V2_CONTRACT,
    { from: deployer, log: true },
    "addedTokens",
    generatedAddresses.wmaticUsdcPair
  );

  if (tokenAdded) {
    console.log("LP pool already added to MasterChef V2 contract");
  } else {
    console.log("Adding LP pool to MasterChef V2 contract");

    // Allocation point is a multiplier to the farm's base rate, based on
    // liquidity, to incentivize more LP participants
    const allocPoint = 1; // TODO

    await execute(
      MASTER_CHEF_V2_CONTRACT,
      {
        from: deployer,
        gasLimit: 2000000, // 2M GWei
        log: true,
      },
      "add",
      allocPoint,
      generatedAddresses.wmaticUsdcPair,
      generatedAddresses.sushiRewarder
    );
  }
};

module.exports = func;
module.exports.tags = ["Deploy"];
