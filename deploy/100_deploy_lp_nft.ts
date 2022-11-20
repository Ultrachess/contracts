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
const CTSI_CONTRACT = "CartesiToken";
const UNI_V3_POOL_FACTORY_CONTRACT = "UniV3PoolFactory";
const UNISWAP_V3_FACTORY_CONTRACT = "UniswapV3Factory";
const WETH_CONTRACT = "WETH";

// Contract alises
const CTSI_POOL_FACTORY_CONTRACT = "CtsiPoolFactory";

// Constants
const enum FeeAmount {
  LOW = 500, // 0.05%
  MEDIUM = 3_000, // 0.3%
  HIGH = 10_000, // 1%
}

// Address book
interface AddressBook {
  wrappedNative: string;
  ctsi: string;
  uniswapV3Factory: string;
  ctsiPoolFactory: string;
}
let addressBook: AddressBook | undefined;

// Utility functions
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

  return; // undefined
}
function loadCtsiDeployment(
  network: string,
  contract: string
): string | undefined {
  try {
    const deployment = JSON.parse(
      fs
        .readFileSync(
          `${__dirname}/../node_modules/@cartesi/token/deployments/${network}/${contract}.json`
        )
        .toString()
    );
    if (deployment.address) return deployment.address;
  } catch (e) {}

  return; // undefined
}
const getWrappedNativeAddress = async (
  hre: HardhatRuntimeEnvironment,
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.wrappedNative)
    return addressBook.wrappedNative;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, WETH_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const wethDeployment = await hre.deployments.get(WETH_CONTRACT);
  if (wethDeployment && wethDeployment.address) return wethDeployment.address;

  return; // undefined
};
const getCtsiAddress = async (
  hre: HardhatRuntimeEnvironment,
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.ctsi) return addressBook.ctsi;

  // Look up address in NPM package
  const ctsiDeploymentAddress = loadCtsiDeployment(network, CTSI_CONTRACT);
  if (ctsiDeploymentAddress) return ctsiDeploymentAddress;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const ctsiDeployment = await hre.deployments.get(CTSI_CONTRACT);
  if (ctsiDeployment && ctsiDeployment.address) return ctsiDeployment.address;

  return; // undefined
};
const getUniswapV3FactoryAddress = async (
  hre: HardhatRuntimeEnvironment,
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.uniswapV3Factory)
    return addressBook.uniswapV3Factory;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(
    network,
    UNISWAP_V3_FACTORY_CONTRACT
  );
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const uniswapV3FactoryDeployment = await hre.deployments.get(
    UNISWAP_V3_FACTORY_CONTRACT
  );
  if (uniswapV3FactoryDeployment && uniswapV3FactoryDeployment.address)
    return uniswapV3FactoryDeployment.address;

  return; // undefined
};
const getCtsiPoolFactoryAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.ctsiPoolFactory)
    return addressBook.ctsiPoolFactory;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_POOL_FACTORY_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};
function writeAddress(
  network: string,
  contract: string,
  address: string
): void {
  const addressFile = `${__dirname}/../deployments/${network}/${contract}.json`;
  fs.writeFileSync(addressFile, JSON.stringify({ address }, undefined, 2));
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts: DeployOptions = {
    deterministicDeployment: true,
    from: deployer,
    log: true,
  };

  // Get the network name
  const network = hre.network.name;

  // Get the contract addresses
  loadAddresses(network);
  const wrappedNativeAddress = await getWrappedNativeAddress(hre, network);
  const ctsiAddress = await getCtsiAddress(hre, network);
  const uniswapV3FactoryAddress = await getUniswapV3FactoryAddress(
    hre,
    network
  );
  let ctsiPoolFactoryAddress = await getCtsiPoolFactoryAddress(network);

  // Deploy Uniswap V3 Pool Factory
  if (ctsiPoolFactoryAddress && network != "hardhat") {
    console.log(
      `Using ${CTSI_POOL_FACTORY_CONTRACT} at ${ctsiPoolFactoryAddress}`
    );
  } else {
    console.log(`Deploying ${CTSI_POOL_FACTORY_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_POOL_FACTORY_CONTRACT, {
      ...opts,
      args: [
        uniswapV3FactoryAddress,
        ctsiAddress,
        wrappedNativeAddress,
        FeeAmount.HIGH,
      ],
    });
    ctsiPoolFactoryAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  writeAddress(network, CTSI_POOL_FACTORY_CONTRACT, ctsiPoolFactoryAddress);
};

export default func;
func.tags = ["CTSIPoolFactory"];
