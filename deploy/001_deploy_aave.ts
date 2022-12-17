/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

/* eslint @typescript-eslint/no-unused-vars: "off" */
/* eslint no-empty: "off" */

import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployOptions } from "hardhat-deploy/types";

import { getAddressBook, writeAddress } from "../src/addressBook";
import {
  AAVE_ADDRESS_CONFIG_CONTRACT,
  AAVE_INCENTIVES_CONTROLLER_CONTRACT,
  AAVE_INTEREST_RATE_STRATEGY_CONTRACT,
  AAVE_LENDING_RATE_ORACLE_CONTRACT,
  AAVE_POOL_CONFIG_CONTRACT,
  AAVE_POOL_CONTRACT,
  AAVE_STABLE_DEBT_TOKEN_CONTRACT,
  AAVE_TOKEN_CONTRACT,
  AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
  aavePoolAbi,
  ADAI_STABLE_DEBT_TOKEN_CONTRACT,
  ADAI_TOKEN_CONTRACT,
  ADAI_TOKEN_PROXY_CONTRACT,
  ADAI_VARIABLE_DEBT_TOKEN_CONTRACT,
  AUSDC_STABLE_DEBT_TOKEN_CONTRACT,
  AUSDC_TOKEN_CONTRACT,
  AUSDC_TOKEN_PROXY_CONTRACT,
  AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT,
  AUSDT_STABLE_DEBT_TOKEN_CONTRACT,
  AUSDT_TOKEN_CONTRACT,
  AUSDT_TOKEN_PROXY_CONTRACT,
  AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT,
  GENERIC_LOGIC_CONTRACT,
  RESERVE_LOGIC_CONTRACT,
  VALIDATION_LOGIC_CONTRACT,
} from "../src/contracts/depends";
import {
  DAI_TOKEN_CONTRACT,
  USDC_TOKEN_CONTRACT,
  USDT_TOKEN_CONTRACT,
} from "../src/contracts/testing";
import { AddressBook } from "../src/interfaces";

//
// Deploy the Aave environment
//

