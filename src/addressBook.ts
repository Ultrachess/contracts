/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint no-empty: "off" */

import fs from "fs";
import * as hardhat from "hardhat";

import goerliAddresses from "./addresses/goerli.json";
import polygonMainnetAddresses from "./addresses/polygon_mainnet.json";
import {
  ASSET_TOKEN_CONTRACT,
  BASE_TOKEN_CONTRACT,
  CURVE_AAVE_POOLER_CONTRACT,
  CURVE_AAVE_STAKER_CONTRACT,
  LP_SFT_CONTRACT,
  UNI_V3_POOL_FACTORY_CONTRACT,
  UNI_V3_POOLER_CONTRACT,
  UNI_V3_STAKER_CONTRACT,
  UNI_V3_SWAPPER_CONTRACT,
} from "./contracts/dapp";
import {
  AAVE_ADDRESS_CONFIG_CONTRACT,
  AAVE_INCENTIVES_CONTROLLER_CONTRACT,
  AAVE_INTEREST_RATE_STRATEGY_CONTRACT,
  AAVE_LENDING_RATE_ORACLE_CONTRACT,
  AAVE_POOL_CONFIG_CONTRACT,
  AAVE_POOL_CONTRACT,
  ADAI_STABLE_DEBT_TOKEN_CONTRACT,
  ADAI_TOKEN_CONTRACT,
  ADAI_TOKEN_PROXY_CONTRACT,
  ADAI_VARIABLE_DEBT_TOKEN_CONTRACT,
  AUSDC_STABLE_DEBT_TOKEN_CONTRACT,
  AUSDC_TOKEN_CONTRACT,
  AUSDC_TOKEN_PROXY_CONTRACT,
  AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT,
  AUSDT_STABLE_DEBT_TOKEN_CONTRACT,
  AUSDT_TOKEN_CONTRACT,
  AUSDT_TOKEN_PROXY_CONTRACT,
  AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT,
  CRV_CONTROLLER_CONTRACT,
  CRV_MINTER_CONTRACT,
  CRV_TOKEN_CONTRACT,
  CRV_VOTING_CONTRACT,
  CURVE_AAVE_GAUGE_CONTRACT,
  CURVE_AAVE_LP_TOKEN_CONTRACT,
  CURVE_AAVE_POOL_CONTRACT,
  UNISWAP_V3_FACTORY_CONTRACT,
  UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
  UNISWAP_V3_NFT_MANAGER_CONTRACT,
  UNISWAP_V3_POOL_CONTRACT,
  UNISWAP_V3_STAKER_CONTRACT,
  WRAPPED_NATIVE_CONTRACT,
} from "./contracts/depends";
import {
  DAI_TOKEN_CONTRACT,
  USDC_TOKEN_CONTRACT,
  USDT_TOKEN_CONTRACT,
} from "./contracts/testing";
import { AddressBook } from "./interfaces";

//
// Address book instance
//

const addressBook: { [networkName: string]: AddressBook } = {
  goerli: goerliAddresses,
  polygon_mainnet: polygonMainnetAddresses,
};

//
// Utility functions
//

function loadDeployment(
  networkName: string,
  contractName: string
): string | undefined {
  try {
    const deployment = JSON.parse(
      fs
        .readFileSync(
          `${__dirname}/../deployments/${networkName}/${contractName}.json`
        )
        .toString()
    );
    if (deployment.address) {
      return deployment.address;
    }
  } catch (e) {}

  // Not found
  return;
}

const getContractAddress = async (
  contractSymbol: string,
  contractName: string,
  networkName: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook[networkName] && addressBook[networkName][contractSymbol]) {
    return addressBook[networkName][contractSymbol];
  }

  if (addressBook[networkName] === undefined) {
    addressBook[networkName] = {};
  }

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(networkName, contractName);
  if (deploymentAddress) {
    addressBook[networkName][contractName] = deploymentAddress;
    return deploymentAddress;
  }

  // Look up address in deployments system
  try {
    const contractDeployment = await hardhat.deployments.get(contractName);
    if (contractDeployment && contractDeployment.address) {
      addressBook[networkName][contractName] = contractDeployment.address;
      return contractDeployment.address;
    }
  } catch (e) {}

  // Not found
  return;
};

