/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import bn from "bignumber.js";
import { ethers } from "ethers";

// Setup bn.js
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

function decodeX128Int(x128Int: ethers.BigNumber): ethers.BigNumber {
  return ethers.BigNumber.from(x128Int).div(ethers.BigNumber.from(2).pow(128));
}

// Returns the sqrt price as a 64x96
function encodePriceSqrt(
  reserve1: ethers.BigNumber,
  reserve0: ethers.BigNumber
): ethers.BigNumber {
  return ethers.BigNumber.from(
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  );
}

export { decodeX128Int, encodePriceSqrt };
