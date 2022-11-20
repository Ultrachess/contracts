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
const UNISWAP_V3_FACTORY_CONTRACT = "UniswapV3Factory";
const UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT = "NonfungibleTokenPositionDescriptor";
const UNISWAP_V3_NFT_MANAGER_CONTRACT = "NonfungiblePositionManager";
const WETH_CONTRACT = "WETH";

// Library names
const NFT_DESCRIPTOR_LIBRARY = "NFTDescriptor";

// Address book
interface AddressBook {
  wrappedNative: string;
  ctsi: string;
  ctsiFaucet: string;
  uniswapV3Factory: string;
  uniswapV3NftDescriptor: string;
  uniswapV3NftManager: string;
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

  // Address not found
  return;
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

  // Address not found
  return;
}
const getCtsiAddress = (network: string): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook.ctsi) return addressBook.ctsi;

  // Look up address in NPM package
  const ctsiDeploymentAddress = loadCtsiDeployment(network, CTSI_CONTRACT);
  if (ctsiDeploymentAddress) return ctsiDeploymentAddress;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  // Address not found
  return;
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

  // Address not found
  return;
};
const getContractAddress = (
  contractSymbol: string,
  contractName: string,
  network: string
): string | undefined => {
  // Look up address in address book
  if (addressBook && addressBook[contractSymbol])
    return addressBook[contractSymbol];

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, contractName);
  if (deploymentAddress) return deploymentAddress;

  // Address not found
  return;
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
  let wrappedNativeAddress = getContractAddress(
    "wrappedNative",
    WETH_CONTRACT,
    network
  );
  let ctsiAddress = getCtsiAddress(network);
  let ctsiFaucetAddress = getCtsiFaucetAddress(network);
  let uniswapV3FactoryAddress = getContractAddress(
    "uniswapV3Factory",
    UNISWAP_V3_FACTORY_CONTRACT,
    network
  );
  let uniswapV3NftDescriptorAddress = getContractAddress(
    "uniswapV3NftDescriptor",
    UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
    network
  );
  let uniswapV3NftManagerAddress = getContractAddress(
    "uniswapV3NftManager",
    UNISWAP_V3_NFT_MANAGER_CONTRACT,
    network
  );

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

  // Deploy uniswapV3Factory
  if (uniswapV3FactoryAddress) {
    console.log(
      `Using ${UNISWAP_V3_FACTORY_CONTRACT} at ${uniswapV3FactoryAddress}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_FACTORY_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_FACTORY_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    uniswapV3FactoryAddress = tx.address;
  }

  //
  // Deploy UniswapV3NFTDescriptor
  //
  // TODO: This contract must be deployed with the ethers contract factory
  // because it requires a library, and as a result deployment files are
  // not generated. This is a known issue with hardhat-deploy.
  //
  if (uniswapV3NftDescriptorAddress && network !== "hardhat") {
    console.log(
      `Using ${UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT} at ${uniswapV3NftDescriptorAddress}`
    );
  } else {
    // Deploy NFTDescriptor
    console.log(`Deploying ${NFT_DESCRIPTOR_LIBRARY}`);
    const NFTDescriptor = await ethers.getContractFactory(
      NFT_DESCRIPTOR_LIBRARY
    );
    const nftDescriptor = await NFTDescriptor.deploy();

    // Deploy UniV3NFTDescriptor
    console.log(`Deploying ${UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT}`);
    const UniV3NftDescriptor = await ethers.getContractFactory(
      UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
      {
        libraries: {
          NFTDescriptor: nftDescriptor.address,
        },
      }
    );
    const uniswapV3NftDescriptor = await UniV3NftDescriptor.deploy(
      wrappedNativeAddress,
      ethers.utils.formatBytes32String("W-ETH")
    );
    uniswapV3NftDescriptorAddress = uniswapV3NftDescriptor.address;
  }

  // Deploy UniV3NFTManager
  if (uniswapV3NftManagerAddress) {
    console.log(
      `Using ${UNISWAP_V3_NFT_MANAGER_CONTRACT} at ${uniswapV3NftManagerAddress}`
    );
  } else {
    console.log(`Deploying ${UNISWAP_V3_NFT_MANAGER_CONTRACT}`);
    const tx = await deployments.deploy(UNISWAP_V3_NFT_MANAGER_CONTRACT, {
      ...opts,
      args: [
        uniswapV3FactoryAddress,
        wrappedNativeAddress,
        uniswapV3NftDescriptorAddress,
      ],
    });
    uniswapV3NftManagerAddress = tx.address;
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
    UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
    uniswapV3NftDescriptorAddress
  );
};

export default func;
func.tags = ["UniswapV3"];
