/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// Contract ABIs and artifacts (sort by path)
import curveTokenV3Artifact from "../../contracts/bytecode/curve/CurveTokenV3.json";
import stableSwapAaveArtifact from "../../contracts/bytecode/curve/StableSwapAave.json";
import erc20CrvArtifact from "../../contracts/bytecode/curve-dao/ERC20CRV.json";
import gaugeControllerArtifact from "../../contracts/bytecode/curve-dao/GaugeController.json";
import liquidityGaugeArtifact from "../../contracts/bytecode/curve-dao/LiquidityGauge.json";
import minterArtifact from "../../contracts/bytecode/curve-dao/Minter.json";
import votingEscrowArtifact from "../../contracts/bytecode/curve-dao/VotingEscrow.json";
import aavePoolAbi from "../abi/contracts/depends/aave-v2/protocol/lendingpool/LendingPool.sol/LendingPool.json";
import aTokenAbi from "../abi/contracts/depends/aave-v2/protocol/tokenization/AToken.sol/AToken.json";
import uniswapV3FactoryAbi from "../abi/contracts/depends/uniswap-v3-core/UniswapV3Factory.sol/UniswapV3Factory.json";
import uniswapV3PoolAbi from "../abi/contracts/depends/uniswap-v3-core/UniswapV3Pool.sol/UniswapV3Pool.json";
import uniswapV3NftManagerAbi from "../abi/contracts/depends/uniswap-v3-periphery/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import uniswapV3StakerAbi from "../abi/contracts/depends/uniswap-v3-staker/UniswapV3Staker.sol/UniswapV3Staker.json";

// Contract names (sort by constant)
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
const ADAI_STABLE_DEBT_TOKEN_CONTRACT = "ADAIStableDebt";
const ADAI_TOKEN_CONTRACT = "ADAI";
const ADAI_TOKEN_PROXY_CONTRACT = "ADAIProxy";
const ADAI_VARIABLE_DEBT_TOKEN_CONTRACT = "ADAIVariableDebt";
const AUSDC_STABLE_DEBT_TOKEN_CONTRACT = "AUSDCStableDebt";
const AUSDC_TOKEN_CONTRACT = "AUSDC";
const AUSDC_TOKEN_PROXY_CONTRACT = "AUSDCProxy";
const AUSDC_VARIABLE_DEBT_TOKEN_CONTRACT = "AUSDCVariableDebt";
const AUSDT_STABLE_DEBT_TOKEN_CONTRACT = "AUSDTStableDebt";
const AUSDT_TOKEN_CONTRACT = "AUSDT";
const AUSDT_TOKEN_PROXY_CONTRACT = "AUSDTProxy";
const AUSDT_VARIABLE_DEBT_TOKEN_CONTRACT = "AUSDTVariableDebt";
const CRV_CONTROLLER_CONTRACT = "CRVController";
const CRV_MINTER_CONTRACT = "CRVMinter";
const CRV_TOKEN_CONTRACT = "CRV";
const CRV_VOTING_CONTRACT = "CRVVoting";
const CURVE_AAVE_GAUGE_CONTRACT = "CurveAaveGauge";
const CURVE_AAVE_LP_TOKEN_CONTRACT = "CurveAaveLP";
const CURVE_AAVE_POOL_CONTRACT = "CurveAavePool";
const GENERIC_LOGIC_CONTRACT = "GenericLogic";
const NFT_DESCRIPTOR_CONTRACT = "NFTDescriptor";
const RESERVE_LOGIC_CONTRACT = "ReserveLogic";
const UNISWAP_V3_FACTORY_CONTRACT = "UniswapV3Factory";
const UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT = "NonfungibleTokenPositionDescriptor";
const UNISWAP_V3_NFT_MANAGER_CONTRACT = "NonfungiblePositionManager";
const UNISWAP_V3_POOL_CONTRACT = "UniswapV3Pool";
const UNISWAP_V3_STAKER_CONTRACT = "UniswapV3Staker";
const VALIDATION_LOGIC_CONTRACT = "ValidationLogic";
const WRAPPED_NATIVE_CONTRACT = "WETH";

export {
  curveTokenV3Artifact,
  stableSwapAaveArtifact,
  erc20CrvArtifact,
  gaugeControllerArtifact,
  liquidityGaugeArtifact,
  minterArtifact,
  votingEscrowArtifact,
  aavePoolAbi,
  aTokenAbi,
  uniswapV3FactoryAbi,
  uniswapV3PoolAbi,
  uniswapV3NftManagerAbi,
  uniswapV3StakerAbi,
  AAVE_ADDRESS_CONFIG_CONTRACT,
  AAVE_INCENTIVES_CONTROLLER_CONTRACT,
  AAVE_INTEREST_RATE_STRATEGY_CONTRACT,
  AAVE_LENDING_RATE_ORACLE_CONTRACT,
  AAVE_POOL_CONFIG_CONTRACT,
  AAVE_POOL_CONTRACT,
  AAVE_STABLE_DEBT_TOKEN_CONTRACT,
  AAVE_TOKEN_CONTRACT,
  AAVE_VARIABLE_DEBT_TOKEN_CONTRACT,
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
  CRV_CONTROLLER_CONTRACT,
  CRV_MINTER_CONTRACT,
  CRV_TOKEN_CONTRACT,
  CRV_VOTING_CONTRACT,
  CURVE_AAVE_GAUGE_CONTRACT,
  CURVE_AAVE_LP_TOKEN_CONTRACT,
  CURVE_AAVE_POOL_CONTRACT,
  GENERIC_LOGIC_CONTRACT,
  NFT_DESCRIPTOR_CONTRACT,
  RESERVE_LOGIC_CONTRACT,
  UNISWAP_V3_FACTORY_CONTRACT,
  UNISWAP_V3_NFT_DESCRIPTOR_CONTRACT,
  UNISWAP_V3_NFT_MANAGER_CONTRACT,
  UNISWAP_V3_POOL_CONTRACT,
  UNISWAP_V3_STAKER_CONTRACT,
  VALIDATION_LOGIC_CONTRACT,
  WRAPPED_NATIVE_CONTRACT,
};
