/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev SUSHI token for testing
 */
contract SUSHI is ERC20 {
    //////////////////////////////////////////////////////////////////////////////
    // Constants
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev The ERC 20 token name used by wallets to identify the token
     */
    string private constant TOKEN_NAME = "Funny SushiToken";

    /**
     * @dev The ERC 20 token symbol used as an abbreviation of the token, such
     * as BTC, ETH, AUG or SJCX.
     */
    string private constant TOKEN_SYMBOL = "SUSHI";

    //////////////////////////////////////////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Initializes SUSHI with a name and symbol
     */
    // solhint-disable-next-line no-empty-blocks
    constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL) {}
}
