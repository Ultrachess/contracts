/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.16;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {StableSwapAave} from "../../../interfaces/curve/StableSwapAave.sol";

import {ICurveAavePooler} from "../../interfaces/token/routes/ICurveAavePooler.sol";

/**
 * @dev See {ICurveAavePooler}
 */
contract CurveAavePooler is ICurveAavePooler, Context, ReentrancyGuard {
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The upstream Curve Aave pool contract
   */
  StableSwapAave public immutable curveAavePool;

  // Public token addresses
  IERC20 public immutable daiToken;
  IERC20 public immutable usdcToken;
  IERC20 public immutable usdtToken;
  IERC20 public immutable curveAaveLpToken;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the contract
   *
   * @param curveAavePool_ The address of Curve's Aave stable swap contract
   */
  constructor(address curveAavePool_) {
    // Validate parameters
    require(curveAavePool_ != address(0), "Invalid pool");

    // Read external contracts
    address diaToken_ = StableSwapAave(curveAavePool_).underlying_coins(0);
    address usdcToken_ = StableSwapAave(curveAavePool_).underlying_coins(1);
    address usdtToken_ = StableSwapAave(curveAavePool_).underlying_coins(2);
    address curveAaveLpToken_ = StableSwapAave(curveAavePool_).lp_token();

    // Validate external contracts
    require(diaToken_ != address(0), "Invalid curve DAI");
    require(usdcToken_ != address(0), "Invalid curve USDC");
    require(usdtToken_ != address(0), "Invalid curve USDT");
    require(curveAaveLpToken_ != address(0), "Invalid curve LP");

    // Initialize state
    curveAavePool = StableSwapAave(curveAavePool_);
    daiToken = IERC20(diaToken_);
    usdcToken = IERC20(usdcToken_);
    usdtToken = IERC20(usdtToken_);
    curveAaveLpToken = IERC20(curveAaveLpToken_);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICurveAavePooler}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICurveAavePooler-addLiquidity}
   */
  // slither-disable-next-line reentrancy-events
  function addLiquidity(
    uint256[3] memory stableAmounts,
    uint256 minMintAmount,
    address recipient
  ) public override nonReentrant returns (uint256 lpTokenAmount) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Call external contracts
    if (stableAmounts[0] > 0) {
      daiToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[0]);
      daiToken.safeIncreaseAllowance(address(curveAavePool), stableAmounts[0]);
    }
    if (stableAmounts[1] > 0) {
      usdcToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[1]);
      usdcToken.safeIncreaseAllowance(address(curveAavePool), stableAmounts[1]);
    }
    if (stableAmounts[2] > 0) {
      usdtToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[2]);
      usdtToken.safeIncreaseAllowance(address(curveAavePool), stableAmounts[2]);
    }

    // Add liquidity to the pool
    uint256 mintAmount = curveAavePool.add_liquidity(
      stableAmounts,
      minMintAmount,
      true
    );

    // Transfer LP tokens to the recipient
    curveAaveLpToken.safeTransfer(recipient, mintAmount);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit LiquidityAdded(_msgSender(), recipient, stableAmounts, mintAmount);

    return mintAmount;
  }

  /**
   * @dev See {ICurveAavePooler-addLiquidityOneStable}
   */
  function addLiquidityOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) public override returns (uint256 lpTokenAmount) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid token");

    // Translate parameters
    uint256[3] memory stableAmounts;
    stableAmounts[stableIndex] = stableAmount;

    // Add liquidity to the pool
    lpTokenAmount = addLiquidity(stableAmounts, 0, _msgSender());

    return lpTokenAmount;
  }

  /**
   * @dev See {ICurveAavePooler-removeLiquidityOneStable}
   */
  // slither-disable-next-line reentrancy-events
  function removeLiquidityOneStable(
    uint256 lpTokenAmount,
    uint256 stableIndex,
    uint256 minTokenAmount,
    address recipient
  ) public override nonReentrant returns (uint256 stablesReturned) {
    // Validate parameters
    require(lpTokenAmount > 0, "Invalid amount");
    require(stableIndex <= 2, "Invalid token");
    require(recipient != address(0), "Invalid recipient");

    // Call external contracts
    curveAaveLpToken.safeTransferFrom(
      _msgSender(),
      address(this),
      lpTokenAmount
    );

    curveAaveLpToken.safeIncreaseAllowance(
      address(curveAavePool),
      lpTokenAmount
    );

    // Remove the LP tokens from the pool
    uint256 removedAmount = curveAavePool.remove_liquidity_one_coin(
      lpTokenAmount,
      SafeCast.toInt128(SafeCast.toInt256(stableIndex)),
      minTokenAmount,
      true
    );

    // Call external contracts
    if (stableIndex == 0) {
      daiToken.safeTransfer(recipient, removedAmount);
    } else if (stableIndex == 1) {
      usdcToken.safeTransfer(recipient, removedAmount);
    } else if (stableIndex == 2) {
      usdtToken.safeTransfer(recipient, removedAmount);
    }

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit LiquidityRemovedOneStable(
      _msgSender(),
      recipient,
      lpTokenAmount,
      stableIndex,
      removedAmount
    );

    return removedAmount;
  }

  /**
   * @dev See {ICurveAavePooler-exitOneStable}
   */
  function exitOneStable(
    uint256 stableIndex
  ) public override returns (uint256 stablesReturned) {
    // Read state
    uint256 lpTokenAmount = curveAaveLpToken.balanceOf(_msgSender());

    // Remove all liquidity
    stablesReturned = removeLiquidityOneStable(
      lpTokenAmount,
      stableIndex,
      0,
      _msgSender()
    );
  }

  /**
   * @dev See {ICurveAavePooler-getVirtualPrice}
   */
  function getVirtualPrice()
    public
    view
    override
    returns (uint256 virtualPrice)
  {
    return curveAavePool.get_virtual_price();
  }

  /**
   * @dev See {ICurveAavePooler-getLpAmount}
   */
  function getLpAmount(
    uint256[3] memory stableAmounts,
    bool isDeposit
  ) public view override returns (uint256 mintAmount) {
    return curveAavePool.calc_token_amount(stableAmounts, isDeposit);
  }

  /**
   * @dev See {ICurveAavePooler-getStableAmount}
   */
  function getStableAmount(
    uint256 lpTokenAmount,
    uint256 stableIndex
  ) public view override returns (uint256 stableAmount) {
    return
      curveAavePool.calc_withdraw_one_coin(
        lpTokenAmount,
        SafeCast.toInt128(SafeCast.toInt256(stableIndex))
      );
  }
}
