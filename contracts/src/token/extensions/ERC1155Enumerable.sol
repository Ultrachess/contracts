/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.16;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @dev Implementation of the https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Semi-fungible Token Standard
 *
 * This contract is analogous to the OpenZeppelin ERC721Enumerable contract. It
 * enforces the constraint that all SFTs are NFTs (they are unique with a total
 * supply of 1).
 */
abstract contract ERC1155Enumberable is ERC1155 {
  using EnumerableSet for EnumerableSet.UintSet;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Mapping from token ID to owner
   */
  mapping(uint256 => address) private _tokenOwner;

  /**
   * @dev Mapping from owner to owned token IDs
   */
  mapping(address => EnumerableSet.UintSet) private _ownedTokens;

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC1155}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155-_beforeTokenTransfer}
   */
  function _beforeTokenTransfer(
    address,
    address from,
    address to,
    uint256[] memory sftTokenIds,
    uint256[] memory sftTokenAmounts,
    bytes memory
  ) internal override {
    // Translate parameters
    uint256 tokenCount = sftTokenIds.length;

    for (uint256 i = 0; i < tokenCount; i++) {
      // Translate parameters
      uint256 sftTokenId = sftTokenIds[i];

      // Validate parameters
      require(sftTokenAmounts[i] == 1, "Invalid amount");

      // Handle minting
      if (from == address(0)) {
        // Validate state
        require(_tokenOwner[sftTokenId] == address(0), "Already minted");

        // Update state
        _tokenOwner[sftTokenId] = to;
        require(_ownedTokens[to].add(sftTokenId), "Already added");
      }

      // Handle transfer
      if (from != address(0) && to != address(0)) {
        // Validate state
        require(_tokenOwner[sftTokenId] == from, "Invalid owner");

        // Update state
        _tokenOwner[sftTokenId] = to;
        require(_ownedTokens[from].remove(sftTokenId), "Already removed");
        require(_ownedTokens[to].add(sftTokenId), "Already added");
      }

      // Handle burning
      if (to == address(0)) {
        // Validate state
        require(_tokenOwner[sftTokenId] == from, "Invalid owner");

        // Update state
        _tokenOwner[sftTokenId] = address(0);
        require(_ownedTokens[from].remove(sftTokenId), "Already removed");
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // External accessors
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Returns the owner of the NFT specified by `tokenId`
   *
   * @param stfTokenId The ID of the LP SFT token
   *
   * @return owner_ The owner of the token, or `address(0)` if the token does
   *                not exist
   */
  function ownerOf(uint256 stfTokenId) public view returns (address owner_) {
    // Read state
    owner_ = _tokenOwner[stfTokenId];

    return owner_;
  }

  /**
   * @dev Return all token IDs owned by account
   *
   * @param account The account to query
   *
   * @return sftTokenIds The token IDs owned by the account
   */
  function getTokenIds(
    address account
  ) public view returns (uint256[] memory sftTokenIds) {
    // Load state
    EnumerableSet.UintSet storage ownedTokens = _ownedTokens[account];

    // Read state
    sftTokenIds = ownedTokens.values();

    return sftTokenIds;
  }
}
