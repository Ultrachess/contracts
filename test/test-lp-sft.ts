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

describe("LP SFTs", () => {
  let deployer: SignerWithAddress;
  let beneficiaryAddress: string;
  let contracts: ContractLibrary;
  let nftTokenId1: ethers.BigNumber | undefined; // Set when first LP NFT is minted
  let nftTokenId2: ethers.BigNumber | undefined; // Set when second LP NFT is minted

  //////////////////////////////////////////////////////////////////////////////
  // Test parameters
  //////////////////////////////////////////////////////////////////////////////

  // The ID of the deployer's LP NFT. Uniswap V3 starts minting at ID 1
  const DEPLOYER_NFT_TOKEN_ID = 1;

  // We start with 2 USDC
  const INITIAL_USDC_BALANCE = ethers.utils.parseUnits("2", 6); // 2 USDC

  // Base token dust after minting LP NFTs
  const BASE_TOKEN_DUST = ethers.BigNumber.from("899748346464365"); // About 0.0009 base tokens

  // Balance after unstaking first LP NFT
  const INTERMEDIATE_USDC_BALANCE = ethers.BigNumber.from("1253098"); // About 1.253 USDC

  // We end with about 1.3 cents less (0.67% loss)
  const FINAL_USDC_BALANCE = ethers.BigNumber.from("1986669"); // About 1.987 USDC

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
      INITIAL_USDC_BALANCE
    );
    await (await tx).wait();

    const usdcBalance = await usdcTokenContract.balanceOf(beneficiaryAddress);
    chai.expect(usdcBalance).to.equal(INITIAL_USDC_BALANCE);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test LP SFTs
  //////////////////////////////////////////////////////////////////////////////

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
      lpSftContract,
      uniswapV3NftManagerContract,
      uniswapV3StakerContract,
      uniV3StakerContract,
    } = contracts;

    // Deposit tokens and stake the NFT with half of the USDC
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.stakeNFTWithStables(
        [0, INITIAL_USDC_BALANCE.div(2), 0], // stableAmounts
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
    nftTokenId1 = logDescription.args[3];
    console.log("    LP NFT token ID:", nftTokenId1.toNumber());

    //
    // Check LP NFT path
    //

    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        ethers.constants.AddressZero, // from
        uniV3StakerContract.address, // to
        nftTokenId1 // tokenId
      );
    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniV3StakerContract.address, // from
        uniswapV3StakerContract.address, // to
        nftTokenId1 // tokenId
      );

    //
    // Check LP SFT path
    //

    await chai.expect(tx).to.emit(lpSftContract, "TransferSingle").withArgs(
      uniV3StakerContract.address, // operator
      ethers.constants.AddressZero, // from
      beneficiaryAddress, // to
      nftTokenId1, // id
      1 // value
    );
  });

  it("should check NFT and SFT ownerships after first stake", async function () {
    this.timeout(60 * 1000);

    const {
      lpSftContract,
      uniswapV3NftManagerContract,
      uniswapV3StakerContract,
    } = contracts;

    // Check NFT owners
    const deployerNftOwner = await uniswapV3NftManagerContract.ownerOf(
      DEPLOYER_NFT_TOKEN_ID
    );
    const beneficiaryNft1Owner = await uniswapV3NftManagerContract.ownerOf(
      nftTokenId1
    );

    chai.expect(deployerNftOwner).to.equal(deployer.address);
    chai.expect(beneficiaryNft1Owner).to.equal(uniswapV3StakerContract.address);

    // Check SFT owners
    const deployerSftOwner = await lpSftContract.ownerOf(DEPLOYER_NFT_TOKEN_ID);
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);

    chai.expect(deployerSftOwner).to.equal(ethers.constants.AddressZero);
    chai.expect(beneficiarySft1Owner).to.equal(beneficiaryAddress);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(0);
    chai.expect(beneficiarySftTokenIds.length).to.equal(1);

    chai.expect(deployerSftTokenIds).to.deep.equal([]);
    chai.expect(beneficiarySftTokenIds).to.deep.equal([nftTokenId1]);
  });

  it("should stake second LP NFT with USDC", async function () {
    this.timeout(60 * 1000);

    const {
      lpSftContract,
      uniswapV3NftManagerContract,
      uniswapV3StakerContract,
      uniV3StakerContract,
    } = contracts;

    // Deposit tokens and stake the NFT with half of the USDC
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.stakeNFTWithStables(
        [0, INITIAL_USDC_BALANCE.div(2), 0], // stableAmounts
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
    nftTokenId2 = logDescription.args[3];
    console.log("    LP NFT token ID:", nftTokenId2.toNumber());

    //
    // Check LP NFT path
    //

    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        ethers.constants.AddressZero, // from
        uniV3StakerContract.address, // to
        nftTokenId2 // tokenId
      );
    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniV3StakerContract.address, // from
        uniswapV3StakerContract.address, // to
        nftTokenId2 // tokenId
      );

    //
    // Check LP SFT path
    //

    await chai.expect(tx).to.emit(lpSftContract, "TransferSingle").withArgs(
      uniV3StakerContract.address, // operator
      ethers.constants.AddressZero, // from
      beneficiaryAddress, // to
      nftTokenId2, // id
      1 // value
    );
  });

  it("should check NFT and SFT ownerships after second stake", async function () {
    this.timeout(60 * 1000);

    const {
      lpSftContract,
      uniswapV3NftManagerContract,
      uniswapV3StakerContract,
    } = contracts;

    // Check NFT owners
    const deployerNftOwner = await uniswapV3NftManagerContract.ownerOf(
      DEPLOYER_NFT_TOKEN_ID
    );
    const beneficiaryNft1Owner = await uniswapV3NftManagerContract.ownerOf(
      nftTokenId1
    );
    const beneficiaryNft2Owner = await uniswapV3NftManagerContract.ownerOf(
      nftTokenId2
    );

    chai.expect(deployerNftOwner).to.equal(deployer.address);
    chai.expect(beneficiaryNft1Owner).to.equal(uniswapV3StakerContract.address);
    chai.expect(beneficiaryNft2Owner).to.equal(uniswapV3StakerContract.address);

    // Check SFT owners
    const deployerSftOwner = await lpSftContract.ownerOf(DEPLOYER_NFT_TOKEN_ID);
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);
    const beneficiarySft2Owner = await lpSftContract.ownerOf(nftTokenId2);

    chai.expect(deployerSftOwner).to.equal(ethers.constants.AddressZero);
    chai.expect(beneficiarySft1Owner).to.equal(beneficiaryAddress);
    chai.expect(beneficiarySft2Owner).to.equal(beneficiaryAddress);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(0);
    chai.expect(beneficiarySftTokenIds.length).to.equal(2);

    chai.expect(deployerSftTokenIds).to.deep.equal([]);
    if (beneficiarySftTokenIds[0].eq(nftTokenId1)) {
      chai
        .expect(beneficiarySftTokenIds)
        .to.deep.equal([nftTokenId1, nftTokenId2]);
    } else {
      chai
        .expect(beneficiarySftTokenIds)
        .to.deep.equal([nftTokenId2, nftTokenId1]);
    }
  });

  it("should check base token dust after staking LP NFTs", async function () {
    this.timeout(60 * 1000);

    const { baseTokenContract } = contracts;

    // Check base token dust
    const beneficiaryBaseTokenBalance = await baseTokenContract.balanceOf(
      beneficiaryAddress
    );

    chai.expect(beneficiaryBaseTokenBalance).to.equal(BASE_TOKEN_DUST);
  });

  it("should batch transfer SFTs to deployer", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Batch transfer SFTs to deployer
    const tx: Promise<ethers.ContractTransaction> =
      lpSftContract.safeBatchTransferFrom(
        beneficiaryAddress, // from
        deployer.address, // to
        [nftTokenId1, nftTokenId2], // id
        [1, 1], // value
        [] // data
      );

    // Check path of SFTs
    await chai.expect(tx).to.emit(lpSftContract, "TransferBatch").withArgs(
      beneficiaryAddress, // operator
      beneficiaryAddress, // from
      deployer.address, // to
      [nftTokenId1, nftTokenId2], // ids
      [1, 1] // values
    );
  });

  it("should check SFT ownership after batch transfer", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Check SFT owners
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);
    const beneficiarySft2Owner = await lpSftContract.ownerOf(nftTokenId2);

    chai.expect(beneficiarySft1Owner).to.equal(deployer.address);
    chai.expect(beneficiarySft2Owner).to.equal(deployer.address);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(2);
    chai.expect(beneficiarySftTokenIds.length).to.equal(0);

    if (deployerSftTokenIds[0].eq(nftTokenId1)) {
      chai
        .expect(deployerSftTokenIds)
        .to.deep.equal([nftTokenId1, nftTokenId2]);
    } else {
      chai
        .expect(deployerSftTokenIds)
        .to.deep.equal([nftTokenId2, nftTokenId1]);
    }
    chai.expect(beneficiarySftTokenIds).to.deep.equal([]);
  });

  it("should fail to unstake first LP NFT", async function () {
    this.timeout(60 * 1000);

    const { uniV3StakerContract } = contracts;

    // Try to unstake the NFT
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.exitOneStable(
        nftTokenId1, // nftTokenId
        1 // stableIndex
      );

    chai.expect(tx).to.be.revertedWith("Must own voucher");
  });

  it("should return SFT 1 back to beneficiary", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Transfer SFT 1 to beneficiary
    const tx1: Promise<ethers.ContractTransaction> = lpSftContract
      .connect(deployer)
      .safeTransferFrom(
        deployer.address, // from
        beneficiaryAddress, // to
        nftTokenId1, // id
        1, // value
        [] // data
      );

    // Check SFT path
    await chai.expect(tx1).to.emit(lpSftContract, "TransferSingle").withArgs(
      deployer.address, // operator
      deployer.address, // from
      beneficiaryAddress, // to
      nftTokenId1, // id
      1 // value
    );
  });

  it("should check SFT ownership after first return", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Check SFT owners
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);
    const beneficiarySft2Owner = await lpSftContract.ownerOf(nftTokenId2);

    chai.expect(beneficiarySft1Owner).to.equal(beneficiaryAddress);
    chai.expect(beneficiarySft2Owner).to.equal(deployer.address);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(1);
    chai.expect(beneficiarySftTokenIds.length).to.equal(1);

    chai.expect(deployerSftTokenIds).to.deep.equal([nftTokenId2]);
    chai.expect(beneficiarySftTokenIds).to.deep.equal([nftTokenId1]);
  });

  it("should return SFT 2 back to beneficiary", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Transfer SFT 2 to beneficiary
    const tx2: Promise<ethers.ContractTransaction> = lpSftContract
      .connect(deployer)
      .safeTransferFrom(
        deployer.address, // from
        beneficiaryAddress, // to
        nftTokenId2, // id
        1, // value
        [] // data
      );

    // Check SFT path
    await chai.expect(tx2).to.emit(lpSftContract, "TransferSingle").withArgs(
      deployer.address, // operator
      deployer.address, // from
      beneficiaryAddress, // to
      nftTokenId2, // id
      1 // value
    );
  });

  it("should check NFT and SFT ownerships after second return", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Check SFT owners
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);
    const beneficiarySft2Owner = await lpSftContract.ownerOf(nftTokenId2);

    chai.expect(beneficiarySft1Owner).to.equal(beneficiaryAddress);
    chai.expect(beneficiarySft2Owner).to.equal(beneficiaryAddress);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(0);
    chai.expect(beneficiarySftTokenIds.length).to.equal(2);

    chai.expect(deployerSftTokenIds).to.deep.equal([]);
    if (beneficiarySftTokenIds[0].eq(nftTokenId1)) {
      chai
        .expect(beneficiarySftTokenIds)
        .to.deep.equal([nftTokenId1, nftTokenId2]);
    } else {
      chai
        .expect(beneficiarySftTokenIds)
        .to.deep.equal([nftTokenId2, nftTokenId1]);
    }
  });

  it("should unstake the fist LP NFT", async function () {
    this.timeout(60 * 1000);

    const {
      lpSftContract,
      uniswapV3NftManagerContract,
      uniswapV3StakerContract,
      uniV3PoolerContract,
      uniV3StakerContract,
    } = contracts;

    // Unstake the NFT
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.exitOneStable(
        nftTokenId1, // nftTokenId
        1 // stableIndex
      );

    //
    // Check LP SFT path
    //

    await chai.expect(tx).to.emit(lpSftContract, "TransferSingle").withArgs(
      uniV3StakerContract.address, // operator
      beneficiaryAddress, // from
      ethers.constants.AddressZero, // to
      nftTokenId1, // tokenId
      1 // value
    );

    //
    // Check LP NFT path
    //

    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniswapV3StakerContract.address, // from
        uniV3PoolerContract.address, // to
        nftTokenId1 // tokenId
      );
    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniV3PoolerContract.address, // from
        uniV3StakerContract.address, // to
        nftTokenId1 // tokenId
      );
    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniV3StakerContract.address, // from
        beneficiaryAddress, // to
        nftTokenId1 // tokenId
      );
  });

  it("should check SFT ownership after first unstake", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Check SFT owners
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);
    const beneficiarySft2Owner = await lpSftContract.ownerOf(nftTokenId2);

    chai.expect(beneficiarySft1Owner).to.equal(ethers.constants.AddressZero);
    chai.expect(beneficiarySft2Owner).to.equal(beneficiaryAddress);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(0);
    chai.expect(beneficiarySftTokenIds.length).to.equal(1);

    chai.expect(deployerSftTokenIds).to.deep.equal([]);
    chai.expect(beneficiarySftTokenIds).to.deep.equal([nftTokenId2]);
  });

  it("should check USDC balance after unstaking first LP NFT", async function () {
    this.timeout(60 * 1000);

    const { usdcTokenContract } = contracts;

    const usdcBalance = await usdcTokenContract.balanceOf(beneficiaryAddress);
    chai.expect(usdcBalance).to.equal(INTERMEDIATE_USDC_BALANCE);
  });

  it("should unstake the second LP NFT", async function () {
    this.timeout(60 * 1000);

    const {
      lpSftContract,
      uniswapV3NftManagerContract,
      uniswapV3StakerContract,
      uniV3PoolerContract,
      uniV3StakerContract,
    } = contracts;

    // Unstake the NFT
    const tx: Promise<ethers.ContractTransaction> =
      uniV3StakerContract.exitOneStable(
        nftTokenId2, // nftTokenId
        1 // stableIndex
      );

    //
    // Check LP SFT path
    //

    await chai.expect(tx).to.emit(lpSftContract, "TransferSingle").withArgs(
      uniV3StakerContract.address, // operator
      beneficiaryAddress, // from
      ethers.constants.AddressZero, // to
      nftTokenId2, // tokenId
      1 // value
    );

    //
    // Check LP NFT path
    //

    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniswapV3StakerContract.address, // from
        uniV3PoolerContract.address, // to
        nftTokenId2 // tokenId
      );
    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniV3PoolerContract.address, // from
        uniV3StakerContract.address, // to
        nftTokenId2 // tokenId
      );
    await chai
      .expect(tx)
      .to.emit(uniswapV3NftManagerContract, "Transfer")
      .withArgs(
        uniV3StakerContract.address, // from
        beneficiaryAddress, // to
        nftTokenId2 // tokenId
      );
  });

  it("should check SFT ownership after second unstake", async function () {
    this.timeout(60 * 1000);

    const { lpSftContract } = contracts;

    // Check SFT owners
    const beneficiarySft1Owner = await lpSftContract.ownerOf(nftTokenId1);
    const beneficiarySft2Owner = await lpSftContract.ownerOf(nftTokenId2);

    chai.expect(beneficiarySft1Owner).to.equal(ethers.constants.AddressZero);
    chai.expect(beneficiarySft2Owner).to.equal(ethers.constants.AddressZero);

    // Check SFT token IDs
    const deployerSftTokenIds = await lpSftContract.getTokenIds(
      deployer.address
    );
    const beneficiarySftTokenIds = await lpSftContract.getTokenIds(
      beneficiaryAddress
    );

    chai.expect(deployerSftTokenIds.length).to.equal(0);
    chai.expect(beneficiarySftTokenIds.length).to.equal(0);

    chai.expect(deployerSftTokenIds).to.deep.equal([]);
    chai.expect(beneficiarySftTokenIds).to.deep.equal([]);
  });

  it("should make sure we got our money back!!!", async function () {
    this.timeout(60 * 1000);

    const { usdcTokenContract } = contracts;

    const usdcBalance = await usdcTokenContract.balanceOf(beneficiaryAddress);
    chai.expect(usdcBalance).to.equal(FINAL_USDC_BALANCE);
  });
});
