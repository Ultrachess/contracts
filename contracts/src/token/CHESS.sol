/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Implementation of the https://eips.ethereum.org/EIPS/eip-20[ERC20] Token
 * Standard
 */
contract CHESS is AccessControl, ERC20 {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The ERC 20 token name used by wallets to identify the token
   */
  string private constant TOKEN_NAME = "Ultrachess Token";

  /**
   * @dev The ERC 20 token symbol used as an abbreviation of the token, such
   * as BTC, ETH, AUG or SJCX.
   */
  string private constant TOKEN_SYMBOL = "CHESS";

  uint8 public constant DECIMALS = 18;

  uint256 public constant INITIAL_SUPPLY = 10_000 * (10 ** uint256(DECIMALS)); // 10,000 tokens

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the ERC-20 token with a name and symbol
   *
   * @param owner_ The owner of the token
   */
  constructor(address owner_) ERC20(TOKEN_NAME, TOKEN_SYMBOL) {
    // Validate parameters
    require(owner_ != address(0), "Invalid owner");

    // Initialize {AccessControl}
    _setupRole(DEFAULT_ADMIN_ROLE, owner_);

    // Mint the initial supply to the owner
    _mint(owner_, INITIAL_SUPPLY);
  }
}
