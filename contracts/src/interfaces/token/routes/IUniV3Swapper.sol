/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.16;

/**
 * @dev Token router to swap between the base token and a yielding asset token
 */
abstract contract IUniV3Swapper {
  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when base tokens are purchased on Uniswap
   *
   * @param sender The sender of the underlying stablecoins
   * @param recipient The address of the recipient of the base token
   * @param stableAmounts The amounts of stablecoins to spend
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param assetTokenAmount The amount of asset tokens being spent
   * @param baseTokenReturned The amount of base tokens received
   */
  event TokensBought(
    address indexed sender,
    address indexed recipient,
    uint256[3] stableAmounts,
    uint256 assetTokenAmount,
    uint256 baseTokenReturned
  );

  /**
   * @dev Emitted when base tokens are sold on Uniswap for asset tokens
   *
   * @param sender The sender of the base token
   * @param recipient The address of the recipient of the underlying stablecoins
   * @param baseTokenAmount The amount of base tokens spent
   * @param assetTokensReturned The amount of asset tokens returned to the
   *                            recipient
   *
   * Note that due to dust, assetTokensReturned may be more than
   * assetTokenAmount.
   */
  event TokensSoldForAsset(
    address indexed sender,
    address indexed recipient,
    uint256 baseTokenAmount,
    uint256 assetTokensReturned
  );

  /**
   * @dev Emitted when base tokens are sold on Uniswap for stablecoins
   *
   * @param sender The sender of the base token
   * @param recipient The address of the recipient of the underlying stablecoins
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param baseTokenSpent The amount of base tokens spent
   * @param assetTokensUnstaked The amount of asset tokens unstaked from the
   *                            Curve Aave pool
   * @param stablesReturned The amount of stablecoins returned to the recipient
   *
   * Note that due to dust, stablesReturned may be more than stablesUnstaked.
   */
  event TokensSoldForStable(
    address indexed sender,
    address indexed recipient,
    uint256 stableIndex,
    uint256 baseTokenSpent,
    uint256 assetTokensUnstaked,
    uint256 stablesReturned
  );

  //////////////////////////////////////////////////////////////////////////////
  // External interface for swapping into the base token
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Swaps the underlying stablecoins or the asset token for the base token
   *
   * @param stableAmounts The amounts of underlying stablecoins to include in
   *                      the swap (0 = DAI, 1 = USDC, 2 = USDT)
   * @param assetTokenAmount The ammount of the asset tokens to include in the swap
   * @param recipient The recient of the swapped tokens
   *
   * @return baseTokensReturned The amount of base tokens sent to the recipient
   */
  function buyTokens(
    uint256[3] memory stableAmounts,
    uint256 assetTokenAmount,
    address recipient
  ) external virtual returns (uint256 baseTokensReturned);

  /**
   * @dev Swaps a single underlying stablecoin for the base token
   *
   * @param stableIndex The index of the stablecoin to swap
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stableAmount The amount of the underlying stablecoin to swap
   *
   * @return baseTokensReturned The amount of base tokens sent to the sender
   */
  function buyTokensOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) external virtual returns (uint256 baseTokensReturned);

  //////////////////////////////////////////////////////////////////////////////
  // External interface for swapping out of the base token
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Swaps the base token for the asset token
   *
   * @param baseTokenAmount The amount of the base token to swap
   * @param recipient The recient of the swapped tokens
   *
   * @return assetTokensReturned The amount of asset tokens sent to the
   *                             recipient
   */
  function sellTokensForAsset(
    uint256 baseTokenAmount,
    address recipient
  ) external virtual returns (uint256 assetTokensReturned);

  /**
   * @dev Swaps the base token for the underlying stablecoin
   *
   * @param baseTokenAmount The amount of the base token to swap
   * @param stableIndex The index of the stablecoin to swap
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param recipient The recient of the stab
   *
   * @return stablesReturned The amount of stablecoins returned to recipient
   */
  function sellTokensForStable(
    uint256 baseTokenAmount,
    uint256 stableIndex,
    address recipient
  ) external virtual returns (uint256 stablesReturned);

  /**
   * @dev Swap everything to a single underlying stablecoin in one function
   * call
   *
   * @param stableIndex The index of the stablecoin to unstake
   * ]                  (0 = DAI, 1 = USDC, 2 = USDT)
   *
   * @return stablesReturned The amount of stablecoins returned
   */
  function exitOneStable(
    uint256 stableIndex
  ) external virtual returns (uint256 stablesReturned);
}
