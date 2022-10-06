/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint no-empty: "off" */

import bn from "bignumber.js"; // TODO: Move to utils
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "ethers";
import fs from "fs";
import * as hardhat from "hardhat";

chai.use(solidity);

// Contract names
const CTSI_CONTRACT = "CartesiToken";
const CTSI_FAUCET_CONTRACT = "SimpleFaucet";
const UNI_V3_NFT_MANAGER_CONTRACT = "NonfungiblePositionManager";
const UNI_V3_POOL_FACTORY_CONTRACT = "UniswapV3PoolFactory";
const WETH_CONTRACT = "WETH";

// Contract ABIs
import { abi as CartesiTokenAbi } from "../node_modules/@cartesi/token/export/artifacts/contracts/CartesiToken.sol/CartesiToken.json";
import { abi as CartesiFaucetAbi } from "../node_modules/@cartesi/token/export/artifacts/contracts/SimpleFaucet.sol/SimpleFaucet.json";
import UniswapV3PoolAbi from "../src/abi/contracts/depends/uniswap-v3-core/UniswapV3Pool.sol/UniswapV3Pool.json";
import NonfungiblePositionManagerAbi from "../src/abi/contracts/depends/uniswap-v3-periphery/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import UniswapV3PoolFactoryAbi from "../src/abi/contracts/src/UniswapV3PoolFactory.sol/UniswapV3PoolFactory.json";
import WETHAbi from "../src/abi/contracts/test/token/WETH.sol/WETH.json";

// TODO: Move to constants
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const enum FeeAmount {
  LOW = 500, // 0.05%
  MEDIUM = 3_000, // 0.3%
  HIGH = 10_000, // 1%
}
const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

// Test parameters
const NATIVE_AMOUNT = ethers.constants.WeiPerEther; // 1 token
const CTSI_AMOUNT = ethers.constants.WeiPerEther; // 1 CTSI
const LIQUIDITY_AMOUNT = ethers.constants.WeiPerEther; // Deposited 1:1

// Address book
interface AddressBook {
  wrappedNative: string;
  ctsi: string;
  ctsiFaucet: string;
  uniV3NftManager: string;
  uniV3PoolFactory: string;
  ctsiNativePool: string;
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
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.wrappedNative)
    return addressBook.wrappedNative;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, WETH_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const wethDeployment = await hardhat.deployments.get(WETH_CONTRACT);
  if (wethDeployment && wethDeployment.address) return wethDeployment.address;

  return; // undefined
};
const getCtsiAddress = async (network: string): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.ctsi) return addressBook.ctsi;

  // Look up address in NPM package
  const ctsiDeploymentAddress = loadCtsiDeployment(network, CTSI_CONTRACT);
  if (ctsiDeploymentAddress) return ctsiDeploymentAddress;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const ctsiDeployment = await hardhat.deployments.get(CTSI_CONTRACT);
  if (ctsiDeployment && ctsiDeployment.address) return ctsiDeployment.address;

  return; // undefined
};
const getCtsiFaucetAddress = async (
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.ctsiFaucet) return addressBook.ctsiFaucet;

  // Look up address in NPM package
  const ctsiFaucetDeploymentAddress = loadCtsiDeployment(
    network,
    CTSI_FAUCET_CONTRACT
  );
  if (ctsiFaucetDeploymentAddress) return ctsiFaucetDeploymentAddress;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, CTSI_FAUCET_CONTRACT);
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const ctsiFaucetDeployment = await hardhat.deployments.get(
    CTSI_FAUCET_CONTRACT
  );
  if (ctsiFaucetDeployment && ctsiFaucetDeployment.address)
    return ctsiFaucetDeployment.address;

  return; // undefined
};
const getUniV3NftManagerAddress = async (
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.uniV3NftManager)
    return addressBook.uniV3NftManager;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(
    network,
    UNI_V3_NFT_MANAGER_CONTRACT
  );
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const uniV3NftManagerDeployment = await hardhat.deployments.get(
    UNI_V3_NFT_MANAGER_CONTRACT
  );
  if (uniV3NftManagerDeployment && uniV3NftManagerDeployment.address)
    return uniV3NftManagerDeployment.address;

  return; // undefined
};
const getUniV3PoolFactoryAddress = async (
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.uniV3PoolFactory)
    return addressBook.uniV3PoolFactory;

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(
    network,
    UNI_V3_POOL_FACTORY_CONTRACT
  );
  if (deploymentAddress) return deploymentAddress;

  // Look up address in deployments system
  const uniV3PoolFactoryDeployment = await hardhat.deployments.get(
    UNI_V3_POOL_FACTORY_CONTRACT
  );
  if (uniV3PoolFactoryDeployment && uniV3PoolFactoryDeployment.address)
    return uniV3PoolFactoryDeployment.address;

  return; // undefined
};
const getCtsiNativePoolAddress = async (
  uniV3PoolFactoryContract: ethers.Contract
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook.ctsiNativePool)
    return addressBook.ctsiNativePool;

  // Read address from the chain
  return await uniV3PoolFactoryContract.uniV3Pool();
};
function getMinTick(tickSpacing: number): number {
  return Math.ceil(-887272 / tickSpacing) * tickSpacing;
}
function getMaxTick(tickSpacing: number): number {
  return Math.floor(887272 / tickSpacing) * tickSpacing;
}
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });
// Returns the sqrt price as a 64x96
function encodePriceSqrt(reserve1: number, reserve0: number): ethers.BigNumber {
  return ethers.BigNumber.from(
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  );
}
function extractJSONFromURI(uri: string): {
  name: string;
  description: string;
  image: string;
} {
  const encodedJSON = uri.substr("data:application/json;base64,".length);
  const decodedJSON = Buffer.from(encodedJSON, "base64").toString("utf8");
  return JSON.parse(decodedJSON);
}

