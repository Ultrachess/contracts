/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// slither-disable-next-line solc-version
pragma solidity >=0.8.0;

import "../../depends/canonical-weth/WETH9.sol";

/**
 * @dev W-ETH token for testing
 */
contract WETH is WETH9 {
    /**
     * @dev Constructor
     */
    constructor() {
        // Initialize {WETH9}
        name = "Funny Wrapped Ethereum";
        symbol = "W-ETH";
    }
}
