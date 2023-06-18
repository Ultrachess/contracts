/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

/**
 * @dev Token router to stake stablecoins to the Curve Aave gauge in exchange
 * for asset tokens
 *
 * This contract provides an interface for staking and unstaking stablecoins in
 * the Curve Aave gauge as a single transaction.
 *
 * TODO: Staking in the gauge generates rewards in the form of CRV tokens.
 * These tokens are yet not managed by this contract.
 */
abstract contract ICurveAaveStaker {
  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when stablecoins are staked to the Curve Aave gauge
   *
   * @param sender The sender of the underlying stablecoins
   * @param recipient The address of the recipient of the gauge shares
   * @param stableAmounts The amounts of stablecoins staked to the gauge
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param gaugeShares The amount of gauge shares received
   */
  event GaugeStaked(
    address indexed sender,
    address indexed recipient,
    uint256[3] stableAmounts,
    uint256 gaugeShares
  );

  /**
   * @dev Emitted when stablecoins are unstaked from the Curve Aave gauge
   *
   * @param sender The sender
   * @param recipient The address of the recipient of the single stablecoin
   * @param gaugeShares The amount of gauge shares unstaked from the gauge
   * @param stableIndex The index of the stablecoin to return
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stablesReturned The amount of stablecoins returned to the recipient
   */
  event GaugeUnstakedOneStable(
    address indexed sender,
    address indexed recipient,
    uint256 gaugeShares,
    uint256 stableIndex,
    uint256 stablesReturned
  );

  //////////////////////////////////////////////////////////////////////////////
  // External interface for staking
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Stake an amount of underlying stablecoins to the gauge and return
   * the asset token representing the staked amount
   *
   * @param stableAmounts The amounts of the underlying stablecoins to stake
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param recipient The recipient of the asset tokens
   *
   * @return assetTokenAmount The amount of gauge shares minted and returned
   * to the recipient
   */
  function stakeTokens(
    uint256[3] memory stableAmounts,
    address recipient
  ) external virtual returns (uint256 assetTokenAmount);

  /**
   * @dev Stake a single underlying stablecoin to the gauge and return the
   * gauge shares
   *
   * @param stableIndex The index of the stablecoin to stake
   *                    (DAI = 0, USDC = 1, USDT = 2)
   * @param stableAmount The amount of the underlying stablecoin to stake
   *
   * @return gaugeTokenAmount The amount of gauge shares minted and returned
   */
  function stakeOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) external virtual returns (uint256 gaugeTokenAmount);

  //////////////////////////////////////////////////////////////////////////////
  // External interface for unstaking
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Unstake an amount of gauge shares from the gauge and return the
   * amount as a single underlying stablecoin
   *
   * @param assetTokenAmount The amount of asset tokens being redeemed
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param recipient The recipient of the underlying stablecoin
   *
   * @return stablesReturned The amount of the underlying stablecoin returned
   *                         to the recipient
   */
  function unstakeOneStable(
    uint256 assetTokenAmount,
    uint256 stableIndex,
    address recipient
  ) external virtual returns (uint256 stablesReturned);

  /**
   * @dev Unstake everything as a single stablecoin in one function call
   *
   * @param stableIndex The index of the stablecoin to unstake
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
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
   * @dev Get the current virtual price of the asset token
   *
   * The virtual price in Curve is obtained through taking the invariance of
   * the pool, which by default takes every stablecoin as valued at 1.00 USD.
   *
   * The virtual price measures pool growth; this is not a dollar value.
   *
   * @return virtualPrice The asset token virtual price normalized to 1e18
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
   * @param stableAmounts The amount of each underlying stablecoin to add or
   *                      remove
   * @param isDeposit True if the amounts are being added to the pool, false
   *                  if they are being removed
   *
   * @return assetAmount The amount of asset tokens that would be minted
   */
  function getAssetAmount(
    uint256[3] memory stableAmounts,
    bool isDeposit
  ) external view virtual returns (uint256 assetAmount);

  /**
   * @dev Calculate the amount of underlying stablecoins that would be returned
   * for a given amount of asset tokens
   *
   * @param assetAmount The amount of asset tokens to unstake
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   *
   * @return stableAmount The amount of the underlying stablecoin that would
   *                      be returned
   */
  function getStableAmount(
    uint256 assetAmount,
    uint256 stableIndex
  ) external view virtual returns (uint256 stableAmount);
}
