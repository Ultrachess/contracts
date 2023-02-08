/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.16;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @dev Liquidity math for computing the optimal one-sided supply to a
 * liquidity pool
 */
contract LiquidityMath {
  using SafeMath for uint256;

  /**
   * @dev Compute swap amount needed for adding liquidity to a pool in the
   * absence of concentrated liquidity (such as a Uniswap V2 pool)
   *
   * The goal is to find the optimal swapAmountA to get a corresponding amount
   * of asset B, so that the proportion of assets the user holds is equal to
   * the proportion of assets in reserves after swap.
   *
   * Calculation:
   *
   * The initial constant product is given by:
   *
   *   k = reserveA * reserveB
   *
   * The swap fee is deducted from the input asset amount, so the new reserveB
   * should satisfy:
   *
   *   k = (reserveA + (1 - fee) * swapA) * reserveB'
   *
   * This means the user will receive an amount of asset B equal to:
   *
   *   rcvAmountB = reserveB - reserveB'
   *
   *              = reserveB - k / (reserveA + (1 - fee) * swapA)
   *
   *              = reserveB - reserveA * reserveB / (reserveA + (1 - fee) * swapAmountA)
   *
   *              = (1 - fee) * reserveB * swapAmountA / (reserveA + (1 - fee) * swapAmountA)
   *
   * The optimal swapAmountA should satisfy the equality constraint on the
   * user's asset ratio and the reserve's asset ratio:
   *
   *   (amountA - swapAmountA) / (reserveA + swapAmountA) = rcvAmountB / reserveB'
   *
   * Substituting known variables rcvAmountB and reserveB' and rearranging the
   * equation yields a quadratic equation in variable swapAmountA as follows:
   *
   *   (1 - fee) * (swapAmountA)^2 + ((2 - fee) * reserveA) * swapAmountA - amountA * reserveA = 0
   *
   * Solving the above equation for a non-negative root yields:
   *
   *   swapAmountA =
   *     sqrt(((2 - fee) * reserveA)^2 + 4 * (1 - fee) * amountA * reserveA) - (2 - fee) * reserveA
   *       / (2 * (1 - fee))
   *
   * The fee is represented in hundredths of a bip, so we can avoid floating
   * point numbers by multiplying both the numerator and denominator by 1E6:
   *
   * swapAmountA =
   *   sqrt((2E6 - fee)^2 * reserveA^2 + 4 * 1E6 * (1E6 - fee) * amountA * reserveA) - (2E6 - fee) * reserveA
   *     / (2 * (1E6 - fee))
   *
   * Credit to Zapper Finance for the above derivation.
   *
   * @param reserveA The reserve of token A
   * @param amountA The amount of token A to add
   * @param swapfee The swap fee of the pool, denominated in hundredths of a bip
   *
   * @return swapAmountA The amount of token A to swap for token B
   */
  function computeSwapAmountV2(
    uint256 reserveA,
    uint256 amountA,
    uint24 swapfee
  ) public pure returns (uint256 swapAmountA) {
    // prettier-ignore
    swapAmountA = (
      Math.sqrt(
        (
          uint256(2E6).sub(swapfee).mul(
            uint256(2E6).sub(swapfee)
          ).mul(
            reserveA
          ).mul(
            reserveA
          )
        ).add(
          uint256(4).mul(
            uint256(1E6)
          ).mul(
            uint256(1E6).sub(swapfee)
          ).mul(
            amountA
          ).mul(
            reserveA
          )
        )
      ).sub(
        (
          uint256(2E6).sub(swapfee)
        ).mul(
          reserveA
        )
      )
    ).div(
      uint256(2).mul(
        uint256(1E6).sub(swapfee)
      )
    );

    return swapAmountA;
  }
}
