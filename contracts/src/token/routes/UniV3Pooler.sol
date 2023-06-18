/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IUniswapV3Pool} from "../../../interfaces/uniswap-v3-core/IUniswapV3Pool.sol";
import {INonfungiblePositionManager} from "../../../interfaces/uniswap-v3-periphery/INonfungiblePositionManager.sol";

import {IUniV3Pooler} from "../../interfaces/token/routes/IUniV3Pooler.sol";
import {LiquidityMath} from "../../utils/math/LiquidityMath.sol";

import {CurveAaveStaker} from "./CurveAaveStaker.sol";
import {UniV3Swapper} from "./UniV3Swapper.sol";

/**
 * @dev Token router to liquidity to the Uniswap V3 pool in exchange for an
 * LP NFT
 */
contract UniV3Pooler is
  IUniV3Pooler,
  Context,
  ReentrancyGuard,
  ERC721Holder,
  LiquidityMath
{
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  uint24 public constant FEE_HIGH = 10_000; // 1%

  int24 public constant TICK_LOWER = -887200;

  int24 public constant TICK_UPPER = 887200;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Ultrachess Curve Aave staker contract
   */
  CurveAaveStaker public immutable curveAaveStaker;

  /**
   * @dev The Ultrachess Uniswap V3 swapper
   */
  UniV3Swapper public immutable uniV3Swapper;

  /**
   * @dev The upstream Uniswap V3 pool for the token pair
   */
  IUniswapV3Pool public immutable uniswapV3Pool;

  /**
   * @dev The upstream Uniswap V3 NFT manager
   */
  INonfungiblePositionManager public immutable uniswapV3NftManager;

  /**
   * @dev If true, the base token is token0 and the asset token is token1,
   * otherwise the reverse
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
   * @param uniV3Swapper_ The address of our Uniswap V3 swapper contract
   * @param uniswapV3NftManager_ The address of the Uniswap V3 NFT manager
   */
  constructor(address uniV3Swapper_, address uniswapV3NftManager_) {
    // Validate parameters
    require(uniV3Swapper_ != address(0), "Invalid swapper");
    require(uniswapV3NftManager_ != address(0), "Invalid NFT manager");

    // Validate external contracts
    require(
      address(UniV3Swapper(uniV3Swapper_).curveAaveStaker()) != address(0),
      "Invalid univ3 swapper staker"
    );
    require(
      address(UniV3Swapper(uniV3Swapper_).uniswapV3Pool()) != address(0),
      "Invalid univ3 swapper pool"
    );
    require(
      address(UniV3Swapper(uniV3Swapper_).baseToken()) != address(0),
      "Invalid univ3 swapper base"
    );
    require(
      address(UniV3Swapper(uniV3Swapper_).assetToken()) != address(0),
      "Invalid univ3 swapper asset"
    );
    require(
      address(UniV3Swapper(uniV3Swapper_).daiToken()) != address(0),
      "Invalid univ3 swapper DAI"
    );
    require(
      address(UniV3Swapper(uniV3Swapper_).usdcToken()) != address(0),
      "Invalid univ3 swapper USDC"
    );
    require(
      address(UniV3Swapper(uniV3Swapper_).usdtToken()) != address(0),
      "Invalid univ3 swapper USDT"
    );

    // Initialize state
    curveAaveStaker = UniV3Swapper(uniV3Swapper_).curveAaveStaker();
    uniV3Swapper = UniV3Swapper(uniV3Swapper_);
    uniswapV3Pool = UniV3Swapper(uniV3Swapper_).uniswapV3Pool();
    uniswapV3NftManager = INonfungiblePositionManager(uniswapV3NftManager_);
    baseIsToken0 = UniV3Swapper(uniV3Swapper_).baseIsToken0();
    baseToken = UniV3Swapper(uniV3Swapper_).baseToken();
    assetToken = IERC20(UniV3Swapper(uniV3Swapper_).assetToken());
    daiToken = UniV3Swapper(uniV3Swapper_).daiToken();
    usdcToken = UniV3Swapper(uniV3Swapper_).usdcToken();
    usdtToken = UniV3Swapper(uniV3Swapper_).usdtToken();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of IUniV3Pooler
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IUniV3Pooler-mintNFT}
   */
  function mintNFT(
    uint256[3] memory stableAmounts,
    uint256 assetSwapAmount,
    uint256 baseTokenAmount,
    uint256 baseSwapAmount,
    address recipient
  ) public override nonReentrant returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Transfer tokens to this contract
    _receiveTokens(stableAmounts, baseTokenAmount);

    // Track token balances
    uint256 baseTokenBalance = baseTokenAmount;

    // Stake any stablecoins into the Curve Aave pool
    uint256 assetTokenBalance = _stakeStables(stableAmounts);

    // Swap asset tokens into base tokens if desired
    if (assetSwapAmount > 0) {
      uint256 baseTokensBought = _buyBaseTokens(assetSwapAmount);

      // Update token balances
      baseTokenBalance = baseTokenBalance.add(baseTokensBought);
      assetTokenBalance = assetTokenBalance.sub(assetSwapAmount);
    }

    // Swap base tokens into asset tokens if desired
    if (baseSwapAmount > 0) {
      uint256 assetTokensBought = _sellBaseTokens(baseSwapAmount);

      // Update token balances
      baseTokenBalance = baseTokenBalance.sub(baseSwapAmount);
      assetTokenBalance = assetTokenBalance.add(assetTokensBought);
    }

    // Mint the LP NFT
    uint256 baseTokenShare;
    uint256 assetTokenShare;
    uint256 liquidityAmount;
    (nftTokenId, baseTokenShare, assetTokenShare, liquidityAmount) = _mintLpNft(
      baseTokenBalance,
      assetTokenBalance,
      recipient
    );

    // Update token balances
    baseTokenBalance = baseTokenBalance.sub(baseTokenShare);
    assetTokenBalance = assetTokenBalance.sub(assetTokenShare);

    // Swap any remaining asset tokens for base tokens
    // slither-disable-next-line timestamp
    if (assetTokenBalance > 0) {
      uint256 baseTokensBought = _buyBaseTokens(assetTokenBalance);

      // Update token balance
      baseTokenBalance = baseTokenBalance.add(baseTokensBought);
    }

    // Return base tokens to the recipient
    _returnBaseTokens(recipient, baseTokenBalance);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit NFTMinted(
      _msgSender(),
      recipient,
      address(uniswapV3NftManager),
      nftTokenId,
      stableAmounts,
      baseTokenAmount,
      baseTokenShare,
      assetTokenShare,
      liquidityAmount
    );

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Pooler-mintNFTWithStables}
   */
  function mintNFTWithStables(
    uint256[3] memory stableAmounts,
    address recipient
  ) public override returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Get the asset amount for the given amount of stablecoins
    uint256 assetAmount = curveAaveStaker.getAssetAmount(stableAmounts, true);

    // Calculate asset token reserve
    uint256 assetTokenReserve = assetToken.balanceOf(address(uniswapV3Pool));

    // Get the pool fee
    uint24 poolFee = uniswapV3Pool.fee();

    // Calculate asset swap amount
    uint256 assetSwapAmount = computeSwapAmountV2(
      assetTokenReserve,
      assetAmount,
      poolFee
    );

    // Mint the NFT
    nftTokenId = mintNFT(stableAmounts, assetSwapAmount, 0, 0, recipient);

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Pooler-mintNFTWithBaseToken}
   */
  function mintNFTWithBaseToken(
    uint256 baseTokenAmount,
    address recipient
  ) public override returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Calculate base token reserve
    uint256 baseTokenReserve = baseToken.balanceOf(address(uniswapV3Pool));

    // Get the pool fee
    uint24 poolFee = uniswapV3Pool.fee();

    // Calculate base swap amount
    uint256 baseSwapAmount = LiquidityMath.computeSwapAmountV2(
      baseTokenReserve,
      baseTokenAmount,
      poolFee
    );

    // Mint the NFT
    nftTokenId = mintNFT(
      [uint256(0), uint256(0), uint256(0)],
      0,
      baseTokenAmount,
      baseSwapAmount,
      recipient
    );

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Pooler-mintNFTOneStable}
   */
  function mintNFTOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) public override returns (uint256 nftTokenId) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(stableAmount > 0, "Invalid amount");

    // Create stablecoin amounts array
    uint256[3] memory stableAmounts;
    stableAmounts[stableIndex] = stableAmount;

    // Mint the NFT
    nftTokenId = mintNFTWithStables(stableAmounts, _msgSender());

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Pooler-mintNFT}
   */
  function mintNFTImbalance(
    uint256[3] memory stableAmounts,
    uint256 baseTokenAmount,
    address recipient
  ) public override returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Mint the NFT
    nftTokenId = mintNFT(stableAmounts, 0, baseTokenAmount, 0, recipient);

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Pooler-collectFromNFT}
   */
  function collectFromNFT(
    uint256 nftTokenId,
    uint256 stableIndex,
    address recipient
  ) public override nonReentrant returns (uint256 stablesReturned) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(recipient != address(0), "Invalid recipient");

    // Read state
    (, , , , , , , uint128 uniV3LiquidityAmount, , , , ) = uniswapV3NftManager
      .positions(nftTokenId);

    // Translate parameters
    uint256 liquidityAmount = SafeCast.toUint256(
      SafeCast.toInt256(uniV3LiquidityAmount)
    );

    // Collect tokens and fees from LP NFT
    (uint256 baseTokensCollected, uint256 assetTokensCollected) = _collectLpNft(
      nftTokenId,
      uniV3LiquidityAmount
    );

    // Track token balance
    uint256 assetTokenBalance = assetTokensCollected;

    // Swap the base token for the asset token
    if (baseTokensCollected > 0) {
      uint256 assetTokensBought = _sellBaseTokens(baseTokensCollected);

      // Update token balance
      assetTokenBalance = assetTokenBalance.add(assetTokensBought);
    }

    // Unstake stablecoins
    if (assetTokenBalance > 0) {
      stablesReturned = _unstakeOneStable(assetTokenBalance, stableIndex);
    }

    // Return tokens from this contract
    _returnStables(recipient, stableIndex, stablesReturned);

    // Return the LP NFT to the recipient
    uniswapV3NftManager.safeTransferFrom(address(this), recipient, nftTokenId);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit NFTCollected(
      _msgSender(),
      recipient,
      address(uniswapV3NftManager),
      nftTokenId,
      liquidityAmount,
      baseTokensCollected,
      assetTokensCollected,
      stableIndex,
      stablesReturned
    );

    return stablesReturned;
  }

  /**
   * @dev See {IUniV3Pooler-exitOneStable}
   */
  function exitOneStable(
    uint256 nftTokenId,
    uint256 stableIndex
  ) public override returns (uint256 stablesReturned) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");

    // Collect and transfer the NFT back to the sender
    stablesReturned = collectFromNFT(nftTokenId, stableIndex, _msgSender());

    return stablesReturned;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Transfer tokens to this contract and approve the Curve Aave staker to
   * spend stablecoins
   *
   * @param stableAmounts The amounts of stablecoins to transfer
   * @param baseTokenAmount The amount of base tokens to transfer
   */
  function _receiveTokens(
    uint256[3] memory stableAmounts,
    uint256 baseTokenAmount
  ) private {
    // Call external contracts
    if (stableAmounts[0] > 0) {
      daiToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[0]);
      daiToken.safeIncreaseAllowance(
        address(curveAaveStaker),
        stableAmounts[0]
      );
    }
    if (stableAmounts[1] > 0) {
      usdcToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[1]);
      usdcToken.safeIncreaseAllowance(
        address(curveAaveStaker),
        stableAmounts[1]
      );
    }
    if (stableAmounts[2] > 0) {
      usdtToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[2]);
      usdtToken.safeIncreaseAllowance(
        address(curveAaveStaker),
        stableAmounts[2]
      );
    }
    if (baseTokenAmount > 0) {
      baseToken.safeTransferFrom(_msgSender(), address(this), baseTokenAmount);
    }
  }

  /**
   * @dev Return stablecoins to the recipient
   *
   * @param recipient The recipient of the tokens
   * @param stableIndex The index of the stablecoin to return
   * @param stableAmount The amount of stablecoins to return
   */
  function _returnStables(
    address recipient,
    uint256 stableIndex,
    uint256 stableAmount
  ) private {
    // Call external contracts
    if (stableIndex == 0) {
      daiToken.safeTransfer(recipient, stableAmount);
    } else if (stableIndex == 1) {
      usdcToken.safeTransfer(recipient, stableAmount);
    } else if (stableIndex == 2) {
      usdtToken.safeTransfer(recipient, stableAmount);
    }
  }

  /**
   * @dev Return base tokens to the recipient
   *
   * @param recipient The recipient of the tokens
   * @param baseTokenAmount The amount of base tokens to return
   */
  function _returnBaseTokens(
    address recipient,
    uint256 baseTokenAmount
  ) private {
    // Call external contracts
    // slither-disable-next-line timestamp
    if (baseTokenAmount > 0) {
      baseToken.safeTransfer(recipient, baseTokenAmount);
    }
  }

  /**
   * @dev Stake any stablecoins in the Curve Aave staker
   *
   * @param stableAmounts The amounts of stablecoins to stake
   *
   * @return assetTokenAmount The amount of asset tokens received
   */
  function _stakeStables(
    uint256[3] memory stableAmounts
  ) private returns (uint256 assetTokenAmount) {
    if (stableAmounts[0] > 0 || stableAmounts[1] > 0 || stableAmounts[2] > 0) {
      assetTokenAmount = curveAaveStaker.stakeTokens(
        stableAmounts,
        address(this)
      );
    }

    return assetTokenAmount;
  }

  /**
   * @dev Unstake stablecoins from the Curve Aave staker
   *
   * @param assetTokenAmount The amount of asset tokens to unstake
   * @param stableIndex The index of the stablecoin to receive
   *
   * @return stablesReturned The amount of stablecoins received
   */
  function _unstakeOneStable(
    uint256 assetTokenAmount,
    uint256 stableIndex
  ) private returns (uint256 stablesReturned) {
    // Approve the Curve Aave staker to spend asset tokens
    assetToken.safeIncreaseAllowance(
      address(curveAaveStaker),
      assetTokenAmount
    );

    // Unstake the asset token for stables
    stablesReturned = curveAaveStaker.unstakeOneStable(
      assetTokenAmount,
      stableIndex,
      address(this)
    );

    return stablesReturned;
  }

  /**
   * @dev Buy base tokens with asset tokens
   *
   * @param assetSwapAmount The amount of asset tokens to swap into base tokens
   *
   * @return baseTokensBought The amount of base tokens bought
   */
  function _buyBaseTokens(
    uint256 assetSwapAmount
  ) private returns (uint256 baseTokensBought) {
    // Approve the swapper to spend asset tokens
    assetToken.safeIncreaseAllowance(address(uniV3Swapper), assetSwapAmount);

    // Buy base tokens
    baseTokensBought = uniV3Swapper.buyTokens(
      [uint256(0), uint256(0), uint256(0)],
      assetSwapAmount,
      address(this)
    );

    return baseTokensBought;
  }

  /**
   * @dev Buy asset tokens with base tokens
   *
   * @param baseSwapAmount The amount of base tokens to swap into asset tokens
   *
   * @return assetTokensBought The amount of asset tokens bought
   */
  function _sellBaseTokens(
    uint256 baseSwapAmount
  ) private returns (uint256 assetTokensBought) {
    // Approve the swapper to spend base tokens
    baseToken.safeIncreaseAllowance(address(uniV3Swapper), baseSwapAmount);

    // Buy asset tokens
    assetTokensBought = uniV3Swapper.sellTokensForAsset(
      baseSwapAmount,
      address(this)
    );

    return assetTokensBought;
  }

  /**
   * @dev Mint an LP NFT
   *
   * @param baseTokenAmount The amount of base tokens to add to the pool
   * @param assetTokenAmount The amount of asset tokens to add to the pool
   * @param recipient The recipient of the LP NFT
   *
   * @return nftTokenId The ID of the LP NFT
   * @return baseTokenShare The amount of base tokens in the LP NFT
   * @return assetTokenShare The amount of asset tokens in the LP NFT
   * @return liquidityAmount The amount of liquidity in the LP NFT
   */
  function _mintLpNft(
    uint256 baseTokenAmount,
    uint256 assetTokenAmount,
    address recipient
  )
    private
    returns (
      uint256 nftTokenId,
      uint256 baseTokenShare,
      uint256 assetTokenShare,
      uint256 liquidityAmount
    )
  {
    // Approve the NFT manager to spend the base and asset tokens
    baseToken.safeIncreaseAllowance(
      address(uniswapV3NftManager),
      baseTokenAmount
    );
    assetToken.safeIncreaseAllowance(
      address(uniswapV3NftManager),
      assetTokenAmount
    );

    // Mint the LP NFT
    uint256 amount0;
    uint256 amount1;
    (nftTokenId, liquidityAmount, amount0, amount1) = uniswapV3NftManager.mint(
      INonfungiblePositionManager.MintParams({
        token0: baseIsToken0 ? address(baseToken) : address(assetToken),
        token1: baseIsToken0 ? address(assetToken) : address(baseToken),
        fee: FEE_HIGH,
        tickLower: TICK_LOWER,
        tickUpper: TICK_UPPER,
        amount0Desired: baseIsToken0 ? baseTokenAmount : assetTokenAmount,
        amount1Desired: baseIsToken0 ? assetTokenAmount : baseTokenAmount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: recipient,
        // slither-disable-next-line timestamp
        deadline: block.timestamp
      })
    );

    // Calculate results
    baseTokenShare = baseIsToken0 ? amount0 : amount1;
    assetTokenShare = baseIsToken0 ? amount1 : amount0;

    return (nftTokenId, baseTokenShare, assetTokenShare, liquidityAmount);
  }

  /**
   * @dev Collect tokens and fees from an LP NFT
   *
   * @param nftTokenId The ID of the LP NFT
   * @param liquidityAmount The amount of liquidity to collect
   *
   * @return baseTokensCollected The amount of base tokens collected
   * @return assetTokensCollected The amount of asset tokens collected
   */
  function _collectLpNft(
    uint256 nftTokenId,
    uint128 liquidityAmount
  )
    private
    returns (uint256 baseTokensCollected, uint256 assetTokensCollected)
  {
    // Withdraw tokens from the pool
    // slither-disable-next-line unused-return
    uniswapV3NftManager.decreaseLiquidity(
      INonfungiblePositionManager.DecreaseLiquidityParams({
        tokenId: nftTokenId,
        liquidity: liquidityAmount,
        amount0Min: 0,
        amount1Min: 0,
        // slither-disable-next-line timestamp
        deadline: block.timestamp
      })
    );

    // Collect the tokens and fees
    (uint256 amount0, uint256 amount1) = uniswapV3NftManager.collect(
      INonfungiblePositionManager.CollectParams({
        tokenId: nftTokenId,
        recipient: address(this),
        amount0Max: type(uint128).max,
        amount1Max: type(uint128).max
      })
    );

    // Calculate results
    baseTokensCollected = baseIsToken0 ? amount0 : amount1;
    assetTokensCollected = baseIsToken0 ? amount1 : amount0;

    return (baseTokensCollected, assetTokensCollected);
  }
}
