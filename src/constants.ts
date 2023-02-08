/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

//
// Constants
//

const enum FEE_AMOUNT {
  LOW = 500, // 0.05%
  MEDIUM = 3_000, // 0.3%
  HIGH = 10_000, // 1%
}

const TICK_SPACINGS: { [amount in FEE_AMOUNT]: number } = {
  [FEE_AMOUNT.LOW]: 10,
  [FEE_AMOUNT.MEDIUM]: 60,
  [FEE_AMOUNT.HIGH]: 200,
};

export { FEE_AMOUNT, TICK_SPACINGS };
