/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// slither-disable-next-line solc-version
pragma solidity >=0.8.0;

import "./utils/TestERC20Mintable.sol";

// Mainnet address: 0x6b175474e89094c44da98b954eedeac495271d0f
contract DAI is TestERC20Mintable {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The ERC 20 token name used by wallets to identify the token
   */
  string private constant TOKEN_NAME = "Funny Dai Stablecoin";

  /**
   * @dev The ERC 20 token symbol used as an abbreviation of the token, such
   * as BTC, ETH, AUG or SJCX.
   */
  string private constant TOKEN_SYMBOL = "DAI";

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the token with a name and symbol
   */
  // solhint-disable-next-line no-empty-blocks
  constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL) {}
}
