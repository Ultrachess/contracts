/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

import {IUniswapV3Factory} from "../../interfaces/uniswap-v3-core/IUniswapV3Factory.sol";
import {IUniswapV3Pool} from "../../interfaces/uniswap-v3-core/IUniswapV3Pool.sol";

/**
 * @dev Test contract to create a Uniswap-V3 pool using a provided Uni-V3 factory
 *
 * This is a helper contract for the deployment of dependencies on test
 * networks. The pool is created in the constructor and stored in a member
 * variable so that it can be read back without the deployment system having
 * to parse transaction receipts.
 *
 * Note: Because upstream Uniswap sources are mixed with our own, a convention
 * is adopted to distinguish between the two. Uniswap sources are prefixed with
 * "uniswapv3" and our own are prefixed with "univ3".
 */
contract UniV3PoolFactory {
  /**
   * @dev The address of the pool for this token pair
   */
  IUniswapV3Pool public immutable uniswapV3Pool;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the test pool instance
   *
   * @param factory The contract address of the Uniswap V3 factory
   * @param baseToken The address of the base token
   * @param assetToken The address of the asset token
   * @param swapFee The fee collected upon every swap in the pool, denominated in
   *                hundredths of a bip
   */
  constructor(
    address factory,
    address baseToken,
    address assetToken,
    uint24 swapFee
  ) {
    // Validate parameters
    require(factory != address(0), "Invalid factory");
    require(baseToken != address(0), "Invalid base");
    require(assetToken != address(0), "Invalid asset");

    // Call external contracts
    uniswapV3Pool = IUniswapV3Pool(
      IUniswapV3Factory(factory).createPool(baseToken, assetToken, swapFee)
    );
  }
}
