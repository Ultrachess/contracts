/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "ethers";
import fs from "fs";
import * as hardhat from "hardhat";

chai.use(solidity);

// Contract ABIs
import MiniChefV2Abi from "../src/abi/contracts/depends/sushiswap/MiniChefV2.sol/MiniChefV2.json";
import UniswapV2FactoryAbi from "../src/abi/contracts/depends/sushiswap/uniswapv2/UniswapV2Factory.sol/UniswapV2Factory.json";
import UniswapV2PairAbi from "../src/abi/contracts/depends/sushiswap/uniswapv2/UniswapV2Pair.sol/UniswapV2Pair.json";
import UniswapV2Router02Abi from "../src/abi/contracts/depends/sushiswap/uniswapv2/UniswapV2Router02.sol/UniswapV2Router02.json";
import USDCAbi from "../src/abi/contracts/test/token/USDC.sol/USDC.json";
import WMATICAbi from "../src/abi/contracts/test/token/WMATIC.sol/WMATIC.json";

// Path to generated address file
const GENERATED_ADDRESSES = `${__dirname}/../addresses.json`;

//
// TODO: Move to constants
//

const MATIC_PRICE = 61; // In hundredths (MATIC was $0.61 observed on 2022-06-23)
const MATIC_BALANCE = ethers.constants.WeiPerEther.mul(1000)
  .mul(100)
  .div(MATIC_PRICE); // About 1639 MATIC ($1000)
const PRICE_IMPACT = 1020; // Ouch
const MATIC_DEPOSIT = MATIC_BALANCE.div(2).mul(PRICE_IMPACT).div(1000); // About 836 MATIC ($510)
const MATIC_REMAINING = MATIC_BALANCE.sub(MATIC_DEPOSIT); // About 803 MATIC ($490)
const USDC_BALANCE = ethers.BigNumber.from("489041154"); // About 489 USDC due to price impact
const USDC_DEPOSIT = ethers.BigNumber.from("470560384"); // About 471 USDC
const USDC_REMAINING = USDC_BALANCE.sub(USDC_DEPOSIT);
const WMATIC_USDC_LP_BALANCE = ethers.BigNumber.from("614808428698097");
const MATIC_EPSILON = ethers.BigNumber.from("146729402517"); // About 148 GWei
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

//
// Fixture setup
//

const setupTest = hardhat.deployments.createFixture(async ({ deployments }) => {
  // Ensure we start from a fresh deployment
  await deployments.fixture();

  // Get the Signers
  const [, adminWallet] = await hardhat.ethers.getSigners();

  // Get chain ID
  const chainId: string = await hardhat.getChainId();

  //
  // Load contract addresses
  //
  // TODO: Load addresses from deployments folder
  //
  let generatedNetworks: any = {};

  try {
    generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
  } catch (err) {
    console.log(`Skipping addresses.json: ${err}`);
  }

  const generatedAddresses = generatedNetworks[chainId] || {};

  // Construct the contracts
  const wmaticContract = new ethers.Contract(
    generatedAddresses.wmatic,
    WMATICAbi,
    adminWallet
  );
  const usdcContract = new ethers.Contract(
    generatedAddresses.usdcToken,
    USDCAbi,
    adminWallet
  );
  const wmaticUsdcPairContract = new ethers.Contract(
    generatedAddresses.wmaticUsdcPair,
    UniswapV2PairAbi,
    adminWallet
  );
  const uniV2FactoryContract = new ethers.Contract(
    generatedAddresses.uniV2Factory,
    UniswapV2FactoryAbi,
    adminWallet
  );
  const uniV2RouterContract = new ethers.Contract(
    generatedAddresses.uniV2Router,
    UniswapV2Router02Abi,
    adminWallet
  );
  const masterChefV2Contract = new ethers.Contract(
    generatedAddresses.masterChefV2,
    MiniChefV2Abi,
    adminWallet
  );

  return {
    wmaticContract,
    usdcContract,
    wmaticUsdcPairContract,
    uniV2FactoryContract,
    uniV2RouterContract,
    masterChefV2Contract,
  };
});