const func: DeployFunction = async (hardhat_re: HardhatRuntimeEnvironment) => {
  const { deployments, ethers, getNamedAccounts } = hardhat_re;

  const { deploy, execute, read } = deployments;
  const { deployer } = await getNamedAccounts();

  const [deployerSigner] = await ethers.getSigners();

  // Account to use for Aave treasury
  const aaveTreasury = deployer;

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
  // Deploy Stablecoins
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy DAI
  if (addressBook.daiToken && networkName != "hardhat") {
    console.log(
      `Using deployed ${DAI_TOKEN_CONTRACT} at ${addressBook.daiToken}`
    );
  } else {
    console.log(`Deploying ${DAI_TOKEN_CONTRACT}`);
    const tx = await deploy(DAI_TOKEN_CONTRACT, opts);
    addressBook.daiToken = tx.address;
  }

  // Deploy USDC
  if (addressBook.usdcToken && networkName != "hardhat") {
    console.log(
      `Using deployed ${USDC_TOKEN_CONTRACT} at ${addressBook.usdcToken}`
    );
  } else {
    console.log(`Deploying ${USDC_TOKEN_CONTRACT}`);
    const tx = await deploy(USDC_TOKEN_CONTRACT, opts);
    addressBook.usdcToken = tx.address;
  }

  // Deploy USDT
  if (addressBook.usdtToken && networkName != "hardhat") {
    console.log(
      `Using deployed ${USDT_TOKEN_CONTRACT} at ${addressBook.usdtToken}`
    );
  } else {
    console.log(`Deploying ${USDT_TOKEN_CONTRACT}`);
    const tx = await deploy(USDT_TOKEN_CONTRACT, opts);
    addressBook.usdtToken = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave address config
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave address config
  if (addressBook.aaveAddressConfig) {
    console.log(
      `Using deployed ${AAVE_ADDRESS_CONFIG_CONTRACT} at ${addressBook.aaveAddressConfig}`
    );
  } else {
    console.log(`Deploying ${AAVE_ADDRESS_CONFIG_CONTRACT}`);
    const tx = await deploy(AAVE_ADDRESS_CONFIG_CONTRACT, {
      ...opts,
      args: ["", deployer],
    });
    addressBook.aaveAddressConfig = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave pool config
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave pool config
  if (addressBook.aavePoolConfig) {
    console.log(
      `Using deployed ${AAVE_POOL_CONFIG_CONTRACT} at ${addressBook.aavePoolConfig}`
    );
  } else {
    console.log(`Deploying ${AAVE_POOL_CONFIG_CONTRACT}`);
    const tx = await deploy(AAVE_POOL_CONFIG_CONTRACT, opts);
    addressBook.aavePoolConfig = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave pool
  //
  //////////////////////////////////////////////////////////////////////////////

  //
  // Deploy Aave pool
  //
  // TODO: This contract must be deployed with the ethers contract factory
  // because it requires a library, and as a result deployment files are
  // not generated. This is a known issue with hardhat-deploy.
  //
  if (addressBook.aavePool && networkName != "hardhat") {
    console.log(
      `Using deployed ${AAVE_POOL_CONTRACT} at ${addressBook.aavePool}`
    );
  } else {
    // Deploy GenericLogic
    console.log(`Deploying ${GENERIC_LOGIC_CONTRACT}`);
    const GenericLogic = await ethers.getContractFactory(
      GENERIC_LOGIC_CONTRACT,
      opts
    );
    const genericLogic = await GenericLogic.deploy();

    // Deploy ReserveLogic
    console.log(`Deploying ${RESERVE_LOGIC_CONTRACT}`);
    const ReserveLogic = await ethers.getContractFactory(
      RESERVE_LOGIC_CONTRACT,
      opts
    );
    const reserveLogic = await ReserveLogic.deploy();

    // Deploy ValidationLogic
    console.log(`Deploying ${VALIDATION_LOGIC_CONTRACT}`);
    const ValidationLogic = await ethers.getContractFactory(
      VALIDATION_LOGIC_CONTRACT,
      {
        ...opts,
        libraries: {
          GenericLogic: genericLogic.address,
        },
      }
    );
    const validationLogic = await ValidationLogic.deploy();

    // Deploy Aave pool
    console.log(`Deploying ${AAVE_POOL_CONTRACT}`);
    const AavePool = await ethers.getContractFactory(AAVE_POOL_CONTRACT, {
      ...opts,
      libraries: {
        ReserveLogic: reserveLogic.address,
        ValidationLogic: validationLogic.address,
      },
    });
    const aavePool = await AavePool.deploy();
    addressBook.aavePool = aavePool.address;
  }

  // Mine the next block to commit contractfactory deployment
  await ethers.provider.send("evm_mine", []);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // NOTE: Can't use deterministic deployment because Aave V2 ATokens don't use
  // construction parameters, and all tokens use the same bytecode

  // Deploy Aave DAI token
  if (addressBook.adaiToken) {
    console.log(
      `Using deployed ${ADAI_TOKEN_CONTRACT} at ${addressBook.adaiToken}`
    );
  } else {
    console.log(`Deploying ${ADAI_TOKEN_CONTRACT}`);
    const tx = await deploy(ADAI_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.adaiToken = tx.address;
  }

  // Deploy Aave USDC token
  if (addressBook.ausdcToken) {
    console.log(
      `Using deployed ${AUSDC_TOKEN_CONTRACT} at ${addressBook.ausdcToken}`
    );
  } else {
    console.log(`Deploying ${AUSDC_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDC_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.ausdcToken = tx.address;
  }

  // Deploy Aave USDT token
  if (addressBook.ausdtToken) {
    console.log(
      `Using deployed ${AUSDT_TOKEN_CONTRACT} at ${addressBook.ausdtToken}`
    );
  } else {
    console.log(`Deploying ${AUSDT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.ausdtToken = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave stable debt tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave DAI stable debt token
  if (addressBook.adaiStableDebtToken) {
    console.log(
      `Using deployed ${ADAI_STABLE_DEBT_TOKEN_CONTRACT} at ${addressBook.adaiStableDebtToken}`
    );
  } else {
    console.log(`Deploying ${ADAI_STABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(ADAI_STABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_STABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.adaiStableDebtToken = tx.address;
  }

  // Deploy Aave USDC stable debt token
  if (addressBook.ausdcStableDebtToken) {
    console.log(
      `Using deployed ${AUSDC_STABLE_DEBT_TOKEN_CONTRACT} at ${addressBook.ausdcStableDebtToken}`
    );
  } else {
    console.log(`Deploying ${AUSDC_STABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDC_STABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_STABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.ausdcStableDebtToken = tx.address;
  }

  // Deploy Aave USDT stable debt token
  if (addressBook.ausdtStableDebtToken) {
    console.log(
      `Using deployed ${AUSDT_STABLE_DEBT_TOKEN_CONTRACT} at ${addressBook.ausdtStableDebtToken}`
    );
  } else {
    console.log(`Deploying ${AUSDT_STABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDT_STABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_STABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.ausdtStableDebtToken = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave variable debt tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave DAI variable debt token
  if (addressBook.adaiVariableDebtToken) {
    console.log(
      `Using deployed ${ADAI_VARIABLE_DEBT_TOKEN_CONTRACT} at ${addressBook.adaiVariableDebtToken}`
    );
  } else {
    console.log(`Deploying ${ADAI_VARIABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(ADAI_VARIABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.adaiVariableDebtToken = tx.address;
  }

  // Deploy Aave USDC variable debt token
  if (addressBook.ausdcVariableDebtToken) {
    console.log(
      `Using deployed ${AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT} at ${addressBook.ausdcVariableDebtToken}`
    );
  } else {
    console.log(`Deploying ${AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.ausdcVariableDebtToken = tx.address;
  }

  // Deploy Aave USDT variable debt token
  if (addressBook.ausdtVariableDebtToken) {
    console.log(
      `Using deployed ${AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT} at ${addressBook.ausdtVariableDebtToken}`
    );
  } else {
    console.log(`Deploying ${AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT}`);

    const tx = await deploy(AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    addressBook.ausdtVariableDebtToken = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave interest rate strategy
  //
  //////////////////////////////////////////////////////////////////////////////

  // TODO: Move to constants
  const RAY = ethers.BigNumber.from(10).pow(27);

  // Deploy Aave interest rate strategy
  if (addressBook.aaveInterestRateStrategy) {
    console.log(
      `Using deployed ${AAVE_INTEREST_RATE_STRATEGY_CONTRACT} at ${addressBook.aaveInterestRateStrategy}`
    );
  } else {
    console.log(`Deploying ${AAVE_INTEREST_RATE_STRATEGY_CONTRACT}`);
    const tx = await deploy(AAVE_INTEREST_RATE_STRATEGY_CONTRACT, {
      ...opts,
      args: [
        addressBook.aaveAddressConfig, // provider
        RAY.div(2), // optimal usage ratio
        0, // base variable borrow rate
        0, // variable rate slope 1
        0, // variable rate slope 2
        0, // stable rate slope 1
        0, // stable rate slope 2
      ],
    });
    addressBook.aaveInterestRateStrategy = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy mock Aave incentives controller
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy mock Aave incentives controller
  if (addressBook.aaveIncentivesController) {
    console.log(
      `Using deployed ${AAVE_INCENTIVES_CONTROLLER_CONTRACT} at ${addressBook.aaveIncentivesController}`
    );
  } else {
    console.log(`Deploying ${AAVE_INCENTIVES_CONTROLLER_CONTRACT}`);
    const tx = await deploy(AAVE_INCENTIVES_CONTROLLER_CONTRACT, opts);
    addressBook.aaveIncentivesController = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy mock Aave lending rate oracle
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy mock Aave lending rate oracle
  if (addressBook.aaveLendingRateOracle) {
    console.log(
      `Using deployed ${AAVE_LENDING_RATE_ORACLE_CONTRACT} at ${addressBook.aaveLendingRateOracle}`
    );
  } else {
    console.log(`Deploying ${AAVE_LENDING_RATE_ORACLE_CONTRACT}`);
    const tx = await deploy(AAVE_LENDING_RATE_ORACLE_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    addressBook.aaveLendingRateOracle = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Configure Aave addresses
  //
  //////////////////////////////////////////////////////////////////////////////

  // Aave address IDs
  const LENDING_POOL = ethers.utils.formatBytes32String("LENDING_POOL");
  const LENDING_POOL_CONFIGURATOR = ethers.utils.formatBytes32String(
    "LENDING_POOL_CONFIGURATOR"
  );
  const POOL_ADMIN = ethers.utils.formatBytes32String("POOL_ADMIN");
  const EMERGENCY_ADMIN = ethers.utils.formatBytes32String("EMERGENCY_ADMIN");
  /*
  const LENDING_POOL_COLLATERAL_MANAGER = ethers.utils.formatBytes32String(
    "LENDING_POOL_COLLATERAL_MANAGER"
  );
  const PRICE_ORACLE = ethers.utils.formatBytes32String("PRICE_ORACLE");
  */
  const LENDING_RATE_ORACLE = ethers.utils.formatBytes32String(
    "LENDING_RATE_ORACLE"
  );

  console.log("Setting Aave pool address");

  await execute(
    AAVE_ADDRESS_CONFIG_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "setAddress",
    LENDING_POOL,
    addressBook.aavePool
  );

  console.log("Setting Aave pool config address");

  await execute(
    AAVE_ADDRESS_CONFIG_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "setAddress",
    LENDING_POOL_CONFIGURATOR,
    addressBook.aavePoolConfig
  );

  console.log("Setting Aave pool admin address");

  await execute(
    AAVE_ADDRESS_CONFIG_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "setAddress",
    POOL_ADMIN,
    deployer
  );

  console.log("Setting Aave pool emergency admin address");

  await execute(
    AAVE_ADDRESS_CONFIG_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "setAddress",
    EMERGENCY_ADMIN,
    deployer
  );

  console.log("Setting Aave lending rate oracle address");

  await execute(
    AAVE_ADDRESS_CONFIG_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    "setAddress",
    LENDING_RATE_ORACLE,
    addressBook.aaveLendingRateOracle
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Configure Aave lending rate oracle
  //
  //////////////////////////////////////////////////////////////////////////////

  console.log("Setting Aave oracle lending rates");

  //
  // DAI lending rate
  //

  await execute(
    AAVE_LENDING_RATE_ORACLE_CONTRACT,
    { from: deployer, log: true },
    "setMarketBorrowRate",
    addressBook.daiToken,
    ethers.BigNumber.from(
      "39000000000000000000000000" // Taken from Polygon
    )
  );

  //
  // USDC lending rate
  //

  await execute(
    AAVE_LENDING_RATE_ORACLE_CONTRACT,
    { from: deployer, log: true },
    "setMarketBorrowRate",
    addressBook.usdcToken,
    ethers.BigNumber.from(
      "39000000000000000000000000" // Taken from Polygon
    )
  );

  //
  // USDT lending rate
  //

  await execute(
    AAVE_LENDING_RATE_ORACLE_CONTRACT,
    { from: deployer, log: true },
    "setMarketBorrowRate",
    addressBook.usdtToken,
    ethers.BigNumber.from(
      "35000000000000000000000000" // Taken from Polygon
    )
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Initialize Aave pool config
  //
  //////////////////////////////////////////////////////////////////////////////

  // Note: Aave in depends is patched to make the "lastInitializedRevision"
  // field public so that we can check if initialization has already occurred

  if (
    (await read(
      AAVE_POOL_CONFIG_CONTRACT,
      { from: deployer },
      "lastInitializedRevision"
    )) > 0
  ) {
    console.log("Aave pool config contract already initialized");
  } else {
    console.log("Initializing Aave pool config contract");

    await execute(
      AAVE_POOL_CONFIG_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      "initialize",
      addressBook.aaveAddressConfig
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Initialize Aave pool
  //
  //////////////////////////////////////////////////////////////////////////////

  // NOTE: ethers is used because the contract was deployed by a factory to
  // link external libraries

  console.log("Initializing Aave pool");

  // Construct the contract
  const aavePoolContract = new ethers.Contract(
    addressBook.aavePool,
    aavePoolAbi,
    deployerSigner
  );

  const initTx = await aavePoolContract.initialize(
    addressBook.aaveAddressConfig
  );
  await initTx.wait();

  //////////////////////////////////////////////////////////////////////////////
  //
  // Initialize Aave assets
  //
  //////////////////////////////////////////////////////////////////////////////

  const initInputParams: {
    aTokenImpl: string;
    stableDebtTokenImpl: string;
    variableDebtTokenImpl: string;
    underlyingAssetDecimals: number;
    interestRateStrategyAddress: string;
    underlyingAsset: string;
    treasury: string;
    incentivesController: string;
    underlyingAssetName: string;
    aTokenName: string;
    aTokenSymbol: string;
    variableDebtTokenName: string;
    variableDebtTokenSymbol: string;
    stableDebtTokenName: string;
    stableDebtTokenSymbol: string;
    params: Array<number>;
  }[] = [];

  // Get initialized reserves to check for already-initialized tokens
  const reserves = await aavePoolContract.getReservesList();

  //
  // aDAI
  //

  if (reserves.includes(addressBook.daiToken)) {
    console.log("aDAI token already initialized");
  } else {
    console.log("Initializing aDAI token");

    initInputParams.push({
      aTokenImpl: addressBook.adaiToken,
      stableDebtTokenImpl: addressBook.adaiStableDebtToken,
      variableDebtTokenImpl: addressBook.adaiVariableDebtToken,
      underlyingAssetDecimals: 18,
      interestRateStrategyAddress: addressBook.aaveInterestRateStrategy,
      underlyingAsset: addressBook.daiToken,
      treasury: aaveTreasury,
      incentivesController: addressBook.aaveIncentivesController,
      underlyingAssetName: "DAI",
      aTokenName: `Funny Aave Matic Market DAI`,
      aTokenSymbol: `amDAI`,
      variableDebtTokenName: `VD amDAI`,
      variableDebtTokenSymbol: `variableDebtamDAI}`,
      stableDebtTokenName: `SD amDAI`,
      stableDebtTokenSymbol: `stableDebtamDAI`,
      params: [],
    });
  }

  //
  // aUSDC
  //

  if (reserves.includes(addressBook.usdcToken)) {
    console.log("aUSDC token already initialized");
  } else {
    console.log("Initializing aUSDC token");

    initInputParams.push({
      aTokenImpl: addressBook.ausdcToken,
      stableDebtTokenImpl: addressBook.ausdcStableDebtToken,
      variableDebtTokenImpl: addressBook.ausdcVariableDebtToken,
      underlyingAssetDecimals: 6,
      interestRateStrategyAddress: addressBook.aaveInterestRateStrategy,
      underlyingAsset: addressBook.usdcToken,
      treasury: aaveTreasury,
      incentivesController: addressBook.aaveIncentivesController,
      underlyingAssetName: "USDC",
      aTokenName: `Funny Aave Matic Market USDC`,
      aTokenSymbol: `amUSDC`,
      variableDebtTokenName: `VD amUSDC`,
      variableDebtTokenSymbol: `variableDebtamUSDC}`,
      stableDebtTokenName: `SD amUSDC`,
      stableDebtTokenSymbol: `stableDebtamUSDC`,
      params: [],
    });
  }

  //
  // aUSDT
  //

  if (reserves.includes(addressBook.usdtToken)) {
    console.log("aUSDT token already initialized");
  } else {
    console.log("Initializing aUSDT token");

    initInputParams.push({
      aTokenImpl: addressBook.ausdtToken,
      stableDebtTokenImpl: addressBook.ausdtStableDebtToken,
      variableDebtTokenImpl: addressBook.ausdtVariableDebtToken,
      underlyingAssetDecimals: 6,
      interestRateStrategyAddress: addressBook.aaveInterestRateStrategy,
      underlyingAsset: addressBook.usdtToken,
      treasury: aaveTreasury,
      incentivesController: addressBook.aaveIncentivesController,
      underlyingAssetName: "USDT",
      aTokenName: `Funny Aave Matic Market USDT`,
      aTokenSymbol: `amUSDT`,
      variableDebtTokenName: `VD amUSDT`,
      variableDebtTokenSymbol: `variableDebtamUSDT}`,
      stableDebtTokenName: `SD amUSDT`,
      stableDebtTokenSymbol: `stableDebtamUSDT`,
      params: [],
    });
  }

  //
  // Batch initialization
  //

  if (initInputParams.length > 0) {
    console.log(`Initializing ${initInputParams.length} aTokens`);

    await execute(
      AAVE_POOL_CONFIG_CONTRACT,
      {
        from: deployer,
        log: true,
        gasLimit: 7000000, // 7M GWei, enough to initialize up to 3 assets
      },
      "batchInitReserve",
      initInputParams
    );
  } else {
    console.log("All aTokens are already initialized");
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Get Aave asset proxy addresses
  //
  //////////////////////////////////////////////////////////////////////////////

  //
  // aDAI
  //

  const daiReserve = await aavePoolContract.getReserveData(
    addressBook.daiToken
  );

  addressBook.adaiTokenProxy = daiReserve[7];
  addressBook.adaiStableDebtTokenProxy = daiReserve[8];
  addressBook.adaiVariableDebtTokenProxy = daiReserve[9];

  //
  // aUSDC
  //

  const usdcReserve = await aavePoolContract.getReserveData(
    addressBook.usdcToken
  );

  addressBook.ausdcTokenProxy = usdcReserve[7];
  addressBook.ausdcStableDebtTokenProxy = usdcReserve[8];
  addressBook.ausdcVariableDebtTokenProxy = usdcReserve[9];

  //
  // aUSDT
  //

  const usdtReserve = await aavePoolContract.getReserveData(
    addressBook.usdtToken
  );

  addressBook.ausdtTokenProxy = usdtReserve[7];
  addressBook.ausdtStableDebtTokenProxy = usdtReserve[8];
  addressBook.ausdtVariableDebtTokenProxy = usdtReserve[9];

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  writeAddress(networkName, AAVE_POOL_CONTRACT, addressBook.aavePool);
  writeAddress(networkName, DAI_TOKEN_CONTRACT, addressBook.daiToken);
  writeAddress(networkName, USDC_TOKEN_CONTRACT, addressBook.usdcToken);
  writeAddress(networkName, USDT_TOKEN_CONTRACT, addressBook.usdtToken);
  writeAddress(
    networkName,
    ADAI_TOKEN_PROXY_CONTRACT,
    addressBook.adaiTokenProxy
  );
  writeAddress(
    networkName,
    AUSDC_TOKEN_PROXY_CONTRACT,
    addressBook.ausdcTokenProxy
  );
  writeAddress(
    networkName,
    AUSDT_TOKEN_PROXY_CONTRACT,
    addressBook.ausdtTokenProxy
  );
};

module.exports = func;
module.exports.tags = ["Aave"];
