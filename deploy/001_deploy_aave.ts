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

import fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeployOptions } from "hardhat-deploy/types";

// TODO: Fully qualified contract names
const AAVE_ADDRESS_CONFIG_CONTRACT = "LendingPoolAddressesProvider";
const AAVE_INCENTIVES_CONTROLLER_CONTRACT = "MockIncentivesController";
const AAVE_INTEREST_RATE_STRATEGY_CONTRACT =
  "DefaultReserveInterestRateStrategy";
const AAVE_LENDING_RATE_ORACLE_CONTRACT = "LendingRateOracle";
const AAVE_POOL_CONFIG_CONTRACT = "LendingPoolConfigurator";
const AAVE_POOL_CONTRACT = "LendingPool";
const AAVE_STABLE_DEBT_TOKEN_CONTRACT = "StableDebtToken";
const AAVE_TOKEN_CONTRACT = "AToken";
const AAVE_VARIABLE_DEBT_TOKEN_CONTRACT = "VariableDebtToken";
const ADAI_TOKEN_PROXY_CONTRACT = "ADAIProxy";
const AUSDC_TOKEN_PROXY_CONTRACT = "AUSDCProxy";
const AUSDT_TOKEN_PROXY_CONTRACT = "AUSDTProxy";
const DAI_TOKEN_CONTRACT = "DAI";
const USDC_TOKEN_CONTRACT = "USDC";
const USDT_TOKEN_CONTRACT = "USDT";

const GENERIC_LOGIC_LIBRARY = "GenericLogic";
const RESERVE_LOGIC_LIBRARY = "ReserveLogic";
const VALIDATION_LOGIC_LIBRARY = "ValidationLogic";

// Deployed contract aliases
const ADAI_STABLE_DEBT_TOKEN_CONTRACT = "ADAIStableDebt";
const ADAI_TOKEN_CONTRACT = "ADAI";
const ADAI_VARIABLE_DEBT_TOKEN_CONTRACT = "ADAIVariableDebt";
const AUSDC_STABLE_DEBT_TOKEN_CONTRACT = "AUSDCStableDebt";
const AUSDC_TOKEN_CONTRACT = "AUSDC";
const AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT = "AUSDCVariableDebt";
const AUSDT_STABLE_DEBT_TOKEN_CONTRACT = "AUSDTStableDebt";
const AUSDT_TOKEN_CONTRACT = "AUSDT";
const AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT = "AUSDTVariableDebt";

// Contract ABIs
import AavePoolAbi from "../src/abi/contracts/depends/aave-v2/protocol/lendingpool/LendingPool.sol/LendingPool.json";

//
// Address book
//

interface AddressBook {
  daiToken: string;
  usdcToken: string;
  usdtToken: string;
  aaveAddressConfig: string;
  aavePoolConfig: string;
  aavePool: string;
  adaiToken: string;
  ausdcToken: string;
  ausdtToken: string;
  adaiStableDebtToken: string;
  ausdcStableDebtToken: string;
  ausdtStableDebtToken: string;
  adaiVariableDebtToken: string;
  ausdcVariableDebtToken: string;
  ausdtVariableDebtToken: string;
  aaveInterestRateStrategy: string;
  aaveIncentivesController: string;
  aaveLendingRateOracle: string;
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
  const network = hardhat_re.network.name;

  // Get the contract addresses
  loadAddresses(network);

