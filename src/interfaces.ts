/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import { ethers } from "ethers";

// Address book interface
interface AddressBook {
  aaveAddressConfig?: string;
  aaveIncentivesController?: string;
  aaveInterestRateStrategy?: string;
  aaveLendingRateOracle?: string;
  aavePool?: string;
  aavePoolConfig?: string;
  adaiStableDebtToken?: string;
  adaiStableDebtTokenProxy?: string;
  adaiToken?: string;
  adaiTokenProxy?: string;
  adaiVariableDebtToken?: string;
  adaiVariableDebtTokenProxy?: string;
  ausdcStableDebtToken?: string;
  ausdcStableDebtTokenProxy?: string;
  ausdcToken?: string;
  ausdcTokenProxy?: string;
  ausdcVariableDebtToken?: string;
  ausdcVariableDebtTokenProxy?: string;
  ausdtStableDebtToken?: string;
  ausdtStableDebtTokenProxy?: string;
  ausdtToken?: string;
  ausdtTokenProxy?: string;
  ausdtVariableDebtToken?: string;
  ausdtVariableDebtTokenProxy?: string;
  crvController?: string;
  crvMinter?: string;
  crvToken?: string;
  crvVoting?: string;
  curveAaveGauge?: string;
  curveAaveLpToken?: string;
  curveAavePool?: string;
  daiToken?: string;
  uniswapV3Factory?: string;
  uniswapV3NftDescriptor?: string;
  uniswapV3NftManager?: string;
  uniswapV3Pool?: string;
  uniswapV3Staker?: string;
  uniV3PoolFactory?: string;
  usdcToken?: string;
  usdtToken?: string;
  wrappedNative?: string;
}

// Contract instances
interface ContractLibrary {
  adaiTokenContract: ethers.Contract;
  adaiTokenProxyContract: ethers.Contract;
  ausdcTokenContract: ethers.Contract;
  ausdcTokenProxyContract: ethers.Contract;
  ausdtTokenContract: ethers.Contract;
  ausdtTokenProxyContract: ethers.Contract;
  curveAaveGaugeContract: ethers.Contract;
  curveAaveLpTokenContract: ethers.Contract;
  curveAavePoolContract: ethers.Contract;
  daiTokenContract: ethers.Contract;
  uniswapV3FactoryContract: ethers.Contract;
  uniswapV3NftManagerContract: ethers.Contract;
  uniswapV3StakerContract: ethers.Contract;
  usdcTokenContract: ethers.Contract;
  usdtTokenContract: ethers.Contract;
}

export { AddressBook, ContractLibrary };
