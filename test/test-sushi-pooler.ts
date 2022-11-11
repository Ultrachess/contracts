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
import UniswapV2PairAbi from "../src/abi/contracts/depends/sushiswap/uniswapv2/UniswapV2Pair.sol/UniswapV2Pair.json";
import UniswapV2Router02Abi from "../src/abi/contracts/depends/sushiswap/uniswapv2/UniswapV2Router02.sol/UniswapV2Router02.json";
import SushiPoolerAbi from "../src/abi/contracts/src/token/routes/SushiPooler.sol/SushiPooler.json";
import SushiSwapperAbi from "../src/abi/contracts/src/token/routes/SushiSwapper.sol/SushiSwapper.json";
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
const MATIC_DEPOSIT = MATIC_BALANCE.div(2); // TODO: Account for fees and price impact
const MATIC_REMAINING = MATIC_BALANCE.sub(MATIC_DEPOSIT);
const USDC_BALANCE = ethers.BigNumber.from("479466363"); // About 479 USDC due to price impact and fees
const LP_RETURNED = ethers.BigNumber.from("626425873999176"); // About 0.0006 tokens
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
  const uniV2RouterContract = new ethers.Contract(
    generatedAddresses.uniV2Router,
    UniswapV2Router02Abi,
    adminWallet
  );
  const sushiSwapperContract = new ethers.Contract(
    generatedAddresses.sushiSwapper,
    SushiSwapperAbi,
    adminWallet
  );
  const sushiPoolerContract = new ethers.Contract(
    generatedAddresses.sushiPooler,
    SushiPoolerAbi,
    adminWallet
  );

  return {
    wmaticContract,
    usdcContract,
    wmaticUsdcPairContract,
    uniV2RouterContract,
    sushiSwapperContract,
    sushiPoolerContract,
  };
});

