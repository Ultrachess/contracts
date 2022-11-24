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

import fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployOptions } from "hardhat-deploy/types";

// Artifacts for Vyper contracts
import CurveTokenV3Artifact from "../contracts/bytecode/curve/CurveTokenV3.json";
import StableSwapAaveArtifact from "../contracts/bytecode/curve/StableSwapAave.json";
import Erc20CrvArtifact from "../contracts/bytecode/curve-dao/ERC20CRV.json";
import GaugeControllerArtifact from "../contracts/bytecode/curve-dao/GaugeController.json";
import LiquidityGaugeArtifact from "../contracts/bytecode/curve-dao/LiquidityGauge.json";
import MinterArtifact from "../contracts/bytecode/curve-dao/Minter.json";
import VotingEscrowArtifact from "../contracts/bytecode/curve-dao/VotingEscrow.json";

// TODO: Fully qualified contract names
const AAVE_POOL_CONTRACT = "LendingPool";
const DAI_TOKEN_CONTRACT = "DAI";
const USDC_TOKEN_CONTRACT = "USDC";
const USDT_TOKEN_CONTRACT = "USDT";

// Deployed contract aliases
const ADAI_TOKEN_PROXY_CONTRACT = "ADAIProxy";
const AUSDC_TOKEN_PROXY_CONTRACT = "AUSDCProxy";
const AUSDT_TOKEN_PROXY_CONTRACT = "AUSDTProxy";
const CRV_CONTROLLER_CONTRACT = "CRVController";
const CRV_MINTER_CONTRACT = "CRVMinter";
const CRV_TOKEN_CONTRACT = "CRV";
const CRV_VOTING_CONTRACT = "CRVVoting";
const CURVE_AAVE_GAUGE_CONTRACT = "CurveAaveGauge";
const CURVE_AAVE_LP_TOKEN_CONTRACT = "CurveAaveLP";
const CURVE_AAVE_POOL_CONTRACT = "CurveAavePool";

//
// Address book
//

interface AddressBook {
  curveAaveLpTokenAddress: string;
  curveAavePoolAddress: string;
  crvTokenAddress: string;
  crvVotingAddress: string;
  crvControllerAddress: string;
  crvMinter: string;
  curveAaveGauge: string;
}
let addressBook: AddressBook | undefined;

//
// Utility functions
//
// TODO: Move to utils
//

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

const getContractAddress = async (
  contractSymbol: string,
  contractName: string,
  network: string
): Promise<string | undefined> => {
  // Look up address in address book
  if (addressBook && addressBook[contractSymbol])
    return addressBook[contractSymbol];

  // Look up address if the contract has a known deployment
  const deploymentAddress = loadDeployment(network, contractName);
  if (deploymentAddress) return deploymentAddress;

  return; // undefined
};

