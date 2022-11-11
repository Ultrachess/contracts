/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity >=0.8.0;

import "../../depends/canonical-weth/WETH9.sol";

/**
 * @dev WMATIC token for testing
 */
contract WMATIC is WETH9 {
    //////////////////////////////////////////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Constructor
     */
    constructor() {
        // Initialize {WETH9}
        name = "Funny Wrapped Matic";
        symbol = "WMATIC";
    }
}
