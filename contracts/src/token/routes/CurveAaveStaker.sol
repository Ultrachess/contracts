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

import {LiquidityGauge} from "../../../interfaces/curve-dao/LiquidityGauge.sol";

import {ICurveAaveStaker} from "../../interfaces/token/routes/ICurveAaveStaker.sol";

import {Ultra3CRV} from "../Ultra3CRV.sol";
import {CurveAavePooler} from "./CurveAavePooler.sol";

/**
 * @dev See {ICurveAaveStaker}
 */
contract CurveAaveStaker is ICurveAaveStaker, Context, ReentrancyGuard {
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Ultrachess Curve Aave pooler contract
   */
  CurveAavePooler public immutable curveAavePooler;

  /**
   * @dev The upstream Curve Aave gauge contract
   */
  LiquidityGauge public immutable curveAaveGauge;

  /**
   * @dev The Ultrachess token representing am3CRV staked in the Curve Aave gauge
   */
  Ultra3CRV public immutable assetToken;

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
   * @param curveAavePooler_ The address of our Curve Aave pooler contract
   * @param curveAaveGauge_ The address of Curve's Aave gauge contract
   * @param assetToken_ The token representing staked am3CRV
   */
  constructor(
    address curveAavePooler_,
    address curveAaveGauge_,
    address assetToken_
  ) {
    // Validate parameters
    require(curveAavePooler_ != address(0), "Invalid pooler");
    require(curveAaveGauge_ != address(0), "Invalid gauge");
    require(assetToken_ != address(0), "Invalid token");

    // Validate external contracts
    require(
      address(CurveAavePooler(curveAavePooler_).daiToken()) != address(0),
      "Invalid curve pooler DAI"
    );
    require(
      address(CurveAavePooler(curveAavePooler_).usdcToken()) != address(0),
      "Invalid curve pooler USDC"
    );
    require(
      address(CurveAavePooler(curveAavePooler_).usdtToken()) != address(0),
      "Invalid curve pooler USDT"
    );
    require(
      address(CurveAavePooler(curveAavePooler_).curveAaveLpToken()) !=
        address(0),
      "Invalid curve pooler LP"
    );

    // Initialize state
    curveAavePooler = CurveAavePooler(curveAavePooler_);
    curveAaveGauge = LiquidityGauge(curveAaveGauge_);
    assetToken = Ultra3CRV(assetToken_);
    daiToken = CurveAavePooler(curveAavePooler_).daiToken();
    usdcToken = CurveAavePooler(curveAavePooler_).usdcToken();
    usdtToken = CurveAavePooler(curveAavePooler_).usdtToken();
    curveAaveLpToken = CurveAavePooler(curveAavePooler_).curveAaveLpToken();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICurveAaveStaker}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICurveAaveStaker-stakeTokens}
   */
  function stakeTokens(
    uint256[3] memory stableAmounts,
    address recipient
  ) public override nonReentrant returns (uint256 assetTokenAmount) {
    // Validate parameters
    require(
      stableAmounts[0] > 0 || stableAmounts[1] > 0 || stableAmounts[2] > 0,
      "Requires nonzero amount"
    );
    require(recipient != address(0), "Invalid recipient");

    // Call external contracts
    if (stableAmounts[0] > 0) {
      daiToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[0]);
      daiToken.safeIncreaseAllowance(
        address(curveAavePooler),
        stableAmounts[0]
      );
    }
    if (stableAmounts[1] > 0) {
      usdcToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[1]);
      usdcToken.safeIncreaseAllowance(
        address(curveAavePooler),
        stableAmounts[1]
      );
    }
    if (stableAmounts[2] > 0) {
      usdtToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[2]);
      usdtToken.safeIncreaseAllowance(
        address(curveAavePooler),
        stableAmounts[2]
      );
    }

    // Add liquidity to the Curve Aave pool
    uint256 lpTokensAdded = curveAavePooler.addLiquidity(
      stableAmounts,
      0,
      address(this)
    );

    // Validate external contracts
    require(lpTokensAdded > 0, "No LP tokens");

    // Mint the recipient asset tokens redeemable for the LP tokens
    // slither-disable-next-line reentrancy-benign
    assetToken.mint(recipient, lpTokensAdded);

    // Call external contracts
    curveAaveLpToken.safeIncreaseAllowance(
      address(curveAaveGauge),
      lpTokensAdded
    );
    curveAaveGauge.deposit(lpTokensAdded);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit GaugeStaked(_msgSender(), recipient, stableAmounts, lpTokensAdded);

    // Return the gauge token amount
    return lpTokensAdded;
  }

  /**
   * @dev See {ICurveAaveStaker-stakeOneStable}
   */
  function stakeOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) public override returns (uint256 gaugeTokenAmount) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(stableAmount > 0, "Invalid amount");

    // Translate parameters
    uint256[3] memory stableAmounts;
    stableAmounts[stableIndex] = stableAmount;

    // Stake stablecoin to the gauge
    gaugeTokenAmount = stakeTokens(stableAmounts, _msgSender());

    // Return the gauge token amount
    return gaugeTokenAmount;
  }

  /**
   * @dev See {ICurveAaveStaker-unstakeOneStable}
   */
  function unstakeOneStable(
    uint256 assetTokenAmount,
    uint256 stableIndex,
    address recipient
  ) public override nonReentrant returns (uint256 stablesReturned) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(recipient != address(0), "Invalid recipient");

    // Burn the asset tokens being redeemed for the LP tokens
    assetToken.burn(_msgSender(), assetTokenAmount);

    // Call external contracts
    curveAaveGauge.withdraw(assetTokenAmount);

    // Approve the Curve Aave pooler to spend the gauge shares
    curveAaveLpToken.safeIncreaseAllowance(
      address(curveAavePooler),
      assetTokenAmount
    );

    // Remove liquidity from the Curve Aave pool
    stablesReturned = curveAavePooler.removeLiquidityOneStable(
      assetTokenAmount,
      stableIndex,
      0,
      address(this)
    );

    // Call external contracts
    if (stableIndex == 0) {
      daiToken.safeTransfer(recipient, stablesReturned);
    } else if (stableIndex == 1) {
      usdcToken.safeTransfer(recipient, stablesReturned);
    } else if (stableIndex == 2) {
      usdtToken.safeTransfer(recipient, stablesReturned);
    }

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit GaugeUnstakedOneStable(
      _msgSender(),
      recipient,
      assetTokenAmount,
      stableIndex,
      stablesReturned
    );

    return stablesReturned;
  }

  /**
   * @dev See {ICurveAaveStaker-exitOneStable}
   */
  function exitOneStable(
    uint256 stableIndex
  ) public override returns (uint256 stablesReturned) {
    // Read state
    uint256 gaugeTokenAmount = assetToken.balanceOf(_msgSender());

    // Unstake everything
    stablesReturned = unstakeOneStable(
      gaugeTokenAmount,
      stableIndex,
      _msgSender()
    );

    return stablesReturned;
  }

  /**
   * @dev See {ICurveAaveStaker-getVirtualPrice}
   */
  function getVirtualPrice()
    public
    view
    override
    returns (uint256 virtualPrice)
  {
    return curveAavePooler.getVirtualPrice();
  }

  /**
   * @dev See {ICurveAaveStaker-getAssetAmount}
   */
  function getAssetAmount(
    uint256[3] memory stableAmounts,
    bool isDeposit
  ) public view override returns (uint256 assetAmount) {
    // LP is staked 1:1 for asset
    return curveAavePooler.getLpAmount(stableAmounts, isDeposit);
  }

  /**
   * @dev See {ICurveAaveStaker-getStableAmount}
   */
  function getStableAmount(
    uint256 assetAmount,
    uint256 stableIndex
  ) public view override returns (uint256 stableAmount) {
    // Asset is unstaked 1:1 for LP
    return curveAavePooler.getStableAmount(assetAmount, stableIndex);
  }
}
