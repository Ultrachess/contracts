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

// Mainnet address: 0xdac17f958d2ee523a2206206994597c13d831ec7
contract USDT is TestERC20Mintable {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The ERC 20 token name used by wallets to identify the token
   */
  string private constant TOKEN_NAME = "Funny Tether USD";

  /**
   * @dev The ERC 20 token symbol used as an abbreviation of the token, such
   * as BTC, ETH, AUG or SJCX.
   */
  string private constant TOKEN_SYMBOL = "USDT";

  /**
   * @dev The number of decimals, typically 18 for most ERC-20 tokens
   */
  uint8 private constant DECIMALS = 6;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the token with a name and symbol
   */
  // solhint-disable-next-line no-empty-blocks
  constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL) {}

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC20Metadata} via {TestERC20Mintable}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC20Metadata-decimals}
   */
  // slither-disable-next-line external-function
  function decimals() public pure override returns (uint8) {
    return DECIMALS;
  }
}
