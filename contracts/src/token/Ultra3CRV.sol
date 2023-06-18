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
contract Ultra3CRV is AccessControl, ERC20 {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The ERC 20 token name used by wallets to identify the token
   */
  string private constant TOKEN_NAME = "Ultrachess staked am3CRV";

  /**
   * @dev The ERC 20 token symbol used as an abbreviation of the token, such
   * as BTC, ETH, AUG or SJCX.
   */
  string private constant TOKEN_SYMBOL = "ultra3CRV";

  //////////////////////////////////////////////////////////////////////////////
  // Roles
  //////////////////////////////////////////////////////////////////////////////

  // Only ISSUERS can mint and destroy tokens
  bytes32 public constant ISSUER_ROLE = "ISSUER_ROLE";

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
    _grantRole(DEFAULT_ADMIN_ROLE, owner_);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Issuer functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Mints new tokens
   *
   * @param account The account to mint tokens to
   * @param amount The amount of tokens to mint
   */
  function mint(address account, uint256 amount) public {
    // Validate access
    require(hasRole(ISSUER_ROLE, _msgSender()), "Not issuer");

    // Validate parameters
    require(account != address(0), "Invalid account");

    // Mint tokens
    _mint(account, amount);
  }

  /**
   * @dev Burns tokens
   *
   * @param account The account to burn tokens from
   * @param amount The amount of tokens to burn
   */
  function burn(address account, uint256 amount) public {
    // Validate access
    require(hasRole(ISSUER_ROLE, _msgSender()), "Not issuer");

    // Validate parameters
    require(account != address(0), "Invalid account");

    // Burn tokens
    _burn(account, amount);
  }
}
