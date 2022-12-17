/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "ethers";
import * as hardhat from "hardhat";

import { ContractLibrary } from "../src/interfaces";
import { setupFixture } from "../src/utils/setupFixture";

// Setup Mocha
chai.use(solidity);

// Setup Hardhat
const setupTest = hardhat.deployments.createFixture(setupFixture);

//
// Test cases
//

describe("Curve Aave pool", function () {
  let beneficiaryAddress: string;
  let contracts: ContractLibrary;

  //////////////////////////////////////////////////////////////////////////////
  // Test parameters
  //////////////////////////////////////////////////////////////////////////////

  const DAI_BALANCE = ethers.utils.parseUnits("1000", 18);
  const USDC_BALANCE = ethers.utils.parseUnits("1000", 6);
  const USDT_BALANCE = ethers.utils.parseUnits("1000", 6);
  const CURVE_AAVE_LP_BALANCE = ethers.BigNumber.from("2999963038010893115846"); // About 3,000 tokens
  const DAI_FINAL_BALANCE = ethers.BigNumber.from("2999255314545236860053"); // About 2,999 DAI

  //////////////////////////////////////////////////////////////////////////////
  // Mocha setup
  //////////////////////////////////////////////////////////////////////////////

  before(async function () {
    this.timeout(60 * 1000);

    // Get the beneficiary wallet
    const { beneficiary } = await hardhat.getNamedAccounts();
    beneficiaryAddress = beneficiary;

    // A single fixture is used for the test suite
    contracts = await setupTest();
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: Stablecoin tokens
  //////////////////////////////////////////////////////////////////////////////

  it("should get underlying tokens", async function () {
    this.timeout(60 * 1000);

    const options = {
      gasLimit: ethers.BigNumber.from("100000"), // 100K
    };

    const {
      daiTokenContract,
      usdcTokenContract,
      usdtTokenContract,
      curveAavePoolContract,
    } = contracts;

    // Check valid coins
    const underlyingCoins = [
      await curveAavePoolContract.underlying_coins(0, options),
      await curveAavePoolContract.underlying_coins(1, options),
      await curveAavePoolContract.underlying_coins(2, options),
    ];
    chai.expect(underlyingCoins[0]).to.equal(daiTokenContract.address);
    chai.expect(underlyingCoins[1]).to.equal(usdcTokenContract.address);
    chai.expect(underlyingCoins[2]).to.equal(usdtTokenContract.address);

    // Check invalid coins
    const tx = curveAavePoolContract.underlying_coins(3, options);
    await chai.expect(tx).to.be.reverted;
  });

  it("should mint stablecoins", async function () {
    this.timeout(60 * 1000);

    const { daiTokenContract, usdcTokenContract, usdtTokenContract } =
      contracts;

    let tx = daiTokenContract.mint(beneficiaryAddress, DAI_BALANCE);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdcTokenContract.mint(beneficiaryAddress, USDC_BALANCE);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdtTokenContract.mint(beneficiaryAddress, USDT_BALANCE);
    await chai.expect(tx).to.not.be.reverted;
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test Curve Aave pool
  //////////////////////////////////////////////////////////////////////////////

  it("should approve Curve Aave pool to transfer stablecoins", async function () {
    this.timeout(60 * 1000);

    const {
      daiTokenContract,
      usdcTokenContract,
      usdtTokenContract,
      curveAavePoolContract,
    } = contracts;

    let tx = daiTokenContract.approve(
      curveAavePoolContract.address,
      DAI_BALANCE.add(300) // Add some dust for testing
    );
    await chai.expect(tx).to.not.be.reverted;

    tx = usdcTokenContract.approve(curveAavePoolContract.address, USDC_BALANCE);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdtTokenContract.approve(curveAavePoolContract.address, USDT_BALANCE);
    await chai.expect(tx).to.not.be.reverted;
  });

  it("should check am3CRV balance before adding liquidity", async function () {
    this.timeout(60 * 1000);

    const { curveAaveLpTokenContract } = contracts;

    const balance = await curveAaveLpTokenContract.balanceOf(
      beneficiaryAddress
    );
    chai.expect(balance).to.eq(0);
  });

  it("should add liquidity to Curve Aave pool", async function () {
    this.timeout(60 * 1000);

    const { curveAavePoolContract } = contracts;

    const tx = curveAavePoolContract["add_liquidity(uint256[3],uint256,bool)"](
      [DAI_BALANCE, USDC_BALANCE, USDT_BALANCE], // amounts
      0, // min mint amount
      true // use underlying?
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it("should check am3CRV balance after adding liquidity", async function () {
    this.timeout(60 * 1000);

    const { curveAaveLpTokenContract } = contracts;

    const balance = await curveAaveLpTokenContract.balanceOf(
      beneficiaryAddress
    );
    chai.expect(balance).to.eq(CURVE_AAVE_LP_BALANCE);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test Curve DAO
  //////////////////////////////////////////////////////////////////////////////

  it("should approve Curve gauge spending am3CRV tokens", async function () {
    this.timeout(60 * 1000);

    const { curveAaveLpTokenContract, curveAaveGaugeContract } = contracts;

    const tx = curveAaveLpTokenContract.approve(
      curveAaveGaugeContract.address,
      CURVE_AAVE_LP_BALANCE
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it("should stake funds in Curve gauge", async function () {
    this.timeout(60 * 1000);

    const { curveAaveGaugeContract } = contracts;

    const tx = curveAaveGaugeContract["deposit(uint256)"](
      CURVE_AAVE_LP_BALANCE
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it("should check Curve Aave gauge balance after staking", async function () {
    this.timeout(60 * 1000);

    const { curveAaveGaugeContract } = contracts;

    const balance = await curveAaveGaugeContract.balanceOf(beneficiaryAddress);
    chai.expect(balance).to.eq(CURVE_AAVE_LP_BALANCE);
  });

  it("should check am3CRV balance after staking", async function () {
    this.timeout(60 * 1000);

    const { curveAaveLpTokenContract } = contracts;

    const balance = await curveAaveLpTokenContract.balanceOf(
      beneficiaryAddress
    );
    chai.expect(balance).to.eq(0);
  });

  it("should unstake funds from Curve gauge", async function () {
    this.timeout(60 * 1000);

    const { curveAaveGaugeContract } = contracts;

    const tx = curveAaveGaugeContract.withdraw(CURVE_AAVE_LP_BALANCE);
    await chai.expect(tx).to.not.be.reverted;
  });

  it("should check Curve Aave gauge balance after unstaking", async function () {
    this.timeout(60 * 1000);

    const { curveAaveGaugeContract } = contracts;

    const balance = await curveAaveGaugeContract.balanceOf(beneficiaryAddress);
    chai.expect(balance).to.eq(0);
  });

  it("should check am3CRV balance after unstaking", async function () {
    this.timeout(60 * 1000);

    const { curveAaveLpTokenContract } = contracts;

    const balance = await curveAaveLpTokenContract.balanceOf(
      beneficiaryAddress
    );
    chai.expect(balance).to.eq(CURVE_AAVE_LP_BALANCE);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test Curve Aave pool
  //////////////////////////////////////////////////////////////////////////////

  it("should remove liquidity from Curve Aave pool", async function () {
    this.timeout(60 * 1000);

    const { curveAavePoolContract } = contracts;

    // Calculate the amount received when withdrawing a single coin
    const withdrawAmount = await curveAavePoolContract.calc_withdraw_one_coin(
      CURVE_AAVE_LP_BALANCE,
      0 // DAI index
    );
    chai.expect(withdrawAmount).to.eq(DAI_FINAL_BALANCE);

    const tx = curveAavePoolContract[
      "remove_liquidity_one_coin(uint256,int128,uint256,bool)"
    ](
      CURVE_AAVE_LP_BALANCE, // (LP?) token amount
      0, // DAI index
      0, // min amount
      true // Use underlying
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it("should check am3CRV balance after removing liquidity", async function () {
    this.timeout(60 * 1000);

    const { curveAaveLpTokenContract } = contracts;

    const balance = await curveAaveLpTokenContract.balanceOf(
      beneficiaryAddress
    );
    chai.expect(balance).to.eq(0);
  });

  it("should check DAI balance after removing liquidity", async function () {
    this.timeout(60 * 1000);

    const { daiTokenContract } = contracts;

    const balance = await daiTokenContract.balanceOf(beneficiaryAddress);
    chai.expect(balance).to.eq(DAI_FINAL_BALANCE);
  });
});
