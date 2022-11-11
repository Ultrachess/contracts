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
const MATIC_RETURNED = ethers.BigNumber.from("814768751222308082188");

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

  return {
    wmaticContract,
    usdcContract,
    wmaticUsdcPairContract,
    uniV2RouterContract,
    sushiSwapperContract,
  };
});

describe("SushiSwapper", function () {
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

  it("should add MATIC in exchange for token pair", async function () {
    this.timeout(60 * 1000);

    const {
      wmaticContract,
      usdcContract,
      wmaticUsdcPairContract,
      uniV2RouterContract,
      sushiSwapperContract,
    } = contracts;

    const tx = sushiSwapperContract.addNative(
      adminWalletAddress, // Recipient
      MATIC_BALANCE, // Amount
      Math.floor(Date.now() / 1000) + 60 * 20, // Deadline (20 mins)
      {
        value: MATIC_BALANCE,
        gasLimit: 2000000, // 2M GWei
      }
    );

    // Deposit into native token wrapper
    await chai.expect(tx).to.emit(wmaticContract, "Deposit").withArgs(
      sushiSwapperContract.address, // dst
      MATIC_BALANCE // wad
    );

    // Approve Uni-V2 router
    await chai.expect(tx).to.emit(wmaticContract, "Approval").withArgs(
      sushiSwapperContract.address, // owner
      uniV2RouterContract.address, // spender
      MATIC_BALANCE.div(2) // value
    );

    // Swap WMATIC for USDC
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      sushiSwapperContract.address, // src
      wmaticUsdcPairContract.address, // dst
      MATIC_BALANCE.div(2) // wad
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // from
      sushiSwapperContract.address, // to
      USDC_BALANCE // value
    );

    // Return token pair to the recipient
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      sushiSwapperContract.address, // src
      adminWalletAddress, // dst
      MATIC_REMAINING // wad
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      sushiSwapperContract.address, // from
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

  it("should approve SushiSwapper spending WMATIC", async function () {
    this.timeout(60 * 1000);

    const { wmaticContract, sushiSwapperContract } = contracts;

    const tx = wmaticContract.approve(
      sushiSwapperContract.address,
      MATIC_REMAINING
    );
    await chai
      .expect(tx)
      .to.emit(wmaticContract, "Approval")
      .withArgs(
        adminWalletAddress,
        sushiSwapperContract.address,
        MATIC_REMAINING
      );
  });

  it("should approve SushiSwapper spending USDC", async function () {
    this.timeout(60 * 1000);

    const { usdcContract, sushiSwapperContract } = contracts;

    const tx = usdcContract.approve(sushiSwapperContract.address, USDC_BALANCE);
    await chai
      .expect(tx)
      .to.emit(usdcContract, "Approval")
      .withArgs(adminWalletAddress, sushiSwapperContract.address, USDC_BALANCE);
  });

  it("should remove token pair in exchange for MATIC", async function () {
    this.timeout(60 * 1000);

    const {
      wmaticContract,
      usdcContract,
      wmaticUsdcPairContract,
      uniV2RouterContract,
      sushiSwapperContract,
    } = contracts;

    const tx = sushiSwapperContract.removeNative(
      adminWalletAddress, // Sender
      adminWalletAddress, // Recipient
      MATIC_REMAINING, // Amount0
      USDC_BALANCE, // Amount1
      Math.floor(Date.now() / 1000) + 60 * 20, // Deadline (20 mins)
      {
        gasLimit: 2000000, // 2M GWei
      }
    );

    // Acquire token pair from sender
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      adminWalletAddress, // src
      sushiSwapperContract.address, // dst
      MATIC_REMAINING // wad
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      adminWalletAddress, // from
      sushiSwapperContract.address, // to
      USDC_BALANCE // value
    );

    // Approve Uni-V2 router
    await chai.expect(tx).to.emit(usdcContract, "Approval").withArgs(
      sushiSwapperContract.address, // owner
      uniV2RouterContract.address, // spender
      USDC_BALANCE // value
    );

    // Swap USDC for WMATIC
    await chai.expect(tx).to.emit(wmaticContract, "Transfer").withArgs(
      wmaticUsdcPairContract.address, // src
      sushiSwapperContract.address, // dst
      MATIC_RETURNED // wad
    );
    await chai.expect(tx).to.emit(usdcContract, "Transfer").withArgs(
      sushiSwapperContract.address, // from
      wmaticUsdcPairContract.address, // to
      USDC_BALANCE // value
    );

    // Withdraw from native token wrapper
    await chai.expect(tx).to.emit(wmaticContract, "Withdrawal").withArgs(
      sushiSwapperContract.address, // src
      MATIC_REMAINING.add(MATIC_RETURNED) // wad
    );

    // TODO: Test for event receiving ETH from withdrawal
  });
});
