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
const CTSI_FAUCET_CONTRACT = "SimpleFaucet";
const UNI_V3_FACTORY_CONTRACT = "UniswapV3Factory";
const UNI_V3_NFT_DESCRIPTOR_CONTRACT = "NonfungibleTokenPositionDescriptor";
const UNI_V3_NFT_MANAGER_CONTRACT = "NonfungiblePositionManager";
const WETH_CONTRACT = "WETH";

// Library names
const NFT_DESCRIPTOR_LIBRARY = "NFTDescriptor";

// Address book
interface AddressBook {
  wrappedNative: string;
  ctsi: string;
  ctsiFaucet: string;
  uniV3Factory: string;
  uniV3NftDescriptor: string;
  uniV3NftManager: string;
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
const getWrappedNativeAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.wrappedNative)
    return addressBook.wrappedNative;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, WETH_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};
const getCtsiAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.ctsi) return addressBook.ctsi;

  // Look up address in NPM package
  const ctsiDeploymentAddress = loadCtsiDeployment(network, CTSI_CONTRACT);
  if (ctsiDeploymentAddress) return ctsiDeploymentAddress;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};
const getCtsiFaucetAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.ctsiFaucet) return addressBook.ctsiFaucet;

  // Look up address in NPM package
  const ctsiDeploymentAddress = loadCtsiDeployment(
    network,
    CTSI_FAUCET_CONTRACT
  );
  if (ctsiDeploymentAddress) return ctsiDeploymentAddress;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_FAUCET_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};