// Fixture setup
const setupTest = hardhat.deployments.createFixture(
  async ({ deployments, ethers }) => {
    // Ensure we start from a fresh deployment
    await deployments.fixture();

    // Get the Signers
    const [, beneficiary] = await hardhat.ethers.getSigners();

    // Get network name
    const network: string = hardhat.network.name;

    // Load contract addresses
    loadAddresses(network);
    const wrappedNativeAddress = await getWrappedNativeAddress(network);
    const ctsiAddress = await getCtsiAddress(network);
    const ctsiFaucetAddress = await getCtsiFaucetAddress(network);
    const uniV3NftManagerAddress = await getUniV3NftManagerAddress(network);
    const uniV3PoolFactoryAddress = await getUniV3PoolFactoryAddress(network);

    // Construct the contracts for beneficiary wallet
    const wrappedNativeContract = new hardhat.ethers.Contract(
      wrappedNativeAddress,
      WETHAbi,
      beneficiary
    );
    const ctsiContract = new ethers.Contract(
      ctsiAddress,
      CartesiTokenAbi,
      beneficiary
    );
    const ctsiFaucetContract = new ethers.Contract(
      ctsiFaucetAddress,
      CartesiFaucetAbi,
      beneficiary
    );
    const uniV3NftManagerContract = new ethers.Contract(
      uniV3NftManagerAddress,
      NonfungiblePositionManagerAbi,
      beneficiary
    );
    const uniV3PoolFactoryContract = new ethers.Contract(
      uniV3PoolFactoryAddress,
      UniswapV3PoolFactoryAbi,
      beneficiary
    );

    // CTSI-Native pool might need to be read from the chain
    const ctsiNativePoolAddress = await getCtsiNativePoolAddress(
      uniV3PoolFactoryContract
    );
    const ctsiNativePoolContract = new ethers.Contract(
      ctsiNativePoolAddress,
      UniswapV3PoolAbi,
      beneficiary
    );

    return {
      wrappedNativeContract,
      ctsiContract,
      ctsiFaucetContract,
      uniV3NftManagerContract,
      ctsiNativePoolContract,
    };
  }
);

