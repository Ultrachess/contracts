/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.16;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IUniswapV3SwapCallback} from "../../../interfaces/uniswap-v3-core/callback/IUniswapV3SwapCallback.sol";
import {IUniswapV3Pool} from "../../../interfaces/uniswap-v3-core/IUniswapV3Pool.sol";

import {IUniV3Swapper} from "../../interfaces/token/routes/IUniV3Swapper.sol";

import {CurveAaveStaker} from "./CurveAaveStaker.sol";

/**
 * @dev Token router to swap between the base token and one of serveral
 * underlying stablecoins that the protocol is built on
 */
contract UniV3Swapper is
  IUniV3Swapper,
  IUniswapV3SwapCallback,
  Context,
  ReentrancyGuard
{
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The minimum value that can be returned from {TickMath-getSqrtRatioAtTick}
   *
   * Equivalent to getSqrtRatioAtTick(MIN_TICK).
   */
  uint160 internal constant MIN_SQRT_RATIO = 4295128739;

  /**
   * @dev The maximum value that can be returned from {TickMath-getSqrtRatioAtTick}
   *
   * Equivalent to getSqrtRatioAtTick(MAX_TICK).
   */
  uint160 internal constant MAX_SQRT_RATIO =
    1461446703485210103287273052203988822378723970342;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Curve Aave staker contract
   */
  CurveAaveStaker public immutable curveAaveStaker;

  /**
   * @dev The Uniswap V3 pool for the token pair
   */
  IUniswapV3Pool public immutable uniswapV3Pool;

  /**
   * @dev True if the base token is sorted first in the Uniswap V3 pool, false
   * otherwise
   */
  bool public immutable baseIsToken0;

  /**
   * @dev The Ultrachess base token
   */
  IERC20 public immutable baseToken;

  /**
   * @dev The Ultrachess asset token
   */
  IERC20 public immutable assetToken;

  // Public token addresses
  IERC20 public immutable daiToken;
  IERC20 public immutable usdcToken;
  IERC20 public immutable usdtToken;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the contract
   *
   * @param curveAaveStaker_ The address of our Curve Aave staker contract
   * @param uniswapV3Pool_ The address of the Uniswap V3 pool contract
   * @param baseToken_ The address of the base token of the protocol
   */
  constructor(
    address curveAaveStaker_,
    address uniswapV3Pool_,
    address baseToken_
  ) {
    // Validate parameters
    require(curveAaveStaker_ != address(0), "Invalid staker");
    require(uniswapV3Pool_ != address(0), "Invalid pool");
    require(baseToken_ != address(0), "Invalid token");

    // Translate parameters
    address assetToken_ = address(
      CurveAaveStaker(curveAaveStaker_).assetToken()
    );

    // Validate parameters
    require(assetToken_ != address(0), "Invalid asset");

    // Read external contracts
    address token0 = IUniswapV3Pool(uniswapV3Pool_).token0();
    address token1 = IUniswapV3Pool(uniswapV3Pool_).token1();

    // Validate external contracts
    require(token0 != address(0), "Invalid token0");
    require(token1 != address(0), "Invalid token1");

    // Determine token order
    bool baseIsToken0_ = baseToken_ == token0;

    // Validate external contracts
    if (baseIsToken0_) {
      require(token0 == baseToken_, "Invalid token0");
      require(token1 == assetToken_, "Invalid token1");
    } else {
      require(token0 == assetToken_, "Invalid token0");
      require(token1 == baseToken_, "Invalid token1");
    }

    // Initialize state
    curveAaveStaker = CurveAaveStaker(curveAaveStaker_);
    uniswapV3Pool = IUniswapV3Pool(uniswapV3Pool_);
    baseToken = IERC20(baseToken_);
    assetToken = IERC20(assetToken_);
    baseIsToken0 = baseIsToken0_;
    daiToken = CurveAaveStaker(curveAaveStaker_).daiToken();
    usdcToken = CurveAaveStaker(curveAaveStaker_).usdcToken();
    usdtToken = CurveAaveStaker(curveAaveStaker_).usdtToken();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IUniV3Swapper}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IUniV3Swapper-buyTokens}
   */
  function buyTokens(
    uint256[3] memory stableAmounts,
    uint256 assetTokenAmount,
    address recipient
  ) public override nonReentrant returns (uint256 baseTokensReturned) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Receive assets
    uint256 assetTokenBalance = _receiveAssets(stableAmounts, assetTokenAmount);

    // Buy base tokens
    baseTokensReturned = _buyBaseTokens(assetTokenBalance);

    // Return base tokens
    _returnBaseTokens(baseTokensReturned, recipient);

    // Emit event
    // slither-disable-next-line reentrancy-events
    emit TokensBought(
      _msgSender(),
      recipient,
      stableAmounts,
      assetTokenAmount,
      baseTokensReturned
    );

    return baseTokensReturned;
  }

  /**
   * @dev See {IUniV3Swapper-buyTokensOneStable}
   */
  function buyTokensOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) public override returns (uint256 baseTokensReturned) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(stableAmount > 0, "Invalid amount");

    // Translate parameters
    uint256[3] memory stableAmounts;
    stableAmounts[stableIndex] = stableAmount;

    // Buy base tokens
    baseTokensReturned = buyTokens(stableAmounts, 0, _msgSender());

    return baseTokensReturned;
  }

  /**
   * @dev See {IUniV3Swapper-sellTokensForAsset}
   */
  function sellTokensForAsset(
    uint256 baseTokenAmount,
    address recipient
  ) public override nonReentrant returns (uint256 assetTokensReturned) {
    // Validate parameters
    require(baseTokenAmount > 0, "Invalid amount");
    require(recipient != address(0), "Invalid recipient");

    // Receive base tokens
    _receiveBaseTokens(baseTokenAmount);

    // Sell base tokens
    assetTokensReturned = _sellBaseTokens(baseTokenAmount);

    // Return asset tokens
    _returnAssets(assetTokensReturned, recipient);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit TokensSoldForAsset(
      _msgSender(),
      recipient,
      baseTokenAmount,
      assetTokensReturned
    );

    return assetTokensReturned;
  }

  /**
   * @dev See {IUniV3Swapper-sellTokensForStable}
   */
  function sellTokensForStable(
    uint256 baseTokenAmount,
    uint256 stableIndex,
    address recipient
  ) public override nonReentrant returns (uint256 stablesReturned) {
    // Validate parameters
    require(baseTokenAmount > 0, "Invalid amount");
    require(stableIndex <= 2, "Invalid token");
    require(recipient != address(0), "Invalid recipient");

    // Receive base tokens
    _receiveBaseTokens(baseTokenAmount);

    // Sell base tokens
    uint256 assetTokensReceived = _sellBaseTokens(baseTokenAmount);

    // Return stablecoins
    _returnStables(assetTokensReceived, stableIndex, recipient);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit TokensSoldForStable(
      _msgSender(),
      recipient,
      stableIndex,
      baseTokenAmount,
      assetTokensReceived,
      stablesReturned
    );

    return stablesReturned;
  }

  /**
   * @dev See {IUniV3Swapper-exitOneStable}
   */
  function exitOneStable(
    uint256 stableIndex
  ) public override returns (uint256 stablesReturned) {
    // Read state
    uint256 baseTokenAmount = baseToken.balanceOf(_msgSender());

    // Swap everything
    stablesReturned = sellTokensForStable(
      baseTokenAmount,
      stableIndex,
      _msgSender()
    );

    return stablesReturned;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IUniswapV3SwapCallback}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IUniswapV3SwapCallback-uniswapV3SwapCallback}
   *
   * This function is called to the sender after a swap is executed on
   * Uniswap V3.
   *
   * The pool tokens owed for the swap must be payed. The caller of this
   * method must be checked to be a UniswapV3Pool deployed by the canonical
   * UniswapV3Factory.
   *
   * amount0Delta and amount1Delta can both be 0 if no tokens were swapped.
   */
  function uniswapV3SwapCallback(
    // slither-disable-next-line similar-names
    int256 amount0Delta,
    int256 amount1Delta,
    bytes calldata
  ) public override {
    // Validate caller
    require(_msgSender() == address(uniswapV3Pool), "Invalid caller");

    // Pay fees
    if (amount0Delta > 0) {
      IERC20(IUniswapV3Pool(_msgSender()).token0()).safeTransfer(
        _msgSender(),
        uint256(amount0Delta)
      );
    }
    if (amount1Delta > 0) {
      IERC20(IUniswapV3Pool(_msgSender()).token1()).safeTransfer(
        _msgSender(),
        uint256(amount1Delta)
      );
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Procure asset tokens and stablecoins from the sender
   *
   * @param stableAmounts Amounts of stablecoins to transfer
   * @param assetTokenAmount Amount of asset tokens to transfer
   *
   * @return assetTokenBalance Balance of asset tokens in this contract
   */
  function _receiveAssets(
    uint256[3] memory stableAmounts,
    uint256 assetTokenAmount
  ) private returns (uint256 assetTokenBalance) {
    // Call external contracts
    bool hasStable = false;
    if (stableAmounts[0] > 0) {
      daiToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[0]);
      daiToken.safeIncreaseAllowance(
        address(curveAaveStaker),
        stableAmounts[0]
      );
      hasStable = true;
    }
    if (stableAmounts[1] > 0) {
      usdcToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[1]);
      usdcToken.safeIncreaseAllowance(
        address(curveAaveStaker),
        stableAmounts[1]
      );
      hasStable = true;
    }
    if (stableAmounts[2] > 0) {
      usdtToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[2]);
      usdtToken.safeIncreaseAllowance(
        address(curveAaveStaker),
        stableAmounts[2]
      );
      hasStable = true;
    }
    if (assetTokenAmount > 0) {
      assetToken.safeTransferFrom(
        _msgSender(),
        address(this),
        assetTokenAmount
      );
    }

    // Stake stablecoins, if any, in Curve Aave pool
    uint256 mintedAssetTokens = hasStable
      ? curveAaveStaker.stakeTokens(stableAmounts, address(this))
      : 0;

    return assetTokenAmount.add(mintedAssetTokens);
  }

  /**
   * @dev Procure base tokens from the sender
   *
   * @param baseTokenAmount Amount of base tokens to transfer
   */
  function _receiveBaseTokens(uint256 baseTokenAmount) private {
    // Call external contracts
    baseToken.safeTransferFrom(_msgSender(), address(this), baseTokenAmount);
  }

  /**
   * @dev Buy base tokens with asset tokens
   *
   * @param assetTokenAmount Amount of asset tokens to spend
   *
   * @return baseTokensReturned Amount of base tokens received
   */
  function _buyBaseTokens(
    uint256 assetTokenAmount
  ) private returns (uint256 baseTokensReturned) {
    // Approve Uniswap V3 pool to spend asset tokens
    IERC20(assetToken).safeIncreaseAllowance(
      address(uniswapV3Pool),
      assetTokenAmount
    );

    //
    // Swap asset tokens for base tokens
    //
    // A note about amount0 and amount1:
    //
    // amount0 is the delta of the balance of token0 of the pool
    // amount1 is the delta of the balance of token1 of the pool
    //
    // Amounts are exact when negative, minimum when positive.
    //
    bool zeroForOne = baseIsToken0 ? false : true;
    (int256 amount0, int256 amount1) = uniswapV3Pool.swap(
      address(this),
      zeroForOne,
      SafeCast.toInt256(assetTokenAmount),
      baseIsToken0 ? MAX_SQRT_RATIO - 1 : MIN_SQRT_RATIO + 1, // TODO
      ""
    );

    // Calculate base token amount
    baseTokensReturned = baseIsToken0
      ? SafeCast.toUint256(-amount0)
      : SafeCast.toUint256(-amount1);

    return baseTokensReturned;
  }

  /**
   * @dev Sell base tokens for asset tokens
   *
   * @param baseTokenAmount Amount of base tokens to spend
   *
   * @return assetTokensReturned Amount of asset tokens received
   */
  function _sellBaseTokens(
    uint256 baseTokenAmount
  ) private returns (uint256 assetTokensReturned) {
    // Approve Uniswap V3 pool to spend base tokens
    baseToken.safeIncreaseAllowance(address(uniswapV3Pool), baseTokenAmount);

    //
    // Swap base tokens for asset tokens
    //
    // A note about amount0 and amount1:
    //
    // amount0 is the delta of the balance of token0 of the pool
    // amount1 is the delta of the balance of token1 of the pool
    //
    // Amounts are exact when negative, minimum when positive.
    //
    bool zeroForOne = baseIsToken0 ? true : false;
    (int256 amount0, int256 amount1) = uniswapV3Pool.swap(
      address(this),
      zeroForOne,
      SafeCast.toInt256(baseTokenAmount),
      baseIsToken0 ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1, // TODO
      ""
    );

    // Calculate asset token amount
    assetTokensReturned = baseIsToken0
      ? SafeCast.toUint256(-amount1)
      : SafeCast.toUint256(-amount0);

    return assetTokensReturned;
  }

  /**
   * @dev Return base tokens to the recipient
   *
   * @param baseTokenAmount Amount of base tokens to transfer
   * @param recipient Address to transfer base tokens to
   */
  function _returnBaseTokens(
    uint256 baseTokenAmount,
    address recipient
  ) private {
    // Transfer tokens to the recipient
    if (baseTokenAmount > 0) {
      baseToken.safeTransfer(recipient, baseTokenAmount);
    }
  }

  /**
   * @dev Return asset tokens to the recipient
   *
   * @param assetTokenAmount Amount of asset tokens to transfer
   * @param recipient Address to transfer asset tokens to
   */
  function _returnAssets(uint256 assetTokenAmount, address recipient) private {
    // Transfer tokens to the recipient
    if (assetTokenAmount > 0) {
      assetToken.safeTransfer(recipient, assetTokenAmount);
    }
  }

  /**
   * @dev Return stablecoins to the recipient
   *
   * @param assetTokenAmount Amount of asset tokens to unstake for stablecoins
   * @param stableIndex Index of stablecoin to unstake
   * @param recipient Address to transfer stablecoins to
   *
   * @return stablesReturned Amount of stablecoins returned
   */
  function _returnStables(
    uint256 assetTokenAmount,
    uint256 stableIndex,
    address recipient
  ) private returns (uint256 stablesReturned) {
    // Approve Curve Aave staker to spend asset tokens
    IERC20(assetToken).safeIncreaseAllowance(
      address(curveAaveStaker),
      assetTokenAmount
    );

    // Unstake tokens from Curve Aave pool
    stablesReturned = curveAaveStaker.unstakeOneStable(
      assetTokenAmount,
      stableIndex,
      recipient
    );

    // Call external contracts
    if (stableIndex == 0) {
      daiToken.safeTransfer(recipient, stablesReturned);
    } else if (stableIndex == 1) {
      usdcToken.safeTransfer(recipient, stablesReturned);
    } else if (stableIndex == 2) {
      usdtToken.safeTransfer(recipient, stablesReturned);
    }

    return stablesReturned;
  }
}