const getUniV3FactoryAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.uniV3Factory) return addressBook.uniV3Factory;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, UNI_V3_FACTORY_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};
const getUniV3NftDescriptorAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.uniV3NftDescriptor)
    return addressBook.uniV3NftDescriptor;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(
    network,
    UNI_V3_NFT_DESCRIPTOR_CONTRACT
  );
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};
const getUniV3NftManagerAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.uniV3NftManager)
    return addressBook.uniV3NftManager;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(
    network,
    UNI_V3_NFT_MANAGER_CONTRACT
  );
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

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;
  const { deployer } = await getNamedAccounts();

  const opts: DeployOptions = {
    deterministicDeployment: true,
    from: deployer,
    log: true,
  };

  // Constants
  const CTSI_FAUCET_AMOUNT = ethers.BigNumber.from("100000").mul(
    ethers.constants.WeiPerEther
  ); // 100k CTSI

  // Get the network name
  const network = hardhat_re.network.name;
  const chainId = await hardhat_re.getChainId();

  // Get the contract addresses
  loadAddresses(network);
  let wrappedNativeAddress = getWrappedNativeAddress(network);
  let ctsiAddress = getCtsiAddress(network);
  let ctsiFaucetAddress = getCtsiFaucetAddress(network);
  let uniV3FactoryAddress = getUniV3FactoryAddress(network);
  let uniV3NftDescriptorAddress = getUniV3NftDescriptorAddress(network);
  let uniV3NftManagerAddress = getUniV3NftManagerAddress(network);

  // Deploy wrapped native token
  if (wrappedNativeAddress) {
    console.log(`Using ${WETH_CONTRACT} at ${wrappedNativeAddress}`);
  } else {
    console.log(`Deploying ${WETH_CONTRACT}`);
    const tx = await deployments.deploy(WETH_CONTRACT, opts);
    wrappedNativeAddress = tx.address;
  }

  // Deploy CTSI
  if (ctsiAddress) {
    console.log(`Using ${CTSI_CONTRACT} at ${ctsiAddress}`);
  } else {
    console.log(`Deploying ${CTSI_CONTRACT}`);
    const tx = await deployments.deploy(CTSI_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    ctsiAddress = tx.address;
  }

  // Deploy CTSI faucet
  if (ctsiFaucetAddress) {
    console.log(`Using ${CTSI_FAUCET_CONTRACT} at ${ctsiFaucetAddress}`);
  } else {
    console.log(`Deploying ${CTSI_FAUCET_CONTRACT}`);
    const tx = await deployments.deploy(CTSI_FAUCET_CONTRACT, {
      ...opts,
      args: [ctsiAddress],
    });
    ctsiFaucetAddress = tx.address;
  }

  // Add faucet as CTSI minter
  const faucetIsMinter = await deployments.read(
    CTSI_CONTRACT,
    { from: deployer },
    "isMinter",
    ctsiFaucetAddress
  );
  if (!faucetIsMinter) {
    console.log(`Adding ${CTSI_FAUCET_CONTRACT} as CTSI minter`);
    await deployments.execute(
      CTSI_CONTRACT,
      { from: deployer, log: true },
      "addMinter",
      ctsiFaucetAddress
    );
  }

  // Add CTSI to the faucet
  const faucetBalance = await deployments.read(
    CTSI_CONTRACT,
    { from: deployer },
    "balanceOf",
    ctsiFaucetAddress
  );
  const deficit = CTSI_FAUCET_AMOUNT.sub(faucetBalance);
  if (deficit.gt(0)) {
    console.log(`Adding ${deficit} CTSI to ${CTSI_FAUCET_CONTRACT}`);
    await deployments.execute(
      CTSI_CONTRACT,
      { from: deployer, log: true },
      "transfer",
      ctsiFaucetAddress,
      deficit
    );
  }

  // Deploy UniV3Factory
  if (uniV3FactoryAddress) {
    console.log(`Using ${UNI_V3_FACTORY_CONTRACT} at ${uniV3FactoryAddress}`);
  } else {
    console.log(`Deploying ${UNI_V3_FACTORY_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_FACTORY_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    uniV3FactoryAddress = tx.address;
  }

  //
  // Deploy UniV3NFTDescriptor
  //
  // TODO: This contract must be deployed with the ethers contract factory
  // because it requires a library, and as a result deployment files are
  // not generated. This is a known issue with hardhat-deploy.
  //
  if (uniV3NftDescriptorAddress && network !== "hardhat") {
    console.log(
      `Using ${UNI_V3_NFT_DESCRIPTOR_CONTRACT} at ${uniV3NftDescriptorAddress}`
    );
  } else {
    // Deploy NFTDescriptor
    console.log(`Deploying ${NFT_DESCRIPTOR_LIBRARY}`);
    const NFTDescriptor = await ethers.getContractFactory(
      NFT_DESCRIPTOR_LIBRARY
    );
    const nftDescriptor = await NFTDescriptor.deploy();

    // Deploy UniV3NFTDescriptor
    console.log(`Deploying ${UNI_V3_NFT_DESCRIPTOR_CONTRACT}`);
    const UniV3NftDescriptor = await ethers.getContractFactory(
      UNI_V3_NFT_DESCRIPTOR_CONTRACT,
      {
        libraries: {
          NFTDescriptor: nftDescriptor.address,
        },
      }
    );
    const uniV3NftDescriptor = await UniV3NftDescriptor.deploy(
      wrappedNativeAddress,
      ethers.utils.formatBytes32String("W-ETH")
    );
    uniV3NftDescriptorAddress = uniV3NftDescriptor.address;
  }

  // Deploy UniV3NFTManager
  if (uniV3NftManagerAddress) {
    console.log(
      `Using ${UNI_V3_NFT_MANAGER_CONTRACT} at ${uniV3NftManagerAddress}`
    );
  } else {
    console.log(`Deploying ${UNI_V3_NFT_MANAGER_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_NFT_MANAGER_CONTRACT, {
      ...opts,
      args: [
        uniV3FactoryAddress,
        wrappedNativeAddress,
        uniV3NftDescriptorAddress,
      ],
    });
    uniV3NftManagerAddress = tx.address;
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
    UNI_V3_NFT_DESCRIPTOR_CONTRACT,
    uniV3NftDescriptorAddress
  );
};

export default func;
func.tags = ["UniswapV3"];