describe("Uniswap V3", () => {
  let beneficiaryAddress: string | undefined;
  let contracts: { [name: string]: ethers.Contract } = {};
  let nftTokenId: number | undefined; // Set when NFT is minted
  let token0: string | undefined;
  let token1: string | undefined;
  let amount0: ethers.BigNumber | undefined;
  let amount1: ethers.BigNumber | undefined;

  before(async function () {
    this.timeout(60 * 1000);

    // Get the beneficiary wallet
    const namedAccounts = await hardhat.getNamedAccounts();
    beneficiaryAddress = namedAccounts.beneficiary;

    // A single fixture is used for the test suite
    contracts = await setupTest();

    // Calculate token addresses and amounts
    const { wrappedNativeContract, ctsiContract } = contracts;
    const wrappedNativeAddress = await wrappedNativeContract.address;
    const ctsiAddress = await ctsiContract.address;

    if (wrappedNativeAddress < ctsiAddress) {
      token0 = wrappedNativeAddress;
      token1 = ctsiAddress;
      amount0 = NATIVE_AMOUNT;
      amount1 = CTSI_AMOUNT;
    } else {
      token0 = ctsiAddress;
      token1 = wrappedNativeAddress;
      amount0 = CTSI_AMOUNT;
      amount1 = NATIVE_AMOUNT;
    }
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: Obtain wrapped native token
  //////////////////////////////////////////////////////////////////////////////

  it("should obtain wrapped native token", async function () {
    this.timeout(60 * 1000);

    const { wrappedNativeContract } = contracts;

    // Deposit into wrapped native token
    const tx = await wrappedNativeContract.deposit({ value: NATIVE_AMOUNT });
    await tx.wait();
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: Obtain CTSI
  //////////////////////////////////////////////////////////////////////////////

  it("should obtain CTSI from faucet", async function () {
    this.timeout(60 * 1000);

    const { ctsiFaucetContract } = contracts;

    // Obtain CTSI from faucet, if allowed
    if (await ctsiFaucetContract.allowedToWithdraw(beneficiaryAddress)) {
      ctsiFaucetContract.requestTokens();
    }
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test Uniswap V3 NFT
  //////////////////////////////////////////////////////////////////////////////

  it("should initialize liquidity pool", async function () {
    this.timeout(60 * 1000);

    const { ctsiNativePoolContract } = contracts;

    const tx = ctsiNativePoolContract.initialize(
      // The initial sqrt price [sqrt(amountToken1/amountToken0)] as a Q64.96 value
      encodePriceSqrt(1, 1)
    );

    // Failure is not fatal, pool may already have been initialized
    let success = false;
    try {
      await tx;
      success = true;
    } catch (err) {}

    if (success) {
      await chai
        .expect(tx)
        .to.emit(ctsiNativePoolContract, "Initialize")
        .withArgs(
          encodePriceSqrt(1, 1), // sqrtPriceX96
          0 // tick0
        );
    }
  });

  it("should approve NFT manager spending CTSI", async function () {
    this.timeout(60 * 1000);

    const { ctsiContract, uniV3NftManagerContract } = contracts;

    const tx = ctsiContract.approve(
      uniV3NftManagerContract.address,
      CTSI_AMOUNT
    );
    await chai
      .expect(tx)
      .to.emit(ctsiContract, "Approval")
      .withArgs(
        beneficiaryAddress,
        uniV3NftManagerContract.address,
        CTSI_AMOUNT
      );
  });

  it("should approve NFT manager spending wrapped native token", async function () {
    this.timeout(60 * 1000);

    const { wrappedNativeContract, uniV3NftManagerContract } = contracts;

    const tx = wrappedNativeContract.approve(
      uniV3NftManagerContract.address,
      NATIVE_AMOUNT
    );
    await chai
      .expect(tx)
      .to.emit(wrappedNativeContract, "Approval")
      .withArgs(
        beneficiaryAddress,
        uniV3NftManagerContract.address,
        NATIVE_AMOUNT
      );
  });

  it("should mint an NFT", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const mintParams = {
      token0: token0,
      token1: token1,
      fee: FeeAmount.HIGH,
      tickLower: getMinTick(TICK_SPACINGS[FeeAmount.HIGH]),
      tickUpper: getMaxTick(TICK_SPACINGS[FeeAmount.HIGH]),
      amount0Desired: amount0,
      amount1Desired: amount1,
      amount0Min: 0,
      amount1Min: 0,
      recipient: beneficiaryAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 mins
    };

    const tx = uniV3NftManagerContract.mint(Object.values(mintParams), {
      gasLimit: 2_000_000, // 2M GWei
    });

    // Get NFT token ID
    const rc = await (await tx).wait();
    const event = rc.events.find(
      (event) => event.event === "IncreaseLiquidity"
    );
    const [tokenId] = event.args;
    nftTokenId = tokenId.toNumber();
    console.log("    NFT token ID:", nftTokenId);

    await chai
      .expect(tx)
      .to.emit(uniV3NftManagerContract, "IncreaseLiquidity")
      .withArgs(
        nftTokenId, // tokenId
        LIQUIDITY_AMOUNT, // liquidity
        amount0, // amount0
        amount1 // amount1
      );
    await chai
      .expect(tx)
      .to.emit(uniV3NftManagerContract, "Transfer")
      .withArgs(ZERO_ADDRESS, beneficiaryAddress, nftTokenId);
  });

  it("should check total NFT balance", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const nftBalance = await uniV3NftManagerContract.balanceOf(
      beneficiaryAddress
    );
    chai.expect(nftBalance.toNumber()).to.be.greaterThanOrEqual(1);
  });

  it("should check NFT position after minting", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const position = await uniV3NftManagerContract.positions(nftTokenId);
    const [
      nonce,
      operator,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside0LastX128,
      feeGrowthInside1LastX128,
      tokensOwed0,
      tokensOwed1,
    ] = position;

    chai.expect(nonce).to.eq(0);
    chai.expect(operator).to.eq(ZERO_ADDRESS); // TODO: Why is this address(0)?
    chai.expect(token0).to.eq(token0);
    chai.expect(token1).to.eq(token1);
    chai.expect(fee).to.eq(FeeAmount.HIGH);
    chai.expect(tickLower).to.eq(getMinTick(TICK_SPACINGS[FeeAmount.HIGH]));
    chai.expect(tickUpper).to.eq(getMaxTick(TICK_SPACINGS[FeeAmount.HIGH]));
    chai.expect(liquidity).to.eq(LIQUIDITY_AMOUNT);
    chai.expect(feeGrowthInside0LastX128).to.eq(0);
    chai.expect(feeGrowthInside1LastX128).to.eq(0);
    chai.expect(tokensOwed0).to.eq(0);
    chai.expect(tokensOwed1).to.eq(0);
  });

  it("should check NFT URI", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const tokenUri = await uniV3NftManagerContract.tokenURI(nftTokenId);

    // Check that data URI has correct mime type
    chai.expect(tokenUri).to.match(/data:application\/json;base64,.+/);

    // Content should be valid JSON and structure
    const content = extractJSONFromURI(tokenUri);
    chai.expect(content).to.haveOwnProperty("name").is.a("string");
    chai.expect(content).to.haveOwnProperty("description").is.a("string");
    chai.expect(content).to.haveOwnProperty("image").is.a("string");

    console.log(`    NFT token name: ${content.name}`);
    console.log(`    NFT token image: ${content.image}`);
  });

  it("should withdraw liquidity from the NFT", async function () {
    this.timeout(60 * 1000);

    const { ctsiNativePoolContract, uniV3NftManagerContract } = contracts;

    const decreaseLiquidityParams = {
      tokenId: nftTokenId,
      liquidity: LIQUIDITY_AMOUNT,
      amount0Min: 0,
      amount1Min: 0,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 mins
    };

    const tx = uniV3NftManagerContract.decreaseLiquidity(
      Object.values(decreaseLiquidityParams)
    );

    await chai
      .expect(tx)
      .to.emit(uniV3NftManagerContract, "DecreaseLiquidity")
      .withArgs(
        nftTokenId, // tokenId
        LIQUIDITY_AMOUNT, // liquidity
        amount0.sub(1), // amount0
        amount1.sub(1) // amount1
      );
    await chai.expect(tx).to.emit(ctsiNativePoolContract, "Burn").withArgs(
      uniV3NftManagerContract.address, // owner
      getMinTick(TICK_SPACINGS[FeeAmount.HIGH]), // tickLower
      getMaxTick(TICK_SPACINGS[FeeAmount.HIGH]), // tickUpper
      LIQUIDITY_AMOUNT, // amount
      amount0.sub(1), // amount0
      amount1.sub(1) // amount1
    );
  });

  it("should check NFT position after decreasing liquidity", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const position = await uniV3NftManagerContract.positions(nftTokenId);
    const [
      nonce,
      operator,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside0LastX128,
      feeGrowthInside1LastX128,
      tokensOwed0,
      tokensOwed1,
    ] = position;

    chai.expect(nonce).to.eq(0);
    chai.expect(operator).to.eq(ZERO_ADDRESS); // TODO: Why is this address(0)?
    chai.expect(token0).to.eq(token0);
    chai.expect(token1).to.eq(token1);
    chai.expect(fee).to.eq(FeeAmount.HIGH);
    chai.expect(tickLower).to.eq(getMinTick(TICK_SPACINGS[FeeAmount.HIGH]));
    chai.expect(tickUpper).to.eq(getMaxTick(TICK_SPACINGS[FeeAmount.HIGH]));
    chai.expect(liquidity).to.eq(0);
    chai.expect(feeGrowthInside0LastX128).to.eq(0);
    chai.expect(feeGrowthInside1LastX128).to.eq(0);
    chai.expect(tokensOwed0).to.eq(amount0.sub(1));
    chai.expect(tokensOwed1).to.eq(amount1.sub(1));
  });

  it("should collect tokens from the NFT", async function () {
    this.timeout(60 * 1000);

    const { ctsiNativePoolContract, uniV3NftManagerContract } = contracts;

    const collectParams = {
      tokenId: nftTokenId,
      recipient: beneficiaryAddress,
      amount0Max: amount0,
      amount1Max: amount1,
    };

    const tx = uniV3NftManagerContract.collect(Object.values(collectParams));
    await chai.expect(tx).to.emit(uniV3NftManagerContract, "Collect").withArgs(
      nftTokenId, // tokenId
      beneficiaryAddress, // recipient
      amount0.sub(1), // amount0Collect
      amount1.sub(1) // amount1Collect
    );
    await chai.expect(tx).to.emit(ctsiNativePoolContract, "Collect").withArgs(
      uniV3NftManagerContract.address, // owner
      beneficiaryAddress, // recipient
      getMinTick(TICK_SPACINGS[FeeAmount.HIGH]), // tickLower
      getMaxTick(TICK_SPACINGS[FeeAmount.HIGH]), // tickUpper
      amount0.sub(1), // amount0
      amount1.sub(1) // amount1
    );
  });

  it("should check NFT position after collecting tokens", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const position = await uniV3NftManagerContract.positions(nftTokenId);
    const [
      nonce,
      operator,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside0LastX128,
      feeGrowthInside1LastX128,
      tokensOwed0,
      tokensOwed1,
    ] = position;

    chai.expect(nonce).to.eq(0);
    chai.expect(operator).to.eq(ZERO_ADDRESS); // TODO: Why is this address(0)?
    chai.expect(token0).to.eq(token0);
    chai.expect(token1).to.eq(token1);
    chai.expect(fee).to.eq(FeeAmount.HIGH);
    chai.expect(tickLower).to.eq(getMinTick(TICK_SPACINGS[FeeAmount.HIGH]));
    chai.expect(tickUpper).to.eq(getMaxTick(TICK_SPACINGS[FeeAmount.HIGH]));
    chai.expect(liquidity).to.eq(0);
    chai.expect(feeGrowthInside0LastX128).to.eq(0);
    chai.expect(feeGrowthInside1LastX128).to.eq(0);
    chai.expect(tokensOwed0).to.eq(0);
    chai.expect(tokensOwed1).to.eq(0);
  });

  it("should burn the NFT", async function () {
    this.timeout(60 * 1000);

    const { uniV3NftManagerContract } = contracts;

    const tx = uniV3NftManagerContract.burn(nftTokenId, {
      gasLimit: 2000000, // 2M GWei
    });
    await chai
      .expect(tx)
      .to.emit(uniV3NftManagerContract, "Transfer")
      .withArgs(beneficiaryAddress, ZERO_ADDRESS, nftTokenId);
  });
});