function writeAddress(
  network: string,
  contract: string,
  address: string
): void {
  console.log(`Deployed ${contract} to ${address}`);
  const addressFile = `${__dirname}/../deployments/${network}/${contract}.json`;
  fs.writeFileSync(addressFile, JSON.stringify({ address }, undefined, 2));
}

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
  const network = hardhat_re.network.name;

  // Get the contract addresses
  loadAddresses(network);

  // Aave addresses
  const adaiTokenProxyAddress = await getContractAddress(
    "adaiTokenProxy",
    ADAI_TOKEN_PROXY_CONTRACT,
    network
  );
  const ausdcTokenProxyAddress = await getContractAddress(
    "ausdcTokenProxy",
    AUSDC_TOKEN_PROXY_CONTRACT,
    network
  );
  const ausdtTokenProxyAddress = await getContractAddress(
    "ausdtTokenProxy",
    AUSDT_TOKEN_PROXY_CONTRACT,
    network
  );
  const daiTokenAddress = await getContractAddress(
    "daiToken",
    DAI_TOKEN_CONTRACT,
    network
  );
  const usdcTokenAddress = await getContractAddress(
    "usdcToken",
    USDC_TOKEN_CONTRACT,
    network
  );
  const usdtTokenAddress = await getContractAddress(
    "usdtToken",
    USDT_TOKEN_CONTRACT,
    network
  );
  const aavePoolAddress = await getContractAddress(
    "aavePool",
    AAVE_POOL_CONTRACT,
    network
  );

  // Curve addresses
  let curveAaveLpTokenAddress = await getContractAddress(
    "curveAaveLpToken",
    CURVE_AAVE_LP_TOKEN_CONTRACT,
    network
  );
  let curveAavePoolAddress = await getContractAddress(
    "curveAavePool",
    CURVE_AAVE_POOL_CONTRACT,
    network
  );
  let crvTokenAddress = await getContractAddress(
    "crvToken",
    CRV_TOKEN_CONTRACT,
    network
  );
  let crvVotingAddress = await getContractAddress(
    "crvVoting",
    CRV_VOTING_CONTRACT,
    network
  );
  let crvControllerAddress = await getContractAddress(
    "crvController",
    CRV_CONTROLLER_CONTRACT,
    network
  );
  let crvMinterAddress = await getContractAddress(
    "crvMinter",
    CRV_MINTER_CONTRACT,
    network
  );
  let curveAaveGaugeAddress = await getContractAddress(
    "curveAaveGauge",
    CURVE_AAVE_GAUGE_CONTRACT,
    network
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Aave LP token contract
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy the Curve Aave LP token contract
  if (curveAaveLpTokenAddress && network != "hardhat") {
    console.log(
      `Using deployed ${CURVE_AAVE_LP_TOKEN_CONTRACT} at ${curveAaveLpTokenAddress}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_LP_TOKEN_CONTRACT}`);
    const tx = await deploy(CURVE_AAVE_LP_TOKEN_CONTRACT, {
      ...opts,
      contract: CurveTokenV3Artifact,
      args: [
        "Funny Curve.fi amDAI/amUSDC/amUSDT", // name
        "am3CRV", // symbol
        deployer, // minter (will be transfered to Curve Aave pool in setup)
        deployer, // initial token holder
      ],
    });
    curveAaveLpTokenAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Aave pool contract
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy the Curve Aave pool contract
  if (curveAavePoolAddress && network != "hardhat") {
    console.log(
      `Using deployed ${CURVE_AAVE_POOL_CONTRACT} at ${curveAavePoolAddress}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_POOL_CONTRACT}`);
    const tx = await deploy(CURVE_AAVE_POOL_CONTRACT, {
      ...opts,
      contract: StableSwapAaveArtifact,
      args: [
        [adaiTokenProxyAddress, ausdcTokenProxyAddress, ausdtTokenProxyAddress], // coins
        [daiTokenAddress, usdcTokenAddress, usdtTokenAddress], // underlying coins
        curveAaveLpTokenAddress, // pool token
        aavePoolAddress, // Aave lending pool
        ethers.BigNumber.from("2000"), // A
        ethers.BigNumber.from("3000000"), // fee
        ethers.BigNumber.from("5000000000"), // admin fee
        ethers.BigNumber.from("20000000000"), // offpeg fee multiplier
      ],
    });
    curveAavePoolAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve DAO contracts
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy CRV token
  if (crvTokenAddress) {
    console.log(`Using deployed ${CRV_TOKEN_CONTRACT} at ${crvTokenAddress}`);
  } else {
    console.log(`Deploying ${CRV_TOKEN_CONTRACT}`);
    const tx = await deploy(CRV_TOKEN_CONTRACT, {
      ...opts,
      contract: Erc20CrvArtifact,
      args: [
        "Curve DAO Token", // name
        "CRV", // symbol
        18, // decimals
        deployer, // admin
        deployer, // initial holder
      ],
    });
    crvTokenAddress = tx.address;
  }

  // Deploy CRV voting
  if (crvVotingAddress) {
    console.log(`Using deployed ${CRV_VOTING_CONTRACT} at ${crvVotingAddress}`);
  } else {
    console.log(`Deploying ${CRV_VOTING_CONTRACT}`);
    const tx = await deploy(CRV_VOTING_CONTRACT, {
      ...opts,
      contract: VotingEscrowArtifact,
      args: [
        crvTokenAddress, // token
        "Vote-escrowed CRV", // name
        "veCRV", // symbol
        "veCRV_1.0.0", // version
        deployer, // admin
        deployer, // controller
      ],
    });
    crvVotingAddress = tx.address;
  }

  // Deploy CRV controller
  if (crvControllerAddress) {
    console.log(
      `Using deployed ${CRV_CONTROLLER_CONTRACT} at ${crvControllerAddress}`
    );
  } else {
    console.log(`Deploying ${CRV_CONTROLLER_CONTRACT}`);
    const tx = await deploy(CRV_CONTROLLER_CONTRACT, {
      ...opts,
      contract: GaugeControllerArtifact,
      args: [
        crvTokenAddress, // token
        crvVotingAddress, // voting escrow
        deployer, // admin
      ],
    });
    crvControllerAddress = tx.address;
  }

  // Deploy CRV minter
  if (crvMinterAddress) {
    console.log(`Using deployed ${CRV_MINTER_CONTRACT} at ${crvMinterAddress}`);
  } else {
    console.log(`Deploying ${CRV_MINTER_CONTRACT}`);
    const tx = await deploy(CRV_MINTER_CONTRACT, {
      ...opts,
      contract: MinterArtifact,
      args: [
        crvTokenAddress, // token
        crvControllerAddress, // controller
      ],
    });
    crvMinterAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Aave gauge
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy the Curve Aave gauge contract
  if (curveAaveGaugeAddress && network != "hardhat") {
    console.log(
      `Using deployed ${CURVE_AAVE_GAUGE_CONTRACT} at ${curveAaveGaugeAddress}`
    );
  } else {
    console.log(`Deploying ${CURVE_AAVE_GAUGE_CONTRACT}`);
    const tx = await deploy(CURVE_AAVE_GAUGE_CONTRACT, {
      ...opts,
      contract: LiquidityGaugeArtifact,
      args: [
        curveAaveLpTokenAddress, // LP address
        crvMinterAddress, // minter
        deployer, // admin
      ],
    });
    curveAaveGaugeAddress = tx.address;
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
    curveAavePoolAddress
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
    crvMinterAddress
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
    curveAaveGaugeAddress, // address
    0, // gauge type,
    0 // weight (TODO)
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Seed the stablecoins with some funds
  //
  //////////////////////////////////////////////////////////////////////////////

  // Initial stablecoin amounts for Curve Aave MATIC pool. Values retrieved
  // from https://curve.fi/#/polygon/pools/aave/deposit on 2022-11-22.
  const INITIAL_DAI = ethers.utils.parseUnits("5687092", 18); // 5,687,092 DAI
  const INITIAL_USDC = ethers.utils.parseUnits("6255520", 6); // 6,255,520 USDC
  const INITIAL_USDT = ethers.utils.parseUnits("19583657", 6); // 19,583,657 USDT
  const INITIAL_CURVE_AAVE_LP_TOKENS = ethers.BigNumber.from(
    "31522774262425669316161975"
  ); // About 31,522,774 LP tokens

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
    curveAavePoolAddress,
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
    curveAavePoolAddress,
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
    curveAavePoolAddress,
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
    curveAaveGaugeAddress
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
      curveAaveGaugeAddress,
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

  writeAddress(network, CURVE_AAVE_LP_TOKEN_CONTRACT, curveAaveLpTokenAddress);
  writeAddress(network, CURVE_AAVE_POOL_CONTRACT, curveAavePoolAddress);
  writeAddress(network, CURVE_AAVE_GAUGE_CONTRACT, curveAaveGaugeAddress);
};

module.exports = func;
module.exports.tags = ["Curve"];
