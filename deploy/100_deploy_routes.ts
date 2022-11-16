/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint no-empty: "off" */

import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployOptions } from "hardhat-deploy/types";

import { getAddressBook, writeAddress } from "../src/addressBook";
import { FEE_AMOUNT } from "../src/constants";
import {
  ASSET_TOKEN_CONTRACT,
  BASE_TOKEN_CONTRACT,
  CURVE_AAVE_POOLER_CONTRACT,
  CURVE_AAVE_STAKER_CONTRACT,
  curveAaveStakerAbi,
  LP_SFT_CONTRACT,
  UNI_V3_POOL_FACTORY_CONTRACT,
  UNI_V3_POOLER_CONTRACT,
  UNI_V3_STAKER_CONTRACT,
  UNI_V3_SWAPPER_CONTRACT,
} from "../src/contracts/dapp";
import { erc20Abi, uniswapV3PoolAbi } from "../src/contracts/depends";
import { AddressBook } from "../src/interfaces";
import { encodePriceSqrt } from "../src/utils/fixedMath";

//
// Dapp parameters
//
// TODO: Relocate me
//

// Initial reward for the LP NFT staking incentive
const REWARD_AMOUNT = ethers.utils.parseUnits("1000", 18); // 1,000 base tokens

//
// Dapp deployment
//

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;
  const { deployer } = await getNamedAccounts();

  const [deployerSigner] = await ethers.getSigners();

  const opts: DeployOptions = {
    deterministicDeployment: true,
    from: deployer,
    log: true,
  };

  // Get the network name
  const networkName = hardhat_re.network.name;

  // Load the contract addresses
  const addressBook: AddressBook = await getAddressBook(networkName);

  //////////////////////////////////////////////////////////////////////////////
  // Deploy contracts
  //////////////////////////////////////////////////////////////////////////////

  // Deploy base token
  if (addressBook.baseToken) {
    console.log(`Using ${BASE_TOKEN_CONTRACT} at ${addressBook.baseToken}`);
  } else {
    console.log(`Deploying ${BASE_TOKEN_CONTRACT}`);
    const tx = await deployments.deploy(BASE_TOKEN_CONTRACT, {
      ...opts,
      args: [
        deployer, // owner
      ],
    });
    addressBook.baseToken = tx.address;
  }

  // Deploy asset token
  if (addressBook.assetToken) {
    console.log(`Using ${ASSET_TOKEN_CONTRACT} at ${addressBook.assetToken}`);
  } else {
    console.log(`Deploying ${ASSET_TOKEN_CONTRACT}`);
    const tx = await deployments.deploy(ASSET_TOKEN_CONTRACT, {
      ...opts,
      args: [
        deployer, // owner
      ],
    });
    addressBook.assetToken = tx.address;
  }

  // Deploy LP SFT contract
  if (addressBook.lpSft) {
    console.log(`Using ${LP_SFT_CONTRACT} at ${addressBook.lpSft}`);
  } else {
    console.log(`Deploying ${LP_SFT_CONTRACT}`);
    const tx = await deployments.deploy(LP_SFT_CONTRACT, {
      ...opts,
      args: [
        deployer, // owner
        addressBook.uniswapV3NftManager, // uniswapV3NftManager
      ],
    });
    addressBook.lpSft = tx.address;
  }

  // Deploy CurveAavePooler
  if (addressBook.curveAavePooler) {
    console.log(
      `Using ${CURVE_AAVE_POOLER_CONTRACT} at ${addressBook.curveAavePooler}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_POOLER_CONTRACT}`);
    const tx = await deployments.deploy(CURVE_AAVE_POOLER_CONTRACT, {
      ...opts,
      args: [
        addressBook.curveAavePool, // curveAavePool
      ],
    });
    addressBook.curveAavePooler = tx.address;
  }

  // Deploy CurveAaveStaker
  if (addressBook.curveAaveStaker) {
    console.log(
      `Using ${CURVE_AAVE_STAKER_CONTRACT} at ${addressBook.curveAaveStaker}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_STAKER_CONTRACT}`);
    const tx = await deployments.deploy(CURVE_AAVE_STAKER_CONTRACT, {
      ...opts,
      args: [
        addressBook.curveAavePooler, // curveAavePooler
        addressBook.curveAaveGauge, // curveAaveGauge
        addressBook.assetToken, // assetToken
      ],
    });
    addressBook.curveAaveStaker = tx.address;
  }

  // Deploy Uniswap V3 pool factory
  if (addressBook.uniV3PoolFactory) {
    console.log(
      `Using ${UNI_V3_POOL_FACTORY_CONTRACT} at ${addressBook.uniV3PoolFactory}`
    );
  } else {
    console.log(`Deploying ${UNI_V3_POOL_FACTORY_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_POOL_FACTORY_CONTRACT, {
      ...opts,
      args: [
        addressBook.uniswapV3Factory, // factory
        addressBook.baseToken, // baseToken
        addressBook.assetToken, // assetToken
        FEE_AMOUNT.HIGH, // swapFee
      ],
    });
    addressBook.uniV3PoolFactory = tx.address;
  }

  // Read Uniswap V3 pool address
  const uniswapV3PoolAddress = await deployments.read(
    UNI_V3_POOL_FACTORY_CONTRACT,
    "uniswapV3Pool"
  );

  // Deploy UniV3Swapper
  if (addressBook.uniV3Swapper) {
    console.log(
      `Using ${UNI_V3_SWAPPER_CONTRACT} at ${addressBook.uniV3Swapper}`
    );
  } else {
    console.log(`Deploying ${UNI_V3_SWAPPER_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_SWAPPER_CONTRACT, {
      ...opts,
      args: [
        addressBook.curveAaveStaker, // curveAaveStaker
        uniswapV3PoolAddress, // uniswapV3Pool
        addressBook.baseToken, // baseToken
      ],
    });
    addressBook.uniV3Swapper = tx.address;
  }

  // Deploy UniV3Pooler
  if (addressBook.uniV3Pooler) {
    console.log(
      `Using ${UNI_V3_POOLER_CONTRACT} at ${addressBook.uniV3Pooler}`
    );
  } else {
    console.log(`Deploying ${UNI_V3_POOLER_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_POOLER_CONTRACT, {
      ...opts,
      args: [
        addressBook.uniV3Swapper, // uniV3Swapper
        addressBook.uniswapV3NftManager, // uniswapV3NftManager
      ],
    });
    addressBook.uniV3Pooler = tx.address;
  }

  // Deploy UniV3Staker
  if (addressBook.uniV3Staker) {
    console.log(
      `Using ${UNI_V3_STAKER_CONTRACT} at ${addressBook.uniV3Staker}`
    );
  } else {
    console.log(`Deploying ${UNI_V3_STAKER_CONTRACT}`);
    const tx = await deployments.deploy(UNI_V3_STAKER_CONTRACT, {
      ...opts,
      args: [
        deployer, // owner
        addressBook.uniV3Pooler, // uniV3Pooler
        addressBook.uniswapV3Staker, // uniswapV3Staker
        addressBook.lpSft, // lpSft
      ],
    });
    addressBook.uniV3Staker = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Setup contracts
  //////////////////////////////////////////////////////////////////////////////

  // Grant role of issuer to the Curve Aave staker
  const ASSET_ISSUER_ROLE = await deployments.read(
    ASSET_TOKEN_CONTRACT,
    "ISSUER_ROLE"
  );
  if (
    !(await deployments.read(
      ASSET_TOKEN_CONTRACT,
      "hasRole",
      ASSET_ISSUER_ROLE,
      addressBook.curveAaveStaker
    ))
  ) {
    console.log(
      `Granting issuer of ${ASSET_TOKEN_CONTRACT} to ${CURVE_AAVE_STAKER_CONTRACT}`
    );
    await deployments.execute(
      ASSET_TOKEN_CONTRACT,
      opts,
      "grantRole",
      ASSET_ISSUER_ROLE,
      addressBook.curveAaveStaker
    );
  } else {
    console.log(
      `Issuer of ${ASSET_TOKEN_CONTRACT} already granted to ${CURVE_AAVE_STAKER_CONTRACT}`
    );
  }

  // Grant role of issuer to the Uniswap V3 staker
  const LP_SFT_ISSUER_ROLE = await deployments.read(
    LP_SFT_CONTRACT,
    "ISSUER_ROLE"
  );
  if (
    !(await deployments.read(
      LP_SFT_CONTRACT,
      "hasRole",
      LP_SFT_ISSUER_ROLE,
      addressBook.uniV3Staker
    ))
  ) {
    console.log(
      `Granting issuer of ${LP_SFT_CONTRACT} to ${UNI_V3_STAKER_CONTRACT}`
    );
    await deployments.execute(
      LP_SFT_CONTRACT,
      opts,
      "grantRole",
      LP_SFT_ISSUER_ROLE,
      addressBook.uniV3Staker
    );
  } else {
    console.log(
      `Issuer of ${LP_SFT_CONTRACT} already granted to ${UNI_V3_STAKER_CONTRACT}`
    );
  }

  // Approve UniV3 staker spending USDC
  console.log(`Approving ${UNI_V3_STAKER_CONTRACT} to spend base token`);
  await deployments.execute(
    BASE_TOKEN_CONTRACT,
    opts,
    "approve",
    addressBook.uniV3Staker,
    REWARD_AMOUNT
  );

  // Set up the Uniswap V3 staker
  console.log(`Setting up ${UNI_V3_STAKER_CONTRACT}`);
  await deployments.execute(
    UNI_V3_STAKER_CONTRACT,
    opts,
    "createIncentive",
    REWARD_AMOUNT
  );

  //////////////////////////////////////////////////////////////////////////////
  // Initialize the Uniswap V3 pool
  //////////////////////////////////////////////////////////////////////////////

  const USDC_AMOUNT = ethers.utils.parseUnits("1", 6); // 1 USDC
  const BASE_TOKEN_AMOUNT = ethers.utils.parseUnits("1", 18); // 1 base token
  const CURVE_AAVE_FEE_BIPS = 3; // Curve Aave pool fee is 0.03% (3 bips)

  //
  // Construct the contracts
  //

  const curveAaveStakerContract = new ethers.Contract(
    addressBook.curveAaveStaker,
    curveAaveStakerAbi,
    deployerSigner
  );
  const uniswapV3PoolContract = new ethers.Contract(
    uniswapV3PoolAddress,
    uniswapV3PoolAbi,
    deployerSigner
  );
  const usdcTokenContract = new ethers.Contract(
    addressBook.usdcToken,
    erc20Abi,
    deployerSigner
  );

  //
  // Allow Curve Aave staker to spend USDC if needed
  //

  const allowance = await usdcTokenContract.allowance(
    deployer,
    addressBook.curveAaveStaker
  );

  if (allowance.lt(USDC_AMOUNT)) {
    console.log(`Approving ${CURVE_AAVE_STAKER_CONTRACT} to spend USDC`);

    const approveTx: ethers.ContractTransaction =
      await usdcTokenContract.approve(
        addressBook.curveAaveStaker,
        USDC_AMOUNT.sub(allowance)
      );

    await approveTx.wait();
  }

  //
  // Get price of ultra3CRV in USDC
  //

  const gaugeTokenAmount =
    await curveAaveStakerContract.callStatic.stakeOneStable(1, USDC_AMOUNT);

  const poolFee = gaugeTokenAmount.mul(CURVE_AAVE_FEE_BIPS).div(10_000);

  const ultra3CRVPrice = gaugeTokenAmount.add(poolFee);

  //
  // Get pool token order
  //

  const baseIsToken0 = await deployments.read(
    UNI_V3_POOLER_CONTRACT,
    "baseIsToken0"
  );

  //
  // Initialize the Uniswap V3 pool
  //

  console.log(
    `Initializing Uniswap V3 pool with ultra3CRV price ${ultra3CRVPrice}`
  );

  const initTx: ethers.ContractTransaction =
    await uniswapV3PoolContract.initialize(
      // The initial sqrt price [sqrt(amountToken1/amountToken0)] as a Q64.96 value
      encodePriceSqrt(
        baseIsToken0 ? ultra3CRVPrice : BASE_TOKEN_AMOUNT,
        baseIsToken0 ? BASE_TOKEN_AMOUNT : ultra3CRVPrice
      )
    );

  await initTx.wait();

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  writeAddress(networkName, "UniswapV3Pool", uniswapV3PoolAddress);
};

export default func;
func.tags = ["TokenRoutes"];
