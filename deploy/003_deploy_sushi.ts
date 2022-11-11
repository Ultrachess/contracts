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

import fs from "fs";

// TODO: Fully qualified contract names
const MASTER_CHEF_V2_CONTRACT = "MiniChefV2";
const REWARDER_CONTRACT = "RewarderMock";
const SUSHI_CONTRACT = "SUSHI";
const UNI_V2_FACTORY_CONTRACT = "UniswapV2Factory";
const UNI_V2_POOL_FACTORY_CONTRACT = "UniV2PoolFactory";
const UNI_V2_ROUTER_CONTRACT = "UniswapV2Router02";
const USDC_CONTRACT = "USDC";
const WMATIC_CONTRACT = "WMATIC";

// Path to generated address file
const GENERATED_ADDRESSES = `${__dirname}/../addresses.json`;

/**
 * Steps to deploy the Retro Dapp environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy, read } = deployments;
  const { deployer, adminWallet, testWallet } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  const localhost = chainId == 31337;

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

  console.log(`Deployer: ${deployer}`);
  console.log(`Admin: ${adminWallet}`);
  console.log(`Test: ${testWallet}`);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy WMATIC
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.wmatic) {
    console.log(`Using deployed WMATIC contract: ${generatedAddresses.wmatic}`);
  } else {
    console.log("Deploying WMATIC contract");

    const wmaticReceipt = await deploy(WMATIC_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.wmatic = wmaticReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy USDC
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.usdcToken) {
    console.log(
      `Using deployed USDC contract: ${generatedAddresses.usdcToken}`
    );
  } else {
    console.log("Deploying USDC contract");

    const usdcReceipt = await deploy(USDC_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.usdcToken = usdcReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SUSHI
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.sushiToken) {
    console.log(
      `Using deployed SUSHI contract: ${generatedAddresses.sushiToken}`
    );
  } else {
    console.log("Deploying SUSHI contract");

    const sushiTokenReceipt = await deploy(SUSHI_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sushiToken = sushiTokenReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Uni-V2 factory
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.uniV2Factory) {
    console.log(
      `Using deployed UNI-V2 factory: ${generatedAddresses.uniV2Factory}`
    );
  } else {
    console.log("Deploying UNI-V2 factory");

    const uniV2FactoryReceipt = await deploy(UNI_V2_FACTORY_CONTRACT, {
      from: deployer,
      args: [deployer],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.uniV2Factory = uniV2FactoryReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Create WMATIC-USDC LP pair
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.wmaticUsdcPair) {
    console.log(
      `Using deployed WMATIC-USDC LP pair: ${generatedAddresses.wmaticUsdcPair}`
    );
  } else {
    console.log("Deploying WMATIC-USDC LP pair");

    await deploy(UNI_V2_POOL_FACTORY_CONTRACT, {
      from: deployer,
      args: [
        generatedAddresses.uniV2Factory,
        generatedAddresses.wmatic,
        generatedAddresses.usdcToken,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.wmaticUsdcPair = await read(
      UNI_V2_POOL_FACTORY_CONTRACT,
      { from: deployer, log: true },
      "uniV2Pair"
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Uni-V2 router
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.uniV2Router) {
    console.log(
      `Using deployed UNI-V2 router: ${generatedAddresses.uniV2Router}`
    );
  } else {
    console.log("Deploying UNI-V2 router");

    const uniV2RouterReceipt = await deploy(UNI_V2_ROUTER_CONTRACT, {
      from: deployer,
      args: [generatedAddresses.uniV2Factory, generatedAddresses.wmatic],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.uniV2Router = uniV2RouterReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy MasterChef V2 contract (MiniChefV2)
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.masterChefV2) {
    console.log(
      `Using deployed MasterChef V2: ${generatedAddresses.masterChefV2}`
    );
  } else {
    console.log("Deploying MasterChef V2");

    const masterChefV2Receipt = await deploy(MASTER_CHEF_V2_CONTRACT, {
      from: deployer,
      args: [generatedAddresses.sushiToken, deployer],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.masterChefV2 = masterChefV2Receipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SushiSwap rewarder delegate
  //
  //////////////////////////////////////////////////////////////////////////////

  if (!localhost && generatedAddresses.sushiRewarder) {
    console.log(
      `Using deployed SushiSwap rewarder delegate: ${generatedAddresses.sushiRewarder}`
    );
  } else {
    console.log("Deploying SushiSwap rewarder delegate");

    // TODO
    const rewardMultiplier = 0;

    const sushiRewarderReceipt = await deploy(REWARDER_CONTRACT, {
      from: deployer,
      args: [
        rewardMultiplier,
        generatedAddresses.sushiToken,
        generatedAddresses.masterChefV2,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sushiRewarder = sushiRewarderReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Generate address registry file
  //
  //////////////////////////////////////////////////////////////////////////////

  generatedNetworks[chainId] = generatedAddresses;

  fs.writeFileSync(
    GENERATED_ADDRESSES,
    JSON.stringify(generatedNetworks, null, "  ")
  );
};

module.exports = func;
module.exports.tags = ["Deploy"];
