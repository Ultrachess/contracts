/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../../interfaces/curve/StableSwapAave.sol";

/**
 * @dev Token router to swap between a token pair and the LP token
 */
contract CurvePooler {
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Curve Aave pool contract
   */
  StableSwapAave public immutable curveAavePool;

  IERC20 public immutable daiToken;
  IERC20 public immutable usdcToken;
  IERC20 public immutable usdtToken;

  IERC20 public immutable lpToken;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the contract
   *
   * @param curveAavePool_ The address of Curve's Aave stable swap contract
   */
  constructor(address curveAavePool_) {
    // Validate paremeters
    require(curveAavePool_ != address(0), "Invalid pool");

    address diaToken_ = StableSwapAave(curveAavePool_).underlying_coins(0);
    address usdcToken_ = StableSwapAave(curveAavePool_).underlying_coins(1);
    address usdtToken_ = StableSwapAave(curveAavePool_).underlying_coins(2);
    address lpToken_ = StableSwapAave(curveAavePool_).lp_token();

    require(diaToken_ != address(0), "Invalid DAI token");
    require(usdcToken_ != address(0), "Invalid USDC token");
    require(usdtToken_ != address(0), "Invalid USDT token");
    require(lpToken_ != address(0), "Invalid LP token");

    // Initialize state
    curveAavePool = StableSwapAave(curveAavePool_);
    daiToken = IERC20(diaToken_);
    usdcToken = IERC20(usdcToken_);
    usdtToken = IERC20(usdtToken_);
    lpToken = IERC20(lpToken_);
  }

  //////////////////////////////////////////////////////////////////////////////
  // External interface for adding
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Add an amount of tokens to the pool and stake the LP tokens in the gauge
   *
   * @param amounts The amounts of the underlying tokens to add
   * @param minMintAmount The minimum amount of the LP token to mint
   * @param sender The sender of the native and paired tokens
   * @param recipient The recipient of the CurveLP tokens
   */
  function addLiquidity(
    uint256[3] memory amounts,
    uint256 minMintAmount,
    address sender,
    address recipient
  ) external returns (uint256) {
    // Validate parameters
    require(sender != address(0), "Invalid from");
    require(recipient != address(0), "Invalid to");

    /*
    // Transfer amounts to this contract
    nativeWrapper.safeTransferFrom(sender, address(this), amountADesired);
    pairToken.safeTransferFrom(sender, address(this), amountBDesired);

    // Approve contract spending tokens
    require(
      nativeWrapper.approve(address(uniV2Router), amountADesired),
      "No native approval"
    );
    require(
      pairToken.approve(address(uniV2Router), amountBDesired),
      "No pair approval"
    );

    uint256 amountA;
    uint256 amountB;
    uint256 liquidity;

    // Call external contracts
    (amountA, amountB, liquidity) = uniV2Router.addLiquidity(
      address(nativeWrapper),
      address(pairToken),
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      recipient,
      deadline
    );

    // Validate return parameters
    require(amountA > 0, "No amountA");
    require(amountB > 0, "No amountB");
    require(liquidity > 0, "No liquidity");
    */
  }

  //////////////////////////////////////////////////////////////////////////////
  // External interface for removing
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Add an amount of the native token (e.g. W-ETH or WMATIC) to the pair
   *
   * @param amountLiquidity The amount of LP tokens to remove from the pool
   * @param sender The sender of the CurveLP tokens
   * @param recipient The recipient of the paired tokens
   */
  function removeLiquidity(
    uint256 amountLiquidity,
    address sender,
    address recipient
  ) external {
    // Validate parameters
    require(sender != address(0), "Invalid from");
    require(recipient != address(0), "Invalid to");

    // Transfer liquidity to this contract
    lpToken.safeTransferFrom(sender, address(this), amountLiquidity);

    /*
    // Approve contract spending tokens
    require(
      lpToken.approve(address(uniV2Router), amountLiquidity),
      "No LP approval"
    );

    uint256 amountA;
    uint256 amountB;

    // Call external contracts
    (amountA, amountB) = uniV2Router.removeLiquidity(
      address(nativeWrapper),
      address(pairToken),
      amountLiquidity,
      amountAMin,
      amountBMin,
      recipient,
      deadline
    );

    // Validate return parameters
    require(amountA > 0, "No amountA");
    require(amountB > 0, "No amountB");
    */
  }
}
