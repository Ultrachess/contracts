/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint no-empty: "off" */

import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployOptions } from "hardhat-deploy/types";

import { getAddressBook, writeAddress } from "../src/addressBook";
import {
  CRV_CONTROLLER_CONTRACT,
  CRV_MINTER_CONTRACT,
  CRV_TOKEN_CONTRACT,
  CRV_VOTING_CONTRACT,
  CURVE_AAVE_GAUGE_CONTRACT,
  CURVE_AAVE_LP_TOKEN_CONTRACT,
  CURVE_AAVE_POOL_CONTRACT,
  curveTokenV3Artifact,
  erc20CrvArtifact,
  gaugeControllerArtifact,
  liquidityGaugeArtifact,
  minterArtifact,
  stableSwapAaveArtifact,
  votingEscrowArtifact,
} from "../src/contracts/depends";
import {
  DAI_TOKEN_CONTRACT,
  USDC_TOKEN_CONTRACT,
  USDT_TOKEN_CONTRACT,
} from "../src/contracts/testing";
import { AddressBook } from "../src/interfaces";

//
// Deploy the Curve and Curve DAO environments
//

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;

  const { deploy, execute, read } = deployments;
  const { deployer } = await getNamedAccounts();

  const opts: DeployOptions = {
    deterministicDeployment: true,
    from: deployer,
    log: true,
  };

  // Get the network name
  const networkName = hardhat_re.network.name;

  // Get the contract addresses
  const addressBook: AddressBook = await getAddressBook(networkName);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Aave LP token contract
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy the Curve Aave LP token contract
  if (addressBook.curveAaveLpToken && networkName != "hardhat") {
    console.log(
      `Using deployed ${CURVE_AAVE_LP_TOKEN_CONTRACT} at ${addressBook.curveAaveLpToken}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_LP_TOKEN_CONTRACT}`);
    const tx = await deploy(CURVE_AAVE_LP_TOKEN_CONTRACT, {
      ...opts,
      contract: curveTokenV3Artifact,
      args: [
        "Funny Curve.fi amDAI/amUSDC/amUSDT", // name
        "am3CRV", // symbol
        deployer, // minter (will be transfered to Curve Aave pool in setup)
        deployer, // initial token holder
      ],
    });
    addressBook.curveAaveLpToken = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Aave pool contract
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy the Curve Aave pool contract
  if (addressBook.curveAavePool && networkName != "hardhat") {
    console.log(
      `Using deployed ${CURVE_AAVE_POOL_CONTRACT} at ${addressBook.curveAavePool}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_POOL_CONTRACT}`);
    const tx = await deploy(CURVE_AAVE_POOL_CONTRACT, {
      ...opts,
      contract: stableSwapAaveArtifact,
      args: [
        [
          addressBook.adaiTokenProxy,
          addressBook.ausdcTokenProxy,
          addressBook.ausdtTokenProxy,
        ], // coins
        [addressBook.daiToken, addressBook.usdcToken, addressBook.usdtToken], // underlying coins
        addressBook.curveAaveLpToken, // pool token
        addressBook.aavePool, // Aave lending pool
        ethers.BigNumber.from("2000"), // A
        ethers.BigNumber.from("3000000"), // fee
        ethers.BigNumber.from("5000000000"), // admin fee
        ethers.BigNumber.from("20000000000"), // offpeg fee multiplier
      ],
    });
    addressBook.curveAavePool = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve DAO contracts
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy CRV token
  if (addressBook.crvToken) {
    console.log(
      `Using deployed ${CRV_TOKEN_CONTRACT} at ${addressBook.crvToken}`
    );
  } else {
    console.log(`Deploying ${CRV_TOKEN_CONTRACT}`);
    const tx = await deploy(CRV_TOKEN_CONTRACT, {
      ...opts,
      contract: erc20CrvArtifact,
      args: [
        "Curve DAO Token", // name
        "CRV", // symbol
        18, // decimals
        deployer, // admin
        deployer, // initial holder
      ],
    });
    addressBook.crvToken = tx.address;
  }

  // Deploy CRV voting
  if (addressBook.crvVoting) {
    console.log(
      `Using deployed ${CRV_VOTING_CONTRACT} at ${addressBook.crvVoting}`
    );
  } else {
    console.log(`Deploying ${CRV_VOTING_CONTRACT}`);
    const tx = await deploy(CRV_VOTING_CONTRACT, {
      ...opts,
      contract: votingEscrowArtifact,
      args: [
        addressBook.crvToken, // token
        "Vote-escrowed CRV", // name
        "veCRV", // symbol
        "veCRV_1.0.0", // version
        deployer, // admin
        deployer, // controller
      ],
    });
    addressBook.crvVoting = tx.address;
  }

  // Deploy CRV controller
  if (addressBook.crvController) {
    console.log(
      `Using deployed ${CRV_CONTROLLER_CONTRACT} at ${addressBook.crvController}`
    );
  } else {
    console.log(`Deploying ${CRV_CONTROLLER_CONTRACT}`);
    const tx = await deploy(CRV_CONTROLLER_CONTRACT, {
      ...opts,
      contract: gaugeControllerArtifact,
      args: [
        addressBook.crvToken, // token
        addressBook.crvVoting, // voting escrow
        deployer, // admin
      ],
    });
    addressBook.crvController = tx.address;
  }

  // Deploy CRV minter
  if (addressBook.crvMinter) {
    console.log(
      `Using deployed ${CRV_MINTER_CONTRACT} at ${addressBook.crvMinter}`
    );
  } else {
    console.log(`Deploying ${CRV_MINTER_CONTRACT}`);
    const tx = await deploy(CRV_MINTER_CONTRACT, {
      ...opts,
      contract: minterArtifact,
      args: [
        addressBook.crvToken, // token
        addressBook.crvController, // controller
      ],
    });
    addressBook.crvMinter = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Aave gauge
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy the Curve Aave gauge contract
  if (addressBook.curveAaveGauge && networkName != "hardhat") {
    console.log(
      `Using deployed ${CURVE_AAVE_GAUGE_CONTRACT} at ${addressBook.curveAaveGauge}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_GAUGE_CONTRACT}`);
    const tx = await deploy(CURVE_AAVE_GAUGE_CONTRACT, {
      ...opts,
      contract: liquidityGaugeArtifact,
      args: [
        addressBook.curveAaveLpToken, // LP address
        addressBook.crvMinter, // minter
        deployer, // admin
      ],
    });
    addressBook.curveAaveGauge = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Set Curve Aave pool token minter
  //
  //////////////////////////////////////////////////////////////////////////////

  await execute(
    CURVE_AAVE_LP_TOKEN_CONTRACT,
    { from: deployer, log: true },
    "set_minter",
    addressBook.curveAavePool
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Setup calls for Curve DAO
  //
  //////////////////////////////////////////////////////////////////////////////

  console.log("Curve DAO setup calls");

  //
  // Set the CRV token minter
  //

  await execute(
    CRV_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "set_minter",
    addressBook.crvMinter
  );

  //
  // Add the gauge type (i.e. "Liquidity" on mainnet, "Liquidity (Fantom)" on fantom)
  //

  await execute(
    CRV_CONTROLLER_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "add_type(string,uint256)",
    "Liquidity", // name
    0 // weight (TODO)
  );

  //
  // TODO: Add the Aave pool gauge
  //

  await execute(
    CRV_CONTROLLER_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "add_gauge(address,int128,uint256)",
    addressBook.curveAaveGauge, // address
    0, // gauge type,
    0 // weight (TODO)
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Seed the stablecoins with some funds
  //
  //////////////////////////////////////////////////////////////////////////////

  // Initial stablecoin amounts for Curve Aave MATIC pool. Values retrieved
  // from https://curve.fi/#/polygon/pools/aave/deposit on 2022-12-10.
  const INITIAL_DAI = ethers.utils.parseUnits("7396589", 18); // 7,396,589 DAI
  const INITIAL_USDC = ethers.utils.parseUnits("8791920", 6); // 8,791,920 USDC
  const INITIAL_USDT = ethers.utils.parseUnits("9418946", 6); // 9,418,946 USDT
  const INITIAL_CURVE_AAVE_LP_TOKENS = ethers.BigNumber.from(
    "25607389499110288943806496"
  ); // About 25,607,389 LP tokens

  //
  // Mint DAI
  //

  console.log("Minting DAI");

  const daiBalance = await read(
    DAI_TOKEN_CONTRACT,
    { from: deployer },
    "balanceOf",
    deployer
  );
  if (daiBalance.lt(INITIAL_DAI)) {
    await execute(
      DAI_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "mint",
      deployer,
      INITIAL_DAI.sub(daiBalance)
    );
  }

  //
  // Mint USDC
  //

  console.log("Minting USDC");

  const usdcBalance = await read(
    USDC_TOKEN_CONTRACT,
    { from: deployer },
    "balanceOf",
    deployer
  );
  if (usdcBalance.lt(INITIAL_USDC)) {
    await execute(
      USDC_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "mint",
      deployer,
      INITIAL_USDC.sub(usdcBalance)
    );
  }

  //
  // Mint USDT
  //

  console.log("Minting USDT");

  const usdtBalance = await read(
    USDT_TOKEN_CONTRACT,
    { from: deployer },
    "balanceOf",
    deployer
  );
  if (usdtBalance.lt(INITIAL_USDT)) {
    await execute(
      USDT_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "mint",
      deployer,
      INITIAL_USDT.sub(usdtBalance)
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Approve Curve Aave pool spending stablecoins
  //
  //////////////////////////////////////////////////////////////////////////////

  //
  // Approve DAI
  //

  console.log("Approving DAI transfer");

  await execute(
    DAI_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "approve",
    addressBook.curveAavePool,
    INITIAL_DAI
  );

  //
  // Approve USDC
  //

  console.log("Approving USDC transfer");

  await execute(
    USDC_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "approve",
    addressBook.curveAavePool,
    INITIAL_USDC
  );

  //
  // Appove USDT
  //

  console.log("Approving USDT transfer");

  await execute(
    USDT_TOKEN_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "approve",
    addressBook.curveAavePool,
    INITIAL_USDT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Seed the Curve Aave pool with some funds
  //
  //////////////////////////////////////////////////////////////////////////////

  console.log("Adding funds to Curve Aave pool");

  await execute(
    CURVE_AAVE_POOL_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "add_liquidity(uint256[3],uint256,bool)",
    [INITIAL_DAI, INITIAL_USDC, INITIAL_USDT], // amounts
    0, // min mint amount
    true // use underlying?
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Stake the Curve Aave pool funds with the Curve Gauge
  //
  //////////////////////////////////////////////////////////////////////////////

  //
  // First check token balance and allowance
  //

  const curveAaveLpBalance = await read(
    CURVE_AAVE_LP_TOKEN_CONTRACT,
    { from: deployer },
    "balanceOf",
    deployer
  );

  if (!curveAaveLpBalance.eq(INITIAL_CURVE_AAVE_LP_TOKENS)) {
    console.error("!!! Unexpected Curve Aave LP token balance");
    console.error("!!! Expected: ", INITIAL_CURVE_AAVE_LP_TOKENS.toString());
    console.error("!!! Actual: ", curveAaveLpBalance.toString());
  }

  const curveAaveLpAllowance = await read(
    CURVE_AAVE_LP_TOKEN_CONTRACT,
    { from: deployer },
    "allowance",
    deployer,
    addressBook.curveAaveGauge
  );

  //
  // Approve Curve gauge spending LP tokens
  //

  if (curveAaveLpAllowance.lt(curveAaveLpBalance)) {
    console.log("Approving am3Crv spending by Curve gauge");

    await execute(
      CURVE_AAVE_LP_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "approve",
      addressBook.curveAaveGauge,
      curveAaveLpBalance.sub(curveAaveLpAllowance)
    );
  }

  //
  // Stake LP tokens with the Curve gauge
  //

  console.log("Staking funds in Curve gauge");

  await execute(
    CURVE_AAVE_GAUGE_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "deposit(uint256)",
    curveAaveLpBalance
  );

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  writeAddress(
    networkName,
    CURVE_AAVE_LP_TOKEN_CONTRACT,
    addressBook.curveAaveLpToken
  );
  writeAddress(
    networkName,
    CURVE_AAVE_POOL_CONTRACT,
    addressBook.curveAavePool
  );
  writeAddress(
    networkName,
    CURVE_AAVE_GAUGE_CONTRACT,
    addressBook.curveAaveGauge
  );
};

module.exports = func;
module.exports.tags = ["Curve"];
