/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import "hardhat-deploy";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { USDC_TOKEN_CONTRACT } from "../src/contracts/testing";

//
// Fund the deployer with 1 test USDC
//

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;

  const { execute } = deployments;
  const { deployer } = await getNamedAccounts();

  //////////////////////////////////////////////////////////////////////////////
  //
  // Mint the deployer one USDC to initialize the Uniswap V3 liquidity pool
  //
  //////////////////////////////////////////////////////////////////////////////

  // Amount to mint
  const USDC_AMOUNT = ethers.utils.parseUnits("1", 6); // 1 USDC

  // Calculate the fee consumed by the Curve Aave pool
  const CURVE_AAVE_FEE_BIPS = 3; // 0.03%
  const CURVE_AAVE_FEE_USDC = USDC_AMOUNT.mul(CURVE_AAVE_FEE_BIPS).div(10_000);

  //
  // Mint 1 USDC
  //

  console.log("Minting 1 USDC to deployer");

  await execute(
    USDC_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "mint",
    deployer,
    USDC_AMOUNT.add(CURVE_AAVE_FEE_USDC)
  );
};

module.exports = func;
module.exports.tags = ["FundDeployer"];
