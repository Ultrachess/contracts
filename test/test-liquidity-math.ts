/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "ethers";
import * as hardhat from "hardhat";

import { uniV3StakerAbi } from "../src/contracts/dapp";
import { ContractLibrary } from "../src/interfaces";
import { setupFixture } from "../src/utils/setupFixture";

// Setup Mocha
chai.use(solidity);

// Setup Hardhat
const setupTest = hardhat.deployments.createFixture(setupFixture);

//
// Test cases
//

describe("Liquidity math", () => {
  let deployer: SignerWithAddress | undefined;
  let beneficiaryAddress: string;
  let contracts: ContractLibrary;
  let nftTokenId: number | undefined; // Set when first LP NFT is minted

  //////////////////////////////////////////////////////////////////////////////
  // Test parameters
  //////////////////////////////////////////////////////////////////////////////

  //
  // Before depositing, we check the deployer's liquidity position and token
  // balances
  //

  // Initial USDC held by the deployer
  const INITIAL_DEPLOYER_USDC = ethers.BigNumber.from(0);

  // Initial base tokens held by the deployer (includes dust from first mint)
  const INITIAL_DEPLOYER_BASE_TOKENS = ethers.BigNumber.from(
    "8999000000068009583402"
  ); // About 8,999 base tokens

  // Initial asset tokens held by the deployer
  const INITIAL_DEPLOYER_ASSET_TOKENS = ethers.BigNumber.from(0);

  // Initial liquidity position of the deployer
  const INITIAL_DEPLOYER_LIQUIDITY = ethers.BigNumber.from(
    "1000010502043492201"
  ); // About 1 liquidity unit

  // Initial base token reserves
  const INITIAL_BASE_RESERVES = ethers.BigNumber.from("999999931990416598"); // About 1 base token

  // Initial asset token reserves
  const INITIAL_ASSET_RESERVES = ethers.BigNumber.from("1000021072895273801"); // About 1 asset token

  //
  // Before minting, we check the price using 0.001 USDC to minimize slippage
  //

  // Amount of USDC used to check the price (small to minimize slippage)
  const USDC_PRICE_CHECK_AMOUNT = ethers.utils.parseUnits("0.001", 6); // 0.001 USDC

  // Initial price of the base token
  const INITIAL_BASE_PRICE = ethers.BigNumber.from("988950661395079"); // About 0.989 base tokens per USDC

  //
  // We mint an LP NFT and deposit 1 USDC
  //
  // Note that this incurs heavy slippage, as the pool initially has only one
  // of each token in its reserve.
  //

  // We start with 1 USDC
  const INITIAL_USDC_BALANCE = ethers.utils.parseUnits("1", 6); // 1 USDC

  // We stake the USDC in the Curve Aave pool and pay a 0.3% fee
  const CURVE_AAVE_LP_AMOUNT = ethers.BigNumber.from("999721087829635796"); // About 1 LP token

  // Curve Gauge shares are issued 1:1 with LP tokens
  const CURVE_AAVE_GAUGE_SHARES = CURVE_AAVE_LP_AMOUNT; // About 1 gauge share

  // We swap asset tokens into base tokens
  const BASE_TOKENS_BOUGHT = ethers.BigNumber.from("291844915735727073"); // About 0.292 base tokens
  const ASSET_TOKENS_SPENT = ethers.BigNumber.from("416291700753402559"); // About 0.416 asset tokens

  // We swap asset token dust into base tokens
  const BASE_DUST_BOUGHT = ethers.BigNumber.from("721353409870846"); // About 0.0007 base tokens
  const ASSET_DUST_SPENT = ethers.BigNumber.from("1454047980508158"); // About 0.001 asset tokens

  // Share of the tokens in the LP NFT
  const BASE_TOKEN_SHARE = BASE_TOKENS_BOUGHT; // About 0.292 base tokens
  const ASSET_TOKEN_SHARE = ethers.BigNumber.from("581975339095725079"); // About 0.582 asset tokens

  // Amount of Uniswap V3 liquidity
  const LIQUIDITY_AMOUNT = ethers.BigNumber.from("412124427568499117"); // About 0.412 liquidity units

  //
  // Check the price and reserves after minting the LP NFT
  //
  // The resulting price is expected to be cut in half, as the pool now has
  // 1 base token and 2 asset tokens in its reserves.
  //

  // Resulting price of base token
  const RESULTING_BASE_PRICE = ethers.BigNumber.from("495471740396258"); // About 0.495 base tokens per USDC

  // Resulting base token reserves
  const RESULTING_BASE_RESERVES = ethers.BigNumber.from("999278578580545752"); // About 1 base token

  // Resulting asset token reserves
  const RESULTING_ASSET_RESERVES = ethers.BigNumber.from("1999742160724909597"); // About 2 USDC

  //
  // Finally, we unstake the LP NFT for USDC
  //

  // Tokens collected from the LP NFT
  const BASE_TOKENS_COLLECTED = ethers.BigNumber.from("291634392396290031"); // About 0.292 base tokens
  const ASSET_TOKENS_COLLECTED = ethers.BigNumber.from("582399695634932497"); // About 0.582 asset tokens

  // Base tokens are sold for asset tokens
  const ASSET_TOKENS_BOUGHT = ethers.BigNumber.from("409497122600816316"); // About 0.409 asset tokens

  // Asset tokens are unstaked from the Curve Aave gauge
  const CURVE_AAVE_GAUGE_UNSTAKED = ethers.BigNumber.from("991896818235748813"); // About 0.992 gauge shares

  // LP tokens are returned to the Curve Aave pool
  const CURVE_AAVE_LP_UNSTAKED = CURVE_AAVE_GAUGE_UNSTAKED; // About 0.992 LP tokens

  // Withdrawn USDC from the Curve Aave pool
  const USDC_RETURNED = ethers.BigNumber.from("991767"); // About 0.992 USDC

  //
  // Check the price and reserves after minting the LP NFT
  //
  // The resulting price is expected to be cut in half, as the pool now has
  // 1 base token and 2 asset tokens in its reserves.
  //

  // Final price of base token
  const FINAL_BASE_PRICE = ethers.BigNumber.from("981772273085180"); // About 0.982 base tokens per USDC

  // Final base token reserves
  const FINAL_BASE_RESERVES = ethers.BigNumber.from("999278578580545752"); // About 0.999 base tokens

  // Final asset token reserves
  const FINAL_ASSET_RESERVES = ethers.BigNumber.from("1007845342489160784"); // About 1.008 asset tokens

  // Remaining token dust
  const BASE_TOKEN_DUST = ethers.BigNumber.from("721353409870846"); // About 0.0007 base tokens
  const ASSET_TOKEN_DUST = ethers.BigNumber.from(0);

  // Final USDC balance
  const FINAL_USDC_BALANCE = ethers.BigNumber.from("992767"); // About 0.993 USDC

  //////////////////////////////////////////////////////////////////////////////
  // Mocha setup
  //////////////////////////////////////////////////////////////////////////////

  before(async function () {
    this.timeout(60 * 1000);

    // Get the Signers
    [deployer] = await hardhat.ethers.getSigners();

    // Get the beneficiary wallet
    const namedAccounts: {
      [name: string]: string;
    } = await hardhat.getNamedAccounts();
    beneficiaryAddress = namedAccounts.beneficiary;

    // A single fixture is used for the test suite
    contracts = await setupTest();
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: Obtain tokens
  //////////////////////////////////////////////////////////////////////////////

  it("should obtain USDC", async function () {
    this.timeout(60 * 1000);

    const { usdcTokenContract } = contracts;

    // Mint USDC
    const tx: Promise<ethers.ContractTransaction> = usdcTokenContract.mint(
      beneficiaryAddress,
      INITIAL_USDC_BALANCE.add(USDC_PRICE_CHECK_AMOUNT)
    );
    await (await tx).wait();

    const usdcBalance = await usdcTokenContract.balanceOf(beneficiaryAddress);
    chai
      .expect(usdcBalance)
      .to.equal(INITIAL_USDC_BALANCE.add(USDC_PRICE_CHECK_AMOUNT));
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test deployer's balances
  //////////////////////////////////////////////////////////////////////////////

  it("should check the deployer's balances", async function () {
    this.timeout(60 * 1000);

    const {
      assetTokenContract,
      baseTokenContract,
      uniswapV3NftManagerContract,
      uniswapV3PoolContract,
      usdcTokenContract,
    } = contracts;

    // Check token balances
    const usdcBalance = await usdcTokenContract.balanceOf(deployer.address);
    chai.expect(usdcBalance).to.equal(INITIAL_DEPLOYER_USDC);

    const baseTokenBalance = await baseTokenContract.balanceOf(
      deployer.address
    );
    chai.expect(baseTokenBalance).to.equal(INITIAL_DEPLOYER_BASE_TOKENS);

    const assetTokenBalance = await assetTokenContract.balanceOf(
      deployer.address
    );
    chai.expect(assetTokenBalance).to.equal(INITIAL_DEPLOYER_ASSET_TOKENS);

    // Get the deployer's LP NFT token ID
    const deployerLpNftTokenId =
      await uniswapV3NftManagerContract.tokenOfOwnerByIndex(
        deployer.address,
        0
      );

    // Uniswap V3 LP NFT token IDs start at 1
    chai.expect(deployerLpNftTokenId).to.equal(1);

    // Get the deployer's liquidity position
    const [, , , , , , , liquidity, , , ,] =
      await uniswapV3NftManagerContract.positions(deployerLpNftTokenId);

    chai.expect(liquidity).to.equal(INITIAL_DEPLOYER_LIQUIDITY);

    // Get reserves of the Uniswap V3 pool
    const baseReserves = await baseTokenContract.balanceOf(
      uniswapV3PoolContract.address
    );
    const assetReserves = await assetTokenContract.balanceOf(
      uniswapV3PoolContract.address
    );

    chai.expect(baseReserves).to.equal(INITIAL_BASE_RESERVES);
    chai.expect(assetReserves).to.equal(INITIAL_ASSET_RESERVES);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test Uniswap V3 LP NFTs
  //////////////////////////////////////////////////////////////////////////////

  it("should approve UniV3 swapper spending USDC", async function () {
    this.timeout(60 * 1000);

    const { uniV3SwapperContract, usdcTokenContract } = contracts;

    const tx: Promise<ethers.ContractTransaction> = usdcTokenContract.approve(
      uniV3SwapperContract.address, // spender
      USDC_PRICE_CHECK_AMOUNT // value
    );

    await chai.expect(tx).to.emit(usdcTokenContract, "Approval").withArgs(
      beneficiaryAddress, // owner
      uniV3SwapperContract.address, // spender
      USDC_PRICE_CHECK_AMOUNT // value
    );
  });

  it("should check initial base token price", async function () {
    this.timeout(60 * 1000);

    const { uniV3SwapperContract } = contracts;

    // TODO: We need a method that doesn't require a prior allowance
    const baseTokenPrice =
      await uniV3SwapperContract.callStatic.buyTokensOneStable(
        1, // stableIndex
        USDC_PRICE_CHECK_AMOUNT // stableAmount
      );

    chai.expect(baseTokenPrice).to.equal(INITIAL_BASE_PRICE);
  });

  it("should approve UniV3 staker spending USDC", async function () {
    this.timeout(60 * 1000);

    const { uniV3StakerContract, usdcTokenContract } = contracts;

    const tx: Promise<ethers.ContractTransaction> = usdcTokenContract.approve(
      uniV3StakerContract.address, // spender
      INITIAL_USDC_BALANCE // value
    );

    await chai.expect(tx).to.emit(usdcTokenContract, "Approval").withArgs(
      beneficiaryAddress, // owner
      uniV3StakerContract.address, // spender
      INITIAL_USDC_BALANCE // value
    );
  });

  it("should stake an LP NFT with USDC", async function () {
    this.timeout(60 * 1000);

    const {
      curveAavePoolerContract,
      curveAaveStakerContract,
      uniswapV3NftManagerContract,
      uniV3PoolerContract,
      uniV3StakerContract,
      uniV3SwapperContract,
    } = contracts;

    // Deposit tokens and stake the NFT
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.stakeNFTWithStables(
        [0, INITIAL_USDC_BALANCE, 0], // stableAmounts
        beneficiaryAddress // recipient
      );

    // Get NFT token ID
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const iface: ethers.utils.Interface = new ethers.utils.Interface(
      uniV3StakerAbi
    );
    const log = receipt.logs.find((log) => {
      try {
        return iface.parseLog(log).name === "NFTStaked";
      } catch (e) {
        return false;
      }
    });
    const logDescription: ethers.utils.LogDescription = iface.parseLog(log);
    nftTokenId = logDescription.args[3].toNumber();
    console.log("    LP NFT token ID:", nftTokenId);

    //
    // Check routing events
    //

    await chai
      .expect(tx)
      .to.emit(curveAavePoolerContract, "LiquidityAdded")
      .withArgs(
        curveAaveStakerContract.address, // sender
        curveAaveStakerContract.address, // recipient
        [0, INITIAL_USDC_BALANCE, 0], // stableAmounts
        CURVE_AAVE_LP_AMOUNT // lpTokenAmount
      );
    await chai
      .expect(tx)
      .to.emit(curveAaveStakerContract, "GaugeStaked")
      .withArgs(
        uniV3PoolerContract.address, // sender
        uniV3PoolerContract.address, // recipient
        [0, INITIAL_USDC_BALANCE, 0], // stableAmounts
        CURVE_AAVE_GAUGE_SHARES // gaugeShares
      );
    await chai
      .expect(tx)
      .to.emit(uniV3SwapperContract, "TokensBought")
      .withArgs(
        uniV3PoolerContract.address, // sender
        uniV3PoolerContract.address, // recipient
        [0, 0, 0], // stableAmounts
        ASSET_TOKENS_SPENT, // assetTokenAmount
        BASE_TOKENS_BOUGHT // baseTokenReturned
      );
    await chai.expect(tx).to.emit(uniV3PoolerContract, "NFTMinted").withArgs(
      uniV3StakerContract.address, // sender
      uniV3StakerContract.address, // recipient
      uniswapV3NftManagerContract.address, // nftAddress
      nftTokenId, // nftTokenId
      [0, INITIAL_USDC_BALANCE, 0], // stableAmounts
      0, // baseTokenAmount
      BASE_TOKEN_SHARE, // baseTokenShare
      ASSET_TOKEN_SHARE, // assetTokenShare
      LIQUIDITY_AMOUNT // liquidityAmount
    );
    await chai.expect(tx).to.emit(uniV3StakerContract, "NFTStaked").withArgs(
      beneficiaryAddress, // sender
      beneficiaryAddress, // recipient
      uniswapV3NftManagerContract.address, // nftAddress
      nftTokenId, // nftTokenId
      [0, INITIAL_USDC_BALANCE, 0], // stableAmounts
      0 // baseTokenAmount
    );
    await chai
      .expect(tx)
      .to.emit(uniV3SwapperContract, "TokensBought")
      .withArgs(
        uniV3PoolerContract.address, // sender
        uniV3PoolerContract.address, // recipient
        [0, 0, 0], // stableAmounts
        ASSET_DUST_SPENT, // assetTokenAmount
        BASE_DUST_BOUGHT // baseTokenReturned
      );
  });

  it("should check resulting base token price", async function () {
    this.timeout(60 * 1000);

    const {
      assetTokenContract,
      baseTokenContract,
      uniswapV3PoolContract,
      uniV3PoolerContract,
      uniV3SwapperContract,
      usdcTokenContract,
    } = contracts;

    // Get base token price
    const baseTokenPrice =
      await uniV3SwapperContract.callStatic.buyTokensOneStable(
        1,
        USDC_PRICE_CHECK_AMOUNT
      );

    chai.expect(baseTokenPrice).to.equal(RESULTING_BASE_PRICE);

    // Get reserves of the Uniswap V3 pool
    const baseReserves = await baseTokenContract.balanceOf(
      uniswapV3PoolContract.address
    );
    const assetReserves = await assetTokenContract.balanceOf(
      uniswapV3PoolContract.address
    );

    chai.expect(baseReserves).to.equal(RESULTING_BASE_RESERVES);
    chai.expect(assetReserves).to.equal(RESULTING_ASSET_RESERVES);

    // Check balances of the staker
    const poolerBaseBalance = await baseTokenContract.balanceOf(
      uniV3PoolerContract.address
    );
    const poolerAssetBalance = await assetTokenContract.balanceOf(
      uniV3PoolerContract.address
    );

    chai.expect(poolerBaseBalance).to.equal(0);
    chai.expect(poolerAssetBalance).to.equal(0);

    // Check balances of the beneficiary
    const usdcTokenBalance = await usdcTokenContract.balanceOf(
      beneficiaryAddress
    );

    chai.expect(usdcTokenBalance).to.equal(USDC_PRICE_CHECK_AMOUNT);
  });

  it("should unstake the LP NFT", async function () {
    this.timeout(60 * 1000);

    const {
      curveAavePoolerContract,
      curveAaveStakerContract,
      uniswapV3NftManagerContract,
      uniV3PoolerContract,
      uniV3StakerContract,
      uniV3SwapperContract,
    } = contracts;

    // Unstake the NFT
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.exitOneStable(
        nftTokenId, // nftTokenId
        1 // stableIndex
      );

    // Get reward amount
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const iface: ethers.utils.Interface = new ethers.utils.Interface(
      uniV3StakerAbi
    );
    const log = receipt.logs.find((log) => {
      try {
        return iface.parseLog(log).name === "NFTUnstaked";
      } catch (e) {
        return false;
      }
    });
    const logDescription: ethers.utils.LogDescription = iface.parseLog(log);
    const rewardClaimed: ethers.BigNumber = logDescription.args[4];

    //
    // Check routing events
    //

    await chai.expect(tx).to.emit(uniV3StakerContract, "NFTUnstaked").withArgs(
      beneficiaryAddress, // sender
      beneficiaryAddress, // recipient
      uniswapV3NftManagerContract.address, // nftAddress
      nftTokenId, // nftTokenId
      rewardClaimed, // rewardClaimed
      1, // stableIndex
      USDC_RETURNED // stablesReturned
    );
    await chai.expect(tx).to.emit(uniV3PoolerContract, "NFTCollected").withArgs(
      uniV3StakerContract.address, // sender
      uniV3StakerContract.address, // recipient
      uniswapV3NftManagerContract.address, // nftAddress
      nftTokenId, // nftTokenId
      LIQUIDITY_AMOUNT, // liquidityAmount
      BASE_TOKENS_COLLECTED, // baseTokensCollected
      ASSET_TOKENS_COLLECTED, // assetTokensCollected
      1, // stableIndex (USDC)
      USDC_RETURNED // stablesReturned
    );
    await chai
      .expect(tx)
      .to.emit(uniV3SwapperContract, "TokensSoldForAsset")
      .withArgs(
        uniV3PoolerContract.address, // sender
        uniV3PoolerContract.address, // recipient
        BASE_TOKENS_COLLECTED, // baseTokenSpent
        ASSET_TOKENS_BOUGHT // assetTokensReturned
      );
    await chai
      .expect(tx)
      .to.emit(curveAaveStakerContract, "GaugeUnstakedOneStable")
      .withArgs(
        uniV3PoolerContract.address, // sender
        uniV3PoolerContract.address, // recipient
        CURVE_AAVE_GAUGE_UNSTAKED, // gaugeShares
        1, // stableIndex (USDC)
        USDC_RETURNED // stablesReturned
      );
    await chai
      .expect(tx)
      .to.emit(curveAavePoolerContract, "LiquidityRemovedOneStable")
      .withArgs(
        curveAaveStakerContract.address, // sender
        curveAaveStakerContract.address, // recipient
        CURVE_AAVE_LP_UNSTAKED, // lpTokenAmount
        1, // stableIndex (USDC)
        USDC_RETURNED // stablesReturned
      );
  });

  it("should check final base token price", async function () {
    this.timeout(60 * 1000);

    const {
      assetTokenContract,
      baseTokenContract,
      uniswapV3PoolContract,
      uniV3SwapperContract,
      usdcTokenContract,
    } = contracts;

    // Get base token price
    const baseTokenPrice =
      await uniV3SwapperContract.callStatic.buyTokensOneStable(
        1,
        USDC_PRICE_CHECK_AMOUNT
      );

    chai.expect(baseTokenPrice).to.equal(FINAL_BASE_PRICE);

    // Get reserves of the Uniswap V3 pool
    const baseReserves = await baseTokenContract.balanceOf(
      uniswapV3PoolContract.address
    );
    const assetReserves = await assetTokenContract.balanceOf(
      uniswapV3PoolContract.address
    );

    chai.expect(baseReserves).to.equal(FINAL_BASE_RESERVES);
    chai.expect(assetReserves).to.equal(FINAL_ASSET_RESERVES);

    // Check token balanceS of the beneficiary
    const baseTokenBalance = await baseTokenContract.balanceOf(
      beneficiaryAddress
    );
    const assetTokenBalance = await assetTokenContract.balanceOf(
      beneficiaryAddress
    );
    const usdcTokenBalance = await usdcTokenContract.balanceOf(
      beneficiaryAddress
    );

    chai.expect(baseTokenBalance).to.equal(BASE_TOKEN_DUST);
    chai.expect(assetTokenBalance).to.equal(ASSET_TOKEN_DUST);
    chai.expect(usdcTokenBalance).to.equal(FINAL_USDC_BALANCE);
  });
});
