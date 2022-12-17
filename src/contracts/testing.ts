/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// Contract ABIs and artifacts (sort by path)
import daiTokenAbi from "../abi/contracts/test/token/DAI.sol/DAI.json";
import usdcTokenAbi from "../abi/contracts/test/token/USDC.sol/USDC.json";
import usdtTokenAbi from "../abi/contracts/test/token/USDT.sol/USDT.json";

// Contract names (sort by constant)
const DAI_TOKEN_CONTRACT = "DAI";
const USDC_TOKEN_CONTRACT = "USDC";
const USDT_TOKEN_CONTRACT = "USDT";

export {
  daiTokenAbi,
  usdcTokenAbi,
  usdtTokenAbi,
  DAI_TOKEN_CONTRACT,
  USDC_TOKEN_CONTRACT,
  USDT_TOKEN_CONTRACT,
};
