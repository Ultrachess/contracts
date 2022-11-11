/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// slither-disable-next-line solc-version
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Extension of OpenZeppelin's {ERC20} that allows anyone to mint tokens
 * to arbitrary accounts.
 *
 * FOR TESTING ONLY.
 */
abstract contract TestERC20Mintable is ERC20 {
  //////////////////////////////////////////////////////////////////////////////
  // Minting interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Creates `amount` tokens and assigns them to `account`, increasing
   * the total supply.
   */
  function mint(address account, uint256 amount) external {
    // Call ancestor
    _mint(account, amount);
  }
}