describe("SushiSwap", function () {
  let adminWalletAddress: string;
  let contracts: any;

  // Test parameters
  let POOL_INDEX: number; // This is read from the MasterChefV2 contract

  before(async function () {
    this.timeout(60 * 1000);

    // Get the admin wallet
    const { adminWallet } = await hardhat.getNamedAccounts();
    [adminWalletAddress] = [adminWallet];

    // A single fixture is used for the test suite
    contracts = await setupTest();
  });

  it("should get pool index from MasterChefV2", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract, masterChefV2Contract } = contracts;

    for (let i = 0; ; i++) {
      const lpToken = await masterChefV2Contract.lpToken(i);
      if (lpToken == wmaticUsdcPairContract.address) {
        POOL_INDEX = i;
        break;
      }
    }
  });

  it("should deposit into WMATIC", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract } = contracts;

    const tx = wmaticContract.deposit({ value: MATIC_BALANCE });
    await chai
      .expect(tx)
      .to.emit(wmaticContract, "Deposit")
      .withArgs(adminWalletAddress, MATIC_BALANCE);
  });

  it("should approve Uniswap spending WMATIC", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract, uniV2RouterContract } = contracts;

    const tx = wmaticContract.approve(
      uniV2RouterContract.address,
      MATIC_BALANCE
    );
    await chai
      .expect(tx)
      .to.emit(wmaticContract, "Approval")
      .withArgs(adminWalletAddress, uniV2RouterContract.address, MATIC_BALANCE);
  });

  it("should swap half of WMATIC for USDC", async function () {
    this.timeout(60 * 1000);

    const {
      wmaticContract,
      usdcContract,
      wmaticUsdcPairContract,
      uniV2RouterContract,
    } = contracts;

    const tx = uniV2RouterContract.swapExactTokensForTokens(
      MATIC_DEPOSIT, // amountIn
      0, // amountOutMin
      [wmaticContract.address, usdcContract.address], // path
      adminWalletAddress, // to
      Math.floor(Date.now() / 1000) + 60 * 20, // deadline (20 mins)
      {
        gasLimit: 2000000, // 2M GWei
      }
    );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Swap").withArgs(
      uniV2RouterContract.address, // sender
      0, // amount0In
      MATIC_DEPOSIT, // amount1In
      USDC_BALANCE, // amount0Out
      0, // amount1Out
      adminWalletAddress // to
    );
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      adminWalletAddress, // from
      wmaticUsdcPairContract.address, // to
      MATIC_DEPOSIT // value
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // from
      adminWalletAddress, // to
      USDC_BALANCE // value
    );
  });

  it("should check WMATIC balance after swapping", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract } = contracts;

    const balance = await wmaticContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(MATIC_REMAINING);
  });

  it("should check USDC balance after swapping", async function () {
    this.timeout(60 * 1000);

    const { usdcContract } = contracts;

    const balance = await usdcContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(USDC_BALANCE);
  });

  it("should approve Uniswap spending USDC", async function () {
    this.timeout(60 * 1000);

    const { usdcContract, uniV2RouterContract } = contracts;

    const tx = usdcContract.approve(uniV2RouterContract.address, USDC_BALANCE);
    await chai
      .expect(tx)
      .to.emit(usdcContract, "Approval")
      .withArgs(adminWalletAddress, uniV2RouterContract.address, USDC_BALANCE);
  });

  it("should add liquidity to WMATIC/USDC pool", async function () {
    this.timeout(60 * 1000);

    const {
      wmaticContract,
      usdcContract,
      wmaticUsdcPairContract,
      uniV2FactoryContract,
      uniV2RouterContract,
    } = contracts;

    const tx = uniV2RouterContract.addLiquidity(
      wmaticContract.address, // tokenA
      usdcContract.address, // tokenB
      MATIC_REMAINING, // amountADesired
      USDC_BALANCE, // amountBDesired
      0, // amountAMin
      0, // amountBMin
      adminWalletAddress, // to
      Math.floor(Date.now() / 1000) + 60 * 20, // deadline (20 mins)
      {
        gasLimit: 2000000, // 2M GWei
      }
    );
    await chai.expect(tx).to.not.emit(uniV2FactoryContract, "PairCreated");
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      adminWalletAddress, // from
      wmaticUsdcPairContract.address, // to
      MATIC_REMAINING // value
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      adminWalletAddress, // from
      wmaticUsdcPairContract.address, // to
      USDC_DEPOSIT // value
    );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      ZERO_ADDRESS, // from
      adminWalletAddress, // to
      WMATIC_USDC_LP_BALANCE // value
    );
  });

  it("should check remaining WMATIC balance", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract } = contracts;

    const balance = await wmaticContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(0);
  });

  it("should check remaining USDC balance", async function () {
    this.timeout(60 * 1000);

    const { usdcContract } = contracts;

    const balance = await usdcContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(USDC_REMAINING);
  });

  it("should check WMATIC/USDC SushiLP balance", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract } = contracts;

    const balance = await wmaticUsdcPairContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(WMATIC_USDC_LP_BALANCE);
  });

  it("should approve MasterChefV2 spending WMATIC/USDC SushiLP", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract, masterChefV2Contract } = contracts;

    const tx = wmaticUsdcPairContract.approve(
      masterChefV2Contract.address,
      WMATIC_USDC_LP_BALANCE
    );
    await chai
      .expect(tx)
      .to.emit(wmaticUsdcPairContract, "Approval")
      .withArgs(
        adminWalletAddress,
        masterChefV2Contract.address,
        WMATIC_USDC_LP_BALANCE
      );
  });

  it("should check MasterChefV2 balance before depositing", async function () {
    this.timeout(60 * 1000);

    const { masterChefV2Contract } = contracts;

    const userInfo = await masterChefV2Contract.userInfo(
      POOL_INDEX,
      adminWalletAddress
    );
    const [
      amount, // LP token amount the user has provided.
      rewardDebt, // The amount of SUSHI entitled to the user.
    ] = userInfo;

    chai.expect(amount).to.eq(0);
    chai.expect(rewardDebt).to.eq(0);
  });

  it("should deposit WMATIC/USDC SushiLP into MasterChefV2", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract, masterChefV2Contract } = contracts;

    const tx = masterChefV2Contract.deposit(
      POOL_INDEX, // Pool index
      WMATIC_USDC_LP_BALANCE, // amount
      adminWalletAddress // to
    );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      adminWalletAddress, // from
      masterChefV2Contract.address, // to
      WMATIC_USDC_LP_BALANCE // value
    );
    await chai.expect(tx).to.emit(masterChefV2Contract, "Deposit").withArgs(
      adminWalletAddress, // user
      0, // Pool index
      WMATIC_USDC_LP_BALANCE, // amount
      adminWalletAddress // to
    );
  });

  it("should check MasterChefV2 balance after depositing", async function () {
    this.timeout(60 * 1000);

    const { masterChefV2Contract } = contracts;

    const userInfo = await masterChefV2Contract.userInfo(
      POOL_INDEX,
      adminWalletAddress
    );
    const [
      amount, // LP token amount the user has provided.
      rewardDebt, // The amount of SUSHI entitled to the user.
    ] = userInfo;

    chai.expect(amount).to.eq(WMATIC_USDC_LP_BALANCE);
    chai.expect(rewardDebt).to.eq(0);
  });

  it("should check remaining WMATIC/USDC SushiLP balance", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract } = contracts;

    const balance = await wmaticUsdcPairContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(0);
  });

  it("should withdraw WMATIC/USDC SushiLP from MasterChefV2", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract, masterChefV2Contract } = contracts;

    const tx = masterChefV2Contract.withdraw(
      POOL_INDEX, // Pool index
      WMATIC_USDC_LP_BALANCE, // amount
      adminWalletAddress // to
    );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      masterChefV2Contract.address, // from
      adminWalletAddress, // to
      WMATIC_USDC_LP_BALANCE // value
    );
    await chai.expect(tx).to.emit(masterChefV2Contract, "Withdraw").withArgs(
      adminWalletAddress, // user
      0, // Pool index
      WMATIC_USDC_LP_BALANCE, // amount
      adminWalletAddress // to
    );
  });

  it("should check received WMATIC/USDC SushiLP balance", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract } = contracts;

    const balance = await wmaticUsdcPairContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(WMATIC_USDC_LP_BALANCE);
  });

  it("should check MasterChefV2 balance after withdrawing", async function () {
    this.timeout(60 * 1000);

    const { masterChefV2Contract } = contracts;

    const userInfo = await masterChefV2Contract.userInfo(
      POOL_INDEX,
      adminWalletAddress
    );
    const [
      amount, // LP token amount the user has provided.
      rewardDebt, // The amount of SUSHI entitled to the user.
    ] = userInfo;

    chai.expect(amount).to.eq(0);
    chai.expect(rewardDebt).to.eq(0);
  });

  it("should approve SushiSwap spending WMATIC/USDC SushiLP", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract, uniV2RouterContract } = contracts;

    const tx = wmaticUsdcPairContract.approve(
      uniV2RouterContract.address,
      WMATIC_USDC_LP_BALANCE
    );
    await chai
      .expect(tx)
      .to.emit(wmaticUsdcPairContract, "Approval")
      .withArgs(
        adminWalletAddress,
        uniV2RouterContract.address,
        WMATIC_USDC_LP_BALANCE
      );
  });

  it("should remove liquidity from WMATIC/USDC pool", async function () {
    this.timeout(60 * 1000);

    const {
      usdcContract,
      wmaticContract,
      wmaticUsdcPairContract,
      uniV2RouterContract,
    } = contracts;

    const tx = uniV2RouterContract.removeLiquidity(
      usdcContract.address, // tokenA
      wmaticContract.address, // tokenB
      WMATIC_USDC_LP_BALANCE, // liquidity
      0, // amountAMin
      0, // amountBMin
      adminWalletAddress, // to
      Math.floor(Date.now() / 1000) + 60 * 20, // deadline (20 mins)
      {
        gasLimit: 2000000, // 2M GWei
      }
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // from
      adminWalletAddress, // to
      USDC_DEPOSIT.sub(1) // value (We lost a Wei)
    );
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // from
      adminWalletAddress, // to
      MATIC_REMAINING.sub(MATIC_EPSILON) // value (We lost a couple GWei)
    );
  });

  it("should check received WMATIC/USDC SushiLP balance", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract } = contracts;

    const balance = await wmaticUsdcPairContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(0);
  });
});