describe("SushiPooler", function () {
  let adminWalletAddress: string;
  let contracts: any;

  before(async function () {
    this.timeout(60 * 1000);

    // Get the admin wallet
    const { adminWallet } = await hardhat.getNamedAccounts();
    [adminWalletAddress] = [adminWallet];

    // A single fixture is used for the test suite
    contracts = await setupTest();
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: Obtain WMATIC and USDC
  //////////////////////////////////////////////////////////////////////////////

  it("should obtain WMATIC and USDC", async function () {
    this.timeout(60 * 1000);

    const { sushiSwapperContract } = contracts;

    const tx = await sushiSwapperContract.addNative(
      adminWalletAddress, // Recipient
      MATIC_BALANCE, // Amount
      Math.floor(Date.now() / 1000) + 60 * 20, // Deadline (20 mins)
      {
        value: MATIC_BALANCE,
        gasLimit: 2000000, // 2M GWei
      }
    );
    await tx.wait();
  });

  it("should check balances after swapping", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract, usdcContract } = contracts;

    const wmaticBalance = await wmaticContract.balanceOf(adminWalletAddress);
    chai.expect(wmaticBalance).to.eq(MATIC_REMAINING);

    const usdcBalance = await usdcContract.balanceOf(adminWalletAddress);
    chai.expect(usdcBalance).to.eq(USDC_BALANCE);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test SushiPooler
  //////////////////////////////////////////////////////////////////////////////

  it("should approve SushiPooler spending WMATIC", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract, sushiPoolerContract } = contracts;

    const tx = wmaticContract.approve(
      sushiPoolerContract.address,
      MATIC_REMAINING
    );
    await chai
      .expect(tx)
      .to.emit(wmaticContract, "Approval")
      .withArgs(
        adminWalletAddress,
        sushiPoolerContract.address,
        MATIC_REMAINING
      );
  });

  it("should approve SushiPooler spending USDC", async function () {
    this.timeout(60 * 1000);

    const { usdcContract, sushiPoolerContract } = contracts;

    const tx = usdcContract.approve(sushiPoolerContract.address, USDC_BALANCE);
    await chai
      .expect(tx)
      .to.emit(usdcContract, "Approval")
      .withArgs(adminWalletAddress, sushiPoolerContract.address, USDC_BALANCE);
  });

  it("should add tokens to pooler in exchange for SushiLP", async function () {
    this.timeout(60 * 1000);

    const {
      wmaticContract,
      usdcContract,
      wmaticUsdcPairContract,
      uniV2RouterContract,
      sushiPoolerContract,
    } = contracts;

    const tx = sushiPoolerContract.addLiquidity(
      MATIC_REMAINING, // amountADesired
      USDC_BALANCE, // amountBDesired
      0, // amountAMin
      0, // amountBMin
      adminWalletAddress, // sender
      adminWalletAddress, // recipient
      Math.floor(Date.now() / 1000) + 60 * 20, // deadline (20 mins)
      {
        gasLimit: 2000000, // 2M GWei
      }
    );

    // Acquire token pair from sender
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      adminWalletAddress, // src
      sushiPoolerContract.address, // dst
      MATIC_REMAINING // wad
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      adminWalletAddress, // from
      sushiPoolerContract.address, // to
      USDC_BALANCE // value
    );

    // Approve Uni-V2 router
    await chai.expect(tx).to.emit(wmaticContract, "Approval").withArgs(
      sushiPoolerContract.address, // owner
      uniV2RouterContract.address, // spender
      MATIC_REMAINING // value
    );
    await chai.expect(tx).to.emit(usdcContract, "Approval").withArgs(
      sushiPoolerContract.address, // owner
      uniV2RouterContract.address, // spender
      USDC_BALANCE // value
    );

    // Add liquidity
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      ZERO_ADDRESS, // src
      adminWalletAddress, // dst
      LP_RETURNED // wad
    );
    await chai
      .expect(tx)
      .to.emit(wmaticUsdcPairContract, "Mint")
      .withArgs(
        uniV2RouterContract.address, // sender
        USDC_BALANCE, // amount0
        MATIC_REMAINING.sub(ethers.BigNumber.from("1239054941055447928")) // amount1 (less ~1.2 WMATIC)
      );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Sync").withArgs(
      ethers.BigNumber.from("322625000000"), // reserve0 (322,625 USDC)
      ethers.BigNumber.from("550710105207354026519285") // reserve1 (about 550,710 WMATIC)
    );
  });

  it("should check WMATIC balance after pooling", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract } = contracts;

    const balance = await wmaticContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(0);
  });

  it("should check USDC balance after pooling", async function () {
    this.timeout(60 * 1000);

    const { usdcContract } = contracts;

    const balance = await usdcContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(0);
  });

  it("should check SushiLP balance after pooling", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract } = contracts;

    const balance = await wmaticUsdcPairContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(LP_RETURNED);
  });

  it("should approve SushiPooler spending SushiLP", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract, sushiPoolerContract } = contracts;

    const tx = wmaticUsdcPairContract.approve(
      sushiPoolerContract.address,
      LP_RETURNED
    );
    await chai
      .expect(tx)
      .to.emit(wmaticUsdcPairContract, "Approval")
      .withArgs(adminWalletAddress, sushiPoolerContract.address, LP_RETURNED);
  });

  it("should remove SushiLP from the pooler in exchange for tokens", async function () {
    this.timeout(60 * 1000);

    const {
      wmaticContract,
      usdcContract,
      wmaticUsdcPairContract,
      uniV2RouterContract,
      sushiPoolerContract,
    } = contracts;

    const tx = sushiPoolerContract.removeLiquidity(
      LP_RETURNED, // amountLiquidity
      0, // amountAMin
      0, // amountBMin
      adminWalletAddress, // sender
      adminWalletAddress, // recipient
      Math.floor(Date.now() / 1000) + 60 * 20, // deadline (20 mins)
      {
        gasLimit: 2000000, // 2M GWei
      }
    );
    await (await tx).wait();

    // Acquire SushiLP from sender
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      adminWalletAddress, // src
      sushiPoolerContract.address, // dst
      LP_RETURNED // wad
    );

    // Approve Uni-V2 router
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Approval").withArgs(
      sushiPoolerContract.address, // owner
      uniV2RouterContract.address, // spender
      LP_RETURNED // value
    );

    // Remove liquidity
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      sushiPoolerContract.address, // src
      wmaticUsdcPairContract.address, // dst
      LP_RETURNED // wad
    );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // src
      ZERO_ADDRESS, // dst
      LP_RETURNED // wad
    );
    await chai
      .expect(tx)
      .to.emit(wmaticUsdcPairContract, "Burn")
      .withArgs(
        uniV2RouterContract.address, // sender
        USDC_BALANCE.sub(1), // amount0
        MATIC_REMAINING.sub(ethers.BigNumber.from("1239054941056724923")), // amount1 (less ~1.2 WMATIC)
        adminWalletAddress // to
      );
    await chai.expect(tx).to.emit(wmaticUsdcPairContract, "Sync").withArgs(
      ethers.BigNumber.from("322145533638"), // reserve0 (about 322,146 USDC)
      ethers.BigNumber.from("549891672131147542260601") // reserve1 (about 549,892 WMATIC)
    );

    // Receive token pair to recipient
    await chai
      .expect(tx)
      .to.emit(wmaticContract, "Transfer")
      .withArgs(
        wmaticUsdcPairContract.address, // from
        adminWalletAddress, // to
        MATIC_REMAINING.sub(ethers.BigNumber.from("1239054941056724923")) // value (less ~1.2 WMATIC)
      );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // from
      adminWalletAddress, // to
      USDC_BALANCE.sub(1) // value
    );
  });

  it("should check WMATIC balance after unpooling", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract } = contracts;

    const balance = await wmaticContract.balanceOf(adminWalletAddress);
    chai
      .expect(balance)
      .to.eq(MATIC_REMAINING.sub(ethers.BigNumber.from("1239054941056724923")));
  });

  it("should check USDC balance after unpooling", async function () {
    this.timeout(60 * 1000);

    const { usdcContract } = contracts;

    const balance = await usdcContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(USDC_BALANCE.sub(1));
  });

  it("should check SushiLP balance after unpooling", async function () {
    this.timeout(60 * 1000);

    const { wmaticUsdcPairContract } = contracts;

    const balance = await wmaticUsdcPairContract.balanceOf(adminWalletAddress);
    chai.expect(balance).to.eq(0);
  });
});
