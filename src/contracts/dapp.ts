/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// Contract ABIs and artifacts (sort by path)
import baseTokenAbi from "../abi/contracts/src/token/CHESS.sol/CHESS.json";
import lpSftAbi from "../abi/contracts/src/token/LpSft.sol/LpSft.json";
import curveAavePoolerAbi from "../abi/contracts/src/token/routes/CurveAavePooler.sol/CurveAavePooler.json";
import curveAaveStakerAbi from "../abi/contracts/src/token/routes/CurveAaveStaker.sol/CurveAaveStaker.json";
import uniV3PoolerAbi from "../abi/contracts/src/token/routes/UniV3Pooler.sol/UniV3Pooler.json";
import uniV3StakerAbi from "../abi/contracts/src/token/routes/UniV3Staker.sol/UniV3Staker.json";
import uniV3SwapperAbi from "../abi/contracts/src/token/routes/UniV3Swapper.sol/UniV3Swapper.json";
import assetTokenAbi from "../abi/contracts/src/token/Ultra3CRV.sol/Ultra3CRV.json";

// Contract names (sort by constant)
const ASSET_TOKEN_CONTRACT = "Ultra3CRV";
const BASE_TOKEN_CONTRACT = "CHESS";
const CURVE_AAVE_POOLER_CONTRACT = "CurveAavePooler";
const CURVE_AAVE_STAKER_CONTRACT = "CurveAaveStaker";
const LP_SFT_CONTRACT = "LpSft";
const UNI_V3_POOL_FACTORY_CONTRACT = "UniV3PoolFactory";
const UNI_V3_POOLER_CONTRACT = "UniV3Pooler";
const UNI_V3_STAKER_CONTRACT = "UniV3Staker";
const UNI_V3_SWAPPER_CONTRACT = "UniV3Swapper";

export {
  baseTokenAbi,
  lpSftAbi,
  curveAavePoolerAbi,
  curveAaveStakerAbi,
  uniV3PoolerAbi,
  uniV3StakerAbi,
  uniV3SwapperAbi,
  assetTokenAbi,
  ASSET_TOKEN_CONTRACT,
  BASE_TOKEN_CONTRACT,
  CURVE_AAVE_POOLER_CONTRACT,
  CURVE_AAVE_STAKER_CONTRACT,
  LP_SFT_CONTRACT,
  UNI_V3_POOL_FACTORY_CONTRACT,
  UNI_V3_POOLER_CONTRACT,
  UNI_V3_STAKER_CONTRACT,
  UNI_V3_SWAPPER_CONTRACT,
};
