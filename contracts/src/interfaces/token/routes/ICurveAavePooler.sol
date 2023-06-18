/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

/**
 * @dev Token router to add liquidity to the Curve Aave pool in exchange for
 * LP tokens
 *
 * This contract provides an interface for adding and removing liquidity in the
 * Curve Aave pool as a single transaction.
 */
abstract contract ICurveAavePooler {
  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when liquidity is added to the Curve Aave pool
   *
   * @param sender The sender of the underlying stablecoins
   * @param recipient The address of the recipient of the LP tokens
   * @param stableAmounts The amounts of stablecoins added to the pool
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param lpTokenAmount The amount of LP tokens received
   */
  event LiquidityAdded(
    address indexed sender,
    address indexed recipient,
    uint256[3] stableAmounts,
    uint256 lpTokenAmount
  );

  /**
   * @dev Emitted when liquidity is removed from the Curve Aave pool
   *
   * @param sender The sender
   * @param recipient The recipient of the underlying stablecoin
   * @param lpTokenAmount The amount of LP tokens burned
   * @param stableIndex The index of the stablecoin returned
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stablesReturned The amount of stablecoins returned to the
   *                        recipient
   */
  event LiquidityRemovedOneStable(
    address indexed sender,
    address indexed recipient,
    uint256 lpTokenAmount,
    uint256 stableIndex,
    uint256 stablesReturned
  );

  //////////////////////////////////////////////////////////////////////////////
  // External interface for adding liquidity
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Add an amount of underlying stablecoins to the pool and return the
   * LP tokens
   *
   * @param stableAmounts The amounts of the underlying stablecoins to add
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param minMintAmount The minimum amount of the LP token to mint
   * @param recipient The recipient of the CurveLP tokens
   *
   * @return lpTokenAmount The amount of LP tokens minted and returned to the
   *                       recipient
   */
  function addLiquidity(
    uint256[3] memory stableAmounts,
    uint256 minMintAmount,
    address recipient
  ) external virtual returns (uint256 lpTokenAmount);

  /**
   * @dev Add an amount of a single underlying stablecoin to the pool
   * return the LP tokens
   *
   * @param stableIndex The index of the stablecoin to add
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stableAmount The amount of the underlying stablecoin to add
   *
   * @return lpTokenAmount The amount of LP tokens minted and returned to the
   *                       recipient
   */
  function addLiquidityOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) external virtual returns (uint256 lpTokenAmount);

  //////////////////////////////////////////////////////////////////////////////
  // External interface for removing liquidity
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Remove an amount of LP tokens from the pool and return the amount as
   * a single token
   *
   * @param lpTokenAmount The amount of the LP token to remove
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param minTokenAmount The minimum amount of the token to receive
   * @param recipient The recipient of the underlying stablecoin
   *
   * @return stablesReturned The amount of the underlying stablecoin returned
   *                         to the recipient
   */
  function removeLiquidityOneStable(
    uint256 lpTokenAmount,
    uint256 stableIndex,
    uint256 minTokenAmount,
    address recipient
  ) external virtual returns (uint256 stablesReturned);

  /**
   * @dev Remove all liquidity as a single token in one function call
   *
   * @param stableIndex The index of the stablecoin to withdraw (0 = DAI, 1 = USDC, 2 = USDT)
   *
   * @return stablesReturned The amount of stablecoins returned to the sender
   */
  function exitOneStable(
    uint256 stableIndex
  ) external virtual returns (uint256 stablesReturned);

  //////////////////////////////////////////////////////////////////////////////
  // External interface for reading state
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get the current virtual price of the pool LP token
   *
   * The virtual price in Curve is obtained through taking the invariance of
   * the pool, which by default takes every stablecoin as valued at 1.00 USD.
   *
   * The virtual price measures pool growth; this is not a dollar value.
   *
   * @return virtualPrice The LP token virtual price normalized to 1e18
   */
  function getVirtualPrice()
    external
    view
    virtual
    returns (uint256 virtualPrice);

  /**
   * @dev Get the amount of LP tokens that would be minted or burned for a
   * given amount of underlying stablecoins
   *
   * @param stableAmounts The amount of each underlying stablecoin to add
   *                      or remove
   * @param isDeposit True if the amounts are being added to the pool, false
   *                   if they are being removed
   *
   * @return mintAmount The amount of LP tokens that would be minted
   */
  function getLpAmount(
    uint256[3] memory stableAmounts,
    bool isDeposit
  ) external view virtual returns (uint256 mintAmount);

  /**
   * @dev Calculate the amount of underlying stablecoins that would be returned
   * for a given amount of LP tokens
   *
   * @param lpTokenAmount The amount of LP tokens to remove
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   *
   * @return stableAmount The amount of the underlying stablecoin that would
   *                      be returned
   */
  function getStableAmount(
    uint256 lpTokenAmount,
    uint256 stableIndex
  ) external view virtual returns (uint256 stableAmount);
}
