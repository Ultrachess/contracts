/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// solhint-disable-next-line compiler-version
pragma solidity >=0.7.0;

import "../../depends/uniswap-v3-core/UniswapV3Factory.sol";
import "../../depends/uniswap-v3-core/UniswapV3Pool.sol";

/**
 * @dev Test contract to create a Uniswap-V3 pool using a provided Uni-V3 factory
 *
 * This is a helper contract for the deployment of dependencies on test
 * networks. The pool is created in the constructor and stored in a member
 * variable so that it can be read back without the deployment system having
 * to parse transaction receipts.
 */
contract WrappedMCV2PoolFactory {
    /**
     * @dev The address of the pool for this token pair
     */
    UniswapV3Pool public immutable uniV3Pool;

    //////////////////////////////////////////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Construct the test pool instance
     *
     * @param factory The contract address of the Uniswap V3 factory
     * @param token0 The first token of the pool by address sort order
     * @param token1 The second token of the pool by address sort order
     * @param fee The fee collected upon every swap in the pool, denominated in hundredths of a bip
     */
    constructor(address factory, address token0, address token1, uint24 fee) {
        // Validate parameters
        require(factory != address(0), "Invalid factory");
        require(token0 != address(0), "Invalid token0");
        require(token1 != address(0), "Invalid token1");

        // Call external contracts
        uniV3Pool = UniswapV3Pool(
            UniswapV3Factory(factory).createPool(token0, token1, fee)
        );
    }
}
