/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import {INonfungiblePositionManager} from "../../interfaces/uniswap-v3-periphery/INonfungiblePositionManager.sol";

import {ERC1155Enumberable} from "./extensions/ERC1155Enumerable.sol";

/**
 * @dev Implementation of the https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Semi-fungible Token Standard
 */
contract LpSft is AccessControl, ERC1155Enumberable {
  //////////////////////////////////////////////////////////////////////////////
  // Roles
  //////////////////////////////////////////////////////////////////////////////

  // Only ISSUERS can mint and destroy tokens
  bytes32 public constant ISSUER_ROLE = "ISSUER_ROLE";

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Uniswap V3 NFT manager
   */
  INonfungiblePositionManager public immutable uniswapV3NftManager;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the ERC-1155 contract
   *
   * @param owner_ The owner of the ERC-1155 contract
   * @param uniswapV3NftManager_ The Uniswap V3 NFT manager
   */
  constructor(address owner_, address uniswapV3NftManager_) ERC1155("") {
    // Validate parameters
    require(owner_ != address(0), "Invalid owner");
    require(uniswapV3NftManager_ != address(0), "Invalid mgr");

    // Initialize {AccessControl}
    _grantRole(DEFAULT_ADMIN_ROLE, owner_);

    // Initialize state
    uniswapV3NftManager = INonfungiblePositionManager(uniswapV3NftManager_);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC165} via {AccessControl} and {ERC1155Enumerable}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC165-supportsInterface}
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view override(AccessControl, ERC1155) returns (bool) {
    return
      AccessControl.supportsInterface(interfaceId) ||
      ERC1155.supportsInterface(interfaceId);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155MetadataURI} via {ERC1155}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155MetadataURI-uri}
   */
  function uri(
    uint256 sftTokenId
  ) public view override returns (string memory) {
    return uniswapV3NftManager.tokenURI(sftTokenId);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Issuer functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Mints a new LP SFT
   *
   * @param account The account to mint an LP SFT to
   * @param sftTokenId The token ID of the minted LP SFT
   */
  function mint(address account, uint256 sftTokenId) external {
    // Validate access
    require(hasRole(ISSUER_ROLE, _msgSender()), "Not issuer");

    // Validate parameters
    require(account != address(0), "Invalid account");

    // Call ancestor
    _mint(account, sftTokenId, 1, "");
  }

  /**
   * @dev Mints a batch of LP SFTs
   *
   * @param account The account to mint SFTs to
   * @param sftTokenIds The token IDs of the minted SFTs
   *
   * Note: This function does not place a limit on the number of LP SFTs that
   * can be minted in a single transaction. The number of LP SFTs to mint can
   * exceed the block gas limit, denying the transaction from completing.
   */
  function mintBatch(address account, uint256[] memory sftTokenIds) external {
    // Validate access
    require(hasRole(ISSUER_ROLE, _msgSender()), "Not issuer");

    // Validate parameters
    require(account != address(0), "Invalid account");
    require(sftTokenIds.length > 0, "No IDs");

    // Translate parameters
    uint256[] memory tokenAmounts = _getAmountArray(sftTokenIds.length);

    // Call ancestor
    _mintBatch(account, sftTokenIds, tokenAmounts, "");
  }

  /**
   * @dev Burns an existing LP SFT
   *
   * @param account The account to burn an LP SFT from
   * @param sftTokenId The token ID of the LP SFT to burn
   */
  function burn(address account, uint256 sftTokenId) external {
    // Validate access
    require(hasRole(ISSUER_ROLE, _msgSender()), "Not issuer");

    // Validate parameters
    require(account != address(0), "Invalid account");

    // Call ancestor
    _burn(account, sftTokenId, 1);
  }

  /**
   * @dev Burns a batch of existing LP SFTs
   *
   * @param account The account to burn LP SFTs from
   * @param sftTokenIds The token IDs of the LP SFTs to burn
   *
   * Note: This function does not place a limit on the number of LP SFTs that
   * can be burned in a single transaction. The number of LP SFTs to burn can
   * exceed the block gas limit, denying the transaction from completing.
   */
  function burnBatch(address account, uint256[] memory sftTokenIds) external {
    // Validate access
    require(hasRole(ISSUER_ROLE, _msgSender()), "Not issuer");

    // Validate parameters
    require(account != address(0), "Invalid account");
    require(sftTokenIds.length > 0, "No IDs");

    // Translate parameters
    uint256[] memory tokenAmounts = _getAmountArray(sftTokenIds.length);

    // Call ancestor
    _burnBatch(account, sftTokenIds, tokenAmounts);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get an amounts array suitable for NFTs (where the total supply of
   * each token is 1)
   */
  function _getAmountArray(
    uint256 tokenCount
  ) private pure returns (uint256[] memory) {
    uint256[] memory array = new uint256[](tokenCount);

    for (uint256 i = 0; i < tokenCount; i++) {
      array[i] = 1;
    }

    return array;
  }
}
