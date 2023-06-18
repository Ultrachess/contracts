/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

/**
 * @dev Token router to liquidity to the Uniswap V3 pool in exchange for an
 * LP NFT
 */
abstract contract IUniV3Pooler {
  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when a Uniswap V3 LP NFT is minted
   *
   * @param sender The sender of the underlying stablecoins
   * @param recipient The address of the recipient of the LP NFT
   * @param nftAddress The address of the NFT manager contract
   * @param nftTokenId The ID of the NFT
   * @param stableAmounts The amounts of stablecoins spent on the NFT
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param baseTokenAmount The amount of base tokens spent on the NFT
   * @param baseTokenShare The amount of base tokens in the NFT
   * @param assetTokenShare The amount of asset tokens in the NFT
   * @param liquidityAmount The amount of liquidity created
   */
  event NFTMinted(
    address indexed sender,
    address indexed recipient,
    address nftAddress,
    uint256 nftTokenId,
    uint256[3] stableAmounts,
    uint256 baseTokenAmount,
    uint256 baseTokenShare,
    uint256 assetTokenShare,
    uint256 liquidityAmount
  );

  /**
   * @dev Emitted when fees are collected from a Uniswap V3 LP NFT
   *
   * @param sender The sender of the collection requiest
   * @param recipient The address of the recipient of the LP NFT
   * @param nftAddress The address of the NFT manager contract
   * @param nftTokenId The ID of the NFT
   * @param liquidityAmount The amount of liquidity in the NFT before collection
   * @param baseTokensCollected The amount of base token fees collected
   * @param assetTokensCollected The amount of asset token fees collected
   * @param stableIndex The index of the stablecoin to collect fees into
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stablesReturned The amount of stablecoins returned to the recipient
   */
  event NFTCollected(
    address indexed sender,
    address indexed recipient,
    address nftAddress,
    uint256 nftTokenId,
    uint256 liquidityAmount,
    uint256 baseTokensCollected,
    uint256 assetTokensCollected,
    uint256 stableIndex,
    uint256 stablesReturned
  );

  //////////////////////////////////////////////////////////////////////////////
  // External interface for adding liquidity
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Mints a Uniswap V3 LP NFT and deposits liquidity into the pool
   *
   * A one-sided swap will occur, allowing unequal amounts of tokens to be
   * deposited. The direction of the swap is determined by which of the
   * swap amounts is non-zero.
   *
   * @param stableAmounts The amounts of underlying stablecoins to deposit
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param assetSwapAmount The amount of the asset token to swap for the base
   *                        token
   * @param baseTokenAmount The amount of the base token to deposit
   * @param baseSwapAmount The amount of the base token to swap for the asset
   *                       token
   * @param recipient The recient of the LP NFT
   *
   * @return nftTokenId The ID of the minted NFT
   */
  function mintNFT(
    uint256[3] memory stableAmounts,
    uint256 assetSwapAmount,
    uint256 baseTokenAmount,
    uint256 baseSwapAmount,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints an LP NFT and deposits liquidity into the pool using stablecoins
   *
   * @param stableAmounts The amounts of stablecoins to use
   * @param recipient The recipient of the LP NFT
   *
   * @return nftTokenId The ID of the minted NFT
   */
  function mintNFTWithStables(
    uint256[3] memory stableAmounts,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints an LP NFT and deposits liquidity into the pool using base tokens
   *
   * @param baseTokenAmount The amounts of base tokens to deposit
   * @param recipient The recipient of the LP NFT
   *
   * @return nftTokenId The ID of the minted NFT
   */
  function mintNFTWithBaseToken(
    uint256 baseTokenAmount,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints an LP NFT and deposits liquidity into the pool using a single
   * stablecoin
   *
   * @param stableIndex The index of the stablecoin to use
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stableAmount The amount of the stablecoin to use
   *
   * @return nftTokenId The ID of the minted NFT
   */
  function mintNFTOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints a Uniswap V3 LP NFT and deposits liquidity into the pool
   * without performing a one-sided token swap
   *
   * @param stableAmounts The amounts of underlying stablecoins to deposit
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param baseTokenAmount The amount of the base token to deposit
   * @param recipient The recient of the LP NFT
   *
   * @return nftTokenId The ID of the minted NFT
   */
  function mintNFTImbalance(
    uint256[3] memory stableAmounts,
    uint256 baseTokenAmount,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  //////////////////////////////////////////////////////////////////////////////
  // External interface for removing liquidity
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Collects the fees from an LP NFT and returns the underlying
   * stablecoins and LP NFT to the recipient
   *
   * @param nftTokenId The ID of the LP NFT
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param recipient The recipient of the fees and the LP NFT
   *
   * @return stablesReturned The amount of stablecoins returned to the recipient
   */
  function collectFromNFT(
    uint256 nftTokenId,
    uint256 stableIndex,
    address recipient
  ) external virtual returns (uint256 stablesReturned);

  /**
   * @dev Collects everything and returns the LP NFT in one transaction
   *
   * @param nftTokenId The ID of the LP NFT
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   *
   * @return stablesReturned The amount of stablecoins returned to the sender
   */
  function exitOneStable(
    uint256 nftTokenId,
    uint256 stableIndex
  ) external virtual returns (uint256 stablesReturned);
}