async function getAddressBook(networkName: string): Promise<AddressBook> {
  return {
    aaveAddressConfig: await getContractAddress(
      "aaveAddressConfig",
      AAVE_ADDRESS_CONFIG_CONTRACT,
      networkName
    ),
    aaveIncentivesController: await getContractAddress(
      "aaveIncentivesController",
      AAVE_INCENTIVES_CONTROLLER_CONTRACT,
      networkName
    ),
    aaveInterestRateStrategy: await getContractAddress(
      "aaveInterestRateStrategy",
      AAVE_INTEREST_RATE_STRATEGY_CONTRACT,
      networkName
    ),
    aaveLendingRateOracle: await getContractAddress(
      "aaveLendingRateOracle",
      AAVE_LENDING_RATE_ORACLE_CONTRACT,
      networkName
    ),
    aavePool: await getContractAddress(
      "aavePool",
      AAVE_POOL_CONTRACT,
      networkName
    ),
    aavePoolConfig: await getContractAddress(
      "aavePoolConfig",
      AAVE_POOL_CONFIG_CONTRACT,
      networkName
    ),
    adaiStableDebtToken: await getContractAddress(
      "adaiStableDebtToken",
      ADAI_STABLE_DEBT_TOKEN_CONTRACT,
      networkName
    ),
    adaiToken: await getContractAddress(
      "adaiToken",
      ADAI_TOKEN_CONTRACT,
      networkName
    ),
    adaiTokenProxy: await getContractAddress(
      "adaiTokenProxy",
      ADAI_TOKEN_PROXY_CONTRACT,
      networkName
    ),
    adaiVariableDebtToken: await getContractAddress(
      "adaiVariableDebtToken",
      ADAI_VARIABLE_DEBT_TOKEN_CONTRACT,
      networkName
    ),
    assetToken: await getContractAddress(
      "assetToken",
      ASSET_TOKEN_CONTRACT,
      networkName
    ),
    ausdcStableDebtToken: await getContractAddress(
      "ausdcStableDebtToken",
      AUSDC_STABLE_DEBT_TOKEN_CONTRACT,
      networkName
    ),
    ausdcToken: await getContractAddress(
      "ausdcToken",
      AUSDC_TOKEN_CONTRACT,
      networkName
    ),
    ausdcTokenProxy: await getContractAddress(
      "ausdcTokenProxy",
      AUSDC_TOKEN_PROXY_CONTRACT,
      networkName
    ),
    ausdcVariableDebtToken: await getContractAddress(
      "ausdcVariableDebtToken",
      AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT,
      networkName
    ),
    ausdtStableDebtToken: await getContractAddress(
      "ausdtStableDebtToken",
      AUSDT_STABLE_DEBT_TOKEN_CONTRACT,
      networkName
    ),
    ausdtToken: await getContractAddress(
      "ausdtToken",
      AUSDT_TOKEN_CONTRACT,
      networkName
    ),
    ausdtTokenProxy: await getContractAddress(
      "ausdtTokenProxy",
      AUSDT_TOKEN_PROXY_CONTRACT,
      networkName
    ),
    ausdtVariableDebtToken: await getContractAddress(
      "ausdtVariableDebtToken",
      AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT,
      networkName
    ),
    baseToken: await getContractAddress(
      "baseToken",
      BASE_TOKEN_CONTRACT,
      networkName
    ),
    crvController: await getContractAddress(
      "crvController",
      CRV_CONTROLLER_CONTRACT,
      networkName
    ),
    crvMinter: await getContractAddress(
      "crvMinter",
      CRV_MINTER_CONTRACT,
      networkName
    ),
    crvToken: await getContractAddress(
      "crvToken",
      CRV_TOKEN_CONTRACT,
      networkName
    ),
    crvVoting: await getContractAddress(
      "crvVoting",
      CRV_VOTING_CONTRACT,
      networkName
    ),
    curveAaveGauge: await getContractAddress(
      "curveAaveGauge",
      CURVE_AAVE_GAUGE_CONTRACT,
      networkName
    ),
    curveAaveLpToken: await getContractAddress(
      "curveAaveLpToken",
      CURVE_AAVE_LP_TOKEN_CONTRACT,
      networkName
    ),
    curveAavePool: await getContractAddress(
      "curveAavePool",
      CURVE_AAVE_POOL_CONTRACT,
      networkName
    ),
    curveAavePooler: await getContractAddress(
      "curveAavePooler",
      CURVE_AAVE_POOLER_CONTRACT,
      networkName
    ),
    curveAaveStaker: await getContractAddress(
      "curveAaveStaker",
      CURVE_AAVE_STAKER_CONTRACT,
      networkName
    ),
    daiToken: await getContractAddress(
      "daiToken",
      DAI_TOKEN_CONTRACT,
      networkName
    ),
    lpSft: await getContractAddress("lpSft", LP_SFT_CONTRACT, networkName),
    uniswapV3Factory: await getContractAddress(
      "uniswapV3Factory",
      UNISWAP_V3_FACTORY_CONTRACT,
      networkName
    ),
    uniswapV3NftDescriptor: await getContractAddress(
      "uniswapV3NftDescriptor",
      UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
      networkName
    ),
    uniswapV3NftManager: await getContractAddress(
      "uniswapV3NftManager",
      UNISWAP_V3_NFT_MANAGER_CONTRACT,
      networkName
    ),
    uniswapV3Pool: await getContractAddress(
      "uniswapV3Pool",
      UNISWAP_V3_POOL_CONTRACT,
      networkName
    ),
    uniswapV3Staker: await getContractAddress(
      "uniswapV3Staker",
      UNISWAP_V3_STAKER_CONTRACT,
      networkName
    ),
    uniV3Pooler: await getContractAddress(
      "uniV3Pooler",
      UNI_V3_POOLER_CONTRACT,
      networkName
    ),
    uniV3PoolFactory: await getContractAddress(
      "uniV3PoolFactory",
      UNI_V3_POOL_FACTORY_CONTRACT,
      networkName
    ),
    uniV3Staker: await getContractAddress(
      "uniV3Staker",
      UNI_V3_STAKER_CONTRACT,
      networkName
    ),
    uniV3Swapper: await getContractAddress(
      "uniV3Swapper",
      UNI_V3_SWAPPER_CONTRACT,
      networkName
    ),
    usdcToken: await getContractAddress(
      "usdcToken",
      USDC_TOKEN_CONTRACT,
      networkName
    ),
    usdtToken: await getContractAddress(
      "usdtToken",
      USDT_TOKEN_CONTRACT,
      networkName
    ),
    wrappedNative: await getContractAddress(
      "wrappedNative",
      WRAPPED_NATIVE_CONTRACT,
      networkName
    ),
  };
}

function writeAddress(
  networkName: string,
  contractName: string,
  address: string
): void {
  console.log(`Deployed ${contractName} to ${address}`);

  // Write the file
  const addressFile = `${__dirname}/../deployments/${networkName}/${contractName}.json`;
  fs.writeFileSync(addressFile, JSON.stringify({ address }, undefined, 2));

  // Save the address
  addressBook[networkName][contractName] = address;
}

export { getAddressBook, writeAddress };