  let daiTokenAddress = await getContractAddress(
    "daiToken",
    DAI_TOKEN_CONTRACT,
    network
  );
  let usdcTokenAddress = await getContractAddress(
    "usdcToken",
    USDC_TOKEN_CONTRACT,
    network
  );
  let usdtTokenAddress = await getContractAddress(
    "usdtToken",
    USDT_TOKEN_CONTRACT,
    network
  );
  let aaveAddressConfigAddress = await getContractAddress(
    "aaveAddressConfig",
    AAVE_ADDRESS_CONFIG_CONTRACT,
    network
  );
  let aavePoolConfigAddress = await getContractAddress(
    "aavePoolConfig",
    AAVE_POOL_CONFIG_CONTRACT,
    network
  );
  let aavePoolAddress = await getContractAddress(
    "aavePool",
    AAVE_POOL_CONTRACT,
    network
  );
  let adaiTokenAddress = await getContractAddress(
    "adaiToken",
    ADAI_TOKEN_CONTRACT,
    network
  );
  let ausdcTokenAddress = await getContractAddress(
    "ausdcToken",
    AUSDC_TOKEN_CONTRACT,
    network
  );
  let ausdtTokenAddress = await getContractAddress(
    "ausdtToken",
    AUSDT_TOKEN_CONTRACT,
    network
  );
  let adaiStableDebtTokenAddress = await getContractAddress(
    "adaiStableDebtToken",
    ADAI_STABLE_DEBT_TOKEN_CONTRACT,
    network
  );
  let ausdcStableDebtTokenAddress = await getContractAddress(
    "ausdcStableDebtToken",
    AUSDC_STABLE_DEBT_TOKEN_CONTRACT,
    network
  );
  let ausdtStableDebtTokenAddress = await getContractAddress(
    "ausdtStableDebtToken",
    AUSDT_STABLE_DEBT_TOKEN_CONTRACT,
    network
  );
  let adaiVariableDebtTokenAddress = await getContractAddress(
    "adaiVariableDebtToken",
    ADAI_VARIABLE_DEBT_TOKEN_CONTRACT,
    network
  );
  let ausdcVariableDebtTokenAddress = await getContractAddress(
    "ausdcVariableDebtToken",
    AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT,
    network
  );
  let ausdtVariableDebtTokenAddress = await getContractAddress(
    "ausdtVariableDebtToken",
    AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT,
    network
  );
  let aaveInterestRateStrategyAddress = await getContractAddress(
    "aaveInterestRateStrategy",
    AAVE_INTEREST_RATE_STRATEGY_CONTRACT,
    network
  );
  let aaveIncentivesControllerAddress = await getContractAddress(
    "aaveIncentivesController",
    AAVE_INCENTIVES_CONTROLLER_CONTRACT,
    network
  );
  let aaveLendingRateOracleAddress = await getContractAddress(
    "aaveLendingRateOracle",
    AAVE_LENDING_RATE_ORACLE_CONTRACT,
    network
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Stablecoins
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy DAI
  if (daiTokenAddress && network != "hardhat") {
    console.log(`Using deployed ${DAI_TOKEN_CONTRACT} at ${daiTokenAddress}`);
  } else {
    console.log(`Deploying ${DAI_TOKEN_CONTRACT}`);
    const tx = await deploy(DAI_TOKEN_CONTRACT, opts);
    daiTokenAddress = tx.address;
  }

  // Deploy USDC
  if (usdcTokenAddress && network != "hardhat") {
    console.log(`Using deployed ${USDC_TOKEN_CONTRACT} at ${usdcTokenAddress}`);
  } else {
    console.log(`Deploying ${USDC_TOKEN_CONTRACT}`);
    const tx = await deploy(USDC_TOKEN_CONTRACT, opts);
    usdcTokenAddress = tx.address;
  }

  // Deploy USDT
  if (usdtTokenAddress && network != "hardhat") {
    console.log(`Using deployed ${USDT_TOKEN_CONTRACT} at ${usdtTokenAddress}`);
  } else {
    console.log(`Deploying ${USDT_TOKEN_CONTRACT}`);
    const tx = await deploy(USDT_TOKEN_CONTRACT, opts);
    usdtTokenAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave address config
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave address config
  if (aaveAddressConfigAddress) {
    console.log(
      `Using deployed ${AAVE_ADDRESS_CONFIG_CONTRACT} at ${aaveAddressConfigAddress}`
    );
  } else {
    console.log(`Deploying ${AAVE_ADDRESS_CONFIG_CONTRACT}`);
    const tx = await deploy(AAVE_ADDRESS_CONFIG_CONTRACT, {
      ...opts,
      args: ["", deployer],
    });
    aaveAddressConfigAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave pool config
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave pool config
  if (aavePoolConfigAddress) {
    console.log(
      `Using deployed ${AAVE_POOL_CONFIG_CONTRACT} at ${aavePoolConfigAddress}`
    );
  } else {
    console.log(`Deploying ${AAVE_POOL_CONFIG_CONTRACT}`);
    const tx = await deploy(AAVE_POOL_CONFIG_CONTRACT, opts);
    aavePoolConfigAddress = tx.address;
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
  if (aavePoolAddress && network != "hardhat") {
    console.log(`Using deployed ${AAVE_POOL_CONTRACT} at ${aavePoolAddress}`);
  } else {
    // Deploy GenericLogic
    console.log(`Deploying ${GENERIC_LOGIC_LIBRARY}`);
    const GenericLogic = await ethers.getContractFactory(
      GENERIC_LOGIC_LIBRARY,
      opts
    );
    const genericLogic = await GenericLogic.deploy();

    // Deploy ReserveLogic
    console.log(`Deploying ${RESERVE_LOGIC_LIBRARY}`);
    const ReserveLogic = await ethers.getContractFactory(
      RESERVE_LOGIC_LIBRARY,
      opts
    );
    const reserveLogic = await ReserveLogic.deploy();

    // Deploy ValidationLogic
    console.log(`Deploying ${VALIDATION_LOGIC_LIBRARY}`);
    const ValidationLogic = await ethers.getContractFactory(
      VALIDATION_LOGIC_LIBRARY,
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
    aavePoolAddress = aavePool.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // NOTE: Can't use deterministic deployment because Aave V2 ATokens don't use
  // construction parameters, and all tokens use the same bytecode

  // Deploy Aave DAI token
  if (adaiTokenAddress) {
    console.log(`Using deployed ${ADAI_TOKEN_CONTRACT} at ${adaiTokenAddress}`);
  } else {
    console.log(`Deploying ${ADAI_TOKEN_CONTRACT}`);
    const tx = await deploy(ADAI_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    adaiTokenAddress = tx.address;
  }

  // Deploy Aave USDC token
  if (ausdcTokenAddress) {
    console.log(
      `Using deployed ${AUSDC_TOKEN_CONTRACT} at ${ausdcTokenAddress}`
    );
  } else {
    console.log(`Deploying ${AUSDC_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDC_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    ausdcTokenAddress = tx.address;
  }

  // Deploy Aave USDT token
  if (ausdtTokenAddress) {
    console.log(
      `Using deployed ${AUSDT_TOKEN_CONTRACT} at ${ausdtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${AUSDT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    ausdtTokenAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave stable debt tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave DAI stable debt token
  if (adaiStableDebtTokenAddress) {
    console.log(
      `Using deployed ${ADAI_STABLE_DEBT_TOKEN_CONTRACT} at ${adaiStableDebtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${ADAI_STABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(ADAI_STABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_STABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    adaiStableDebtTokenAddress = tx.address;
  }

  // Deploy Aave USDC stable debt token
  if (ausdcStableDebtTokenAddress) {
    console.log(
      `Using deployed ${AUSDC_STABLE_DEBT_TOKEN_CONTRACT} at ${ausdcStableDebtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${AUSDC_STABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDC_STABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_STABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    ausdcStableDebtTokenAddress = tx.address;
  }

  // Deploy Aave USDT stable debt token
  if (ausdtStableDebtTokenAddress) {
    console.log(
      `Using deployed ${AUSDT_STABLE_DEBT_TOKEN_CONTRACT} at ${ausdtStableDebtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${AUSDT_STABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDT_STABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_STABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    ausdtStableDebtTokenAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave variable debt tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Aave DAI variable debt token
  if (adaiVariableDebtTokenAddress) {
    console.log(
      `Using deployed ${ADAI_VARIABLE_DEBT_TOKEN_CONTRACT} at ${adaiVariableDebtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${ADAI_VARIABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(ADAI_VARIABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    adaiVariableDebtTokenAddress = tx.address;
  }

  // Deploy Aave USDC variable debt token
  if (ausdcVariableDebtTokenAddress) {
    console.log(
      `Using deployed ${AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT} at ${ausdcVariableDebtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT}`);
    const tx = await deploy(AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    ausdcVariableDebtTokenAddress = tx.address;
  }

  // Deploy Aave USDT variable debt token
  if (ausdtVariableDebtTokenAddress) {
    console.log(
      `Using deployed ${AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT} at ${ausdtVariableDebtTokenAddress}`
    );
  } else {
    console.log(`Deploying ${AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT}`);

    const tx = await deploy(AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT, {
      ...opts,
      contract: AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
      deterministicDeployment: false,
    });
    ausdtVariableDebtTokenAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Aave interest rate strategy
  //
  //////////////////////////////////////////////////////////////////////////////

  // TODO: Move to constants
  const RAY = ethers.BigNumber.from(10).pow(27);

  // Deploy Aave interest rate strategy
  if (aaveInterestRateStrategyAddress) {
    console.log(
      `Using deployed ${AAVE_INTEREST_RATE_STRATEGY_CONTRACT} at ${aaveInterestRateStrategyAddress}`
    );
  } else {
    console.log(`Deploying ${AAVE_INTEREST_RATE_STRATEGY_CONTRACT}`);
    const tx = await deploy(AAVE_INTEREST_RATE_STRATEGY_CONTRACT, {
      ...opts,
      args: [
        aaveAddressConfigAddress, // provider
        RAY.div(2), // optimal usage ratio
        0, // base variable borrow rate
        0, // variable rate slope 1
        0, // variable rate slope 2
        0, // stable rate slope 1
        0, // stable rate slope 2
      ],
    });
    aaveInterestRateStrategyAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy mock Aave incentives controller
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy mock Aave incentives controller
  if (aaveIncentivesControllerAddress) {
    console.log(
      `Using deployed ${AAVE_INCENTIVES_CONTROLLER_CONTRACT} at ${aaveIncentivesControllerAddress}`
    );
  } else {
    console.log(`Deploying ${AAVE_INCENTIVES_CONTROLLER_CONTRACT}`);
    const tx = await deploy(AAVE_INCENTIVES_CONTROLLER_CONTRACT, opts);
    aaveIncentivesControllerAddress = tx.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy mock Aave lending rate oracle
  //
  //////////////////////////////////////////////////////////////////////////////

  // Deploy mock Aave lending rate oracle
  if (aaveLendingRateOracleAddress) {
    console.log(
      `Using deployed ${AAVE_LENDING_RATE_ORACLE_CONTRACT} at ${aaveLendingRateOracleAddress}`
    );
  } else {
    console.log(`Deploying ${AAVE_LENDING_RATE_ORACLE_CONTRACT}`);
    const tx = await deploy(AAVE_LENDING_RATE_ORACLE_CONTRACT, {
      ...opts,
      args: [deployer],
    });
    aaveLendingRateOracleAddress = tx.address;
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
    aavePoolAddress
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
    aavePoolConfigAddress
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
    aaveLendingRateOracleAddress
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
    daiTokenAddress,
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
    usdcTokenAddress,
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
    usdtTokenAddress,
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
      aaveAddressConfigAddress
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
    aavePoolAddress,
    AavePoolAbi,
    deployerSigner
  );

  const initTx = await aavePoolContract.initialize(aaveAddressConfigAddress);
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

  if (reserves.includes(daiTokenAddress)) {
    console.log("aDAI token already initialized");
  } else {
    console.log("Initializing aDAI token");

    initInputParams.push({
      aTokenImpl: adaiTokenAddress,
      stableDebtTokenImpl: adaiStableDebtTokenAddress,
      variableDebtTokenImpl: adaiVariableDebtTokenAddress,
      underlyingAssetDecimals: 18,
      interestRateStrategyAddress: aaveInterestRateStrategyAddress,
      underlyingAsset: daiTokenAddress,
      treasury: aaveTreasury,
      incentivesController: aaveIncentivesControllerAddress,
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

  if (reserves.includes(usdcTokenAddress)) {
    console.log("aUSDC token already initialized");
  } else {
    console.log("Initializing aUSDC token");

    initInputParams.push({
      aTokenImpl: ausdcTokenAddress,
      stableDebtTokenImpl: ausdcStableDebtTokenAddress,
      variableDebtTokenImpl: ausdcVariableDebtTokenAddress,
      underlyingAssetDecimals: 6,
      interestRateStrategyAddress: aaveInterestRateStrategyAddress,
      underlyingAsset: usdcTokenAddress,
      treasury: aaveTreasury,
      incentivesController: aaveIncentivesControllerAddress,
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

  if (reserves.includes(usdtTokenAddress)) {
    console.log("aUSDT token already initialized");
  } else {
    console.log("Initializing aUSDT token");

    initInputParams.push({
      aTokenImpl: ausdtTokenAddress,
      stableDebtTokenImpl: ausdtStableDebtTokenAddress,
      variableDebtTokenImpl: ausdtVariableDebtTokenAddress,
      underlyingAssetDecimals: 6,
      interestRateStrategyAddress: aaveInterestRateStrategyAddress,
      underlyingAsset: usdtTokenAddress,
      treasury: aaveTreasury,
      incentivesController: aaveIncentivesControllerAddress,
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

  const daiReserve = await aavePoolContract.getReserveData(daiTokenAddress);

  const adaiTokenProxyAddress = daiReserve[7];
  const adaiStableDebtTokenProxyAddress = daiReserve[8];
  const adaiVariableDebtTokenProxyAddress = daiReserve[9];

  //
  // aUSDC
  //

  const usdcReserve = await aavePoolContract.getReserveData(usdcTokenAddress);

  const ausdcTokenProxyAddress = usdcReserve[7];
  const ausdcStableDebtTokenProxyAddress = usdcReserve[8];
  const ausdcVariableDebtTokenProxyAddress = usdcReserve[9];

  //
  // aUSDT
  //

  const usdtReserve = await aavePoolContract.getReserveData(usdtTokenAddress);

  const ausdtTokenProxyAddress = usdtReserve[7];
  const ausdtStableDebtTokenProxyAddress = usdtReserve[8];
  const ausdtVariableDebtTokenProxyAddress = usdtReserve[9];

  //////////////////////////////////////////////////////////////////////////////
  // Record addresses
  //////////////////////////////////////////////////////////////////////////////

  writeAddress(network, AAVE_POOL_CONTRACT, aavePoolAddress);
  writeAddress(network, DAI_TOKEN_CONTRACT, daiTokenAddress);
  writeAddress(network, USDC_TOKEN_CONTRACT, usdcTokenAddress);
  writeAddress(network, USDT_TOKEN_CONTRACT, usdtTokenAddress);
  writeAddress(network, ADAI_TOKEN_PROXY_CONTRACT, adaiTokenProxyAddress);
  writeAddress(network, AUSDC_TOKEN_PROXY_CONTRACT, ausdcTokenProxyAddress);
  writeAddress(network, AUSDT_TOKEN_PROXY_CONTRACT, ausdtTokenProxyAddress);
};

module.exports = func;
module.exports.tags = ["Aave"];
