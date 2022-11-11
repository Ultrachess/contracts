/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity >=0.8.0;

import "../../depends/sushiswap/uniswapv2/interfaces/IUniswapV2Factory.sol";

/**
 * @dev Test contract to create an LP pair using a provided Uni-V2 factory
 *
 * This is a helper contract for the deployment of dependencies on test
 * networks. The LP pair is created in the constructor and stored in a member
 * variable so that it can be read back without the deployment system having
 * to parse transaction receipts.
 */
contract UniV2PoolFactory {
    /**
     * @dev The address of the LP contract for this token
     */
    address public immutable uniV2Pair;

    /**
     * @dev Construct the test factory instance
     *
     * @param uniV2Factory The address of the Uni-V2 factory contract
     * @param tokenA The address of the first token to add to the LP pair
     * @param tokenB The address of the second token to add to the LP pair
     */
    constructor(address uniV2Factory, address tokenA, address tokenB) {
        // Validate paremeters
        require(uniV2Factory != address(0), "Invalid Uni-V2 factory");
        require(tokenA != address(0), "Invalid token A");
        require(tokenB != address(0), "Invalid token B");

        // Create the Uni-V2 liquidity pool and record the LP token's address
        uniV2Pair = IUniswapV2Factory(uniV2Factory).createPair(tokenA, tokenB);
    }
}
