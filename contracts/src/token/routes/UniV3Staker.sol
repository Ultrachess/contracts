/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity 0.8.18;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IERC20Minimal} from "../../../interfaces/uniswap-v3-core/IERC20Minimal.sol";
import {IUniswapV3Pool} from "../../../interfaces/uniswap-v3-core/IUniswapV3Pool.sol";
import {INonfungiblePositionManager} from "../../../interfaces/uniswap-v3-periphery/INonfungiblePositionManager.sol";
import {IUniswapV3Staker} from "../../../interfaces/uniswap-v3-staker/IUniswapV3Staker.sol";

import {IUniV3Staker} from "../../interfaces/token/routes/IUniV3Staker.sol";

import {LpSft} from "../LpSft.sol";

import {UniV3Pooler} from "./UniV3Pooler.sol";

/**
 * @dev Token router to liquidity to the Uniswap V3 pool in exchange for an
 * LP NFT
 */
contract UniV3Staker is
  IUniV3Staker,
  Context,
  Ownable,
  ReentrancyGuard,
  ERC721Holder
{
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Ultrachess Uniswap V3 pooler
   */
  UniV3Pooler public immutable uniV3Pooler;

  /**
   * @dev The upstream Uniswap V3 pool for the token pair
   */
  IUniswapV3Pool public immutable uniswapV3Pool;

  /**
   * @dev The upstream Uniswap V3 NFT manager
   */
  INonfungiblePositionManager public immutable uniswapV3NftManager;

  /**
   * @dev The upstream Uniswap V3 NFT staker
   */
  IUniswapV3Staker public immutable uniswapV3Staker;

  /**
   * @dev The Ultrachess LP SFT contract
   */
  LpSft public immutable lpSft;

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

  /**
   * @dev True if the incentive has been created, false otherwise
   */
  bool public incentiveCreated = false;

  /**
   * @dev The Uniswap V3 staker incentive key, calculated when the incentive is
   * created
   */
  IUniswapV3Staker.IncentiveKey public incentiveKey;

  /**
   * @dev The Uniswap V3 staker incentive ID, calculated when the incentive is
   * created
   */
  bytes32 public incentiveId;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initializes the contract
   *
   * @param owner_ The initial owner of the contract
   * @param uniV3Pooler_ The address of our Uniswap V3 pooler contract
   * @param uniswapV3Staker_ The address of the Uniswap V3 staker contract
   * @param lpSft_ The address of the LP SFT contract
   */
  constructor(
    address owner_,
    address uniV3Pooler_,
    address uniswapV3Staker_,
    address lpSft_
  ) {
    // Validate parameters
    require(uniV3Pooler_ != address(0), "Invalid swapper");
    require(uniswapV3Staker_ != address(0), "Invalid staker");
    require(lpSft_ != address(0), "Invalid LP SFT");

    // Validate external contracts
    require(
      address(UniV3Pooler(uniV3Pooler_).uniswapV3Pool()) != address(0),
      "Invalid univ3 pooler pool"
    );
    require(
      address(UniV3Pooler(uniV3Pooler_).uniswapV3NftManager()) != address(0),
      "Invalid univ3 pooler mgr"
    );
    require(
      address(UniV3Pooler(uniV3Pooler_).baseToken()) != address(0),
      "Invalid univ3 pooler base"
    );
    require(
      address(UniV3Pooler(uniV3Pooler_).assetToken()) != address(0),
      "Invalid univ3 pooler asset"
    );
    require(
      address(UniV3Pooler(uniV3Pooler_).daiToken()) != address(0),
      "Invalid univ3 pooler DAI"
    );
    require(
      address(UniV3Pooler(uniV3Pooler_).usdcToken()) != address(0),
      "Invalid univ3 pooler USDC"
    );
    require(
      address(UniV3Pooler(uniV3Pooler_).usdtToken()) != address(0),
      "Invalid univ3 pooler USDT"
    );

    // Initialize {Ownable}
    transferOwnership(owner_);

    // Initialize state
    uniV3Pooler = UniV3Pooler(uniV3Pooler_);
    uniswapV3Pool = UniV3Pooler(uniV3Pooler_).uniswapV3Pool();
    uniswapV3NftManager = UniV3Pooler(uniV3Pooler_).uniswapV3NftManager();
    uniswapV3Staker = IUniswapV3Staker(uniswapV3Staker_);
    lpSft = LpSft(lpSft_);
    baseIsToken0 = UniV3Pooler(uniV3Pooler_).baseIsToken0();
    baseToken = UniV3Pooler(uniV3Pooler_).baseToken();
    assetToken = UniV3Pooler(uniV3Pooler_).assetToken();
    daiToken = UniV3Pooler(uniV3Pooler_).daiToken();
    usdcToken = UniV3Pooler(uniV3Pooler_).usdcToken();
    usdtToken = UniV3Pooler(uniV3Pooler_).usdtToken();
  }

  /**
   * @dev Initializes the staker incentive
   *
   * @param reward The reward to distribute in the incentive
   *
   * TODO: Allow creating multiple incentives?
   */
  function createIncentive(uint256 reward) public onlyOwner {
    // Validate state
    require(!incentiveCreated, "Incentive already created");

    // Update state
    incentiveCreated = true;
    incentiveKey = _createIncentiveKey();

    // See IncentiveId.sol in the Uniswap V3 staker dependency
    incentiveId = keccak256(abi.encode(incentiveKey));

    // Transfer the reward to this contract
    baseToken.safeTransferFrom(_msgSender(), address(this), reward);

    // Approve the Uniswap V3 staker to spend the reward
    baseToken.safeIncreaseAllowance(address(uniswapV3Staker), reward);

    // Create the incentive
    uniswapV3Staker.createIncentive(incentiveKey, reward);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit IncentiveCreated(
      _msgSender(),
      reward,
      incentiveKey.startTime,
      incentiveKey.endTime,
      incentiveKey.refundee
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IUniV3Staker}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IUniV3Staker-stakeNFTWithStables}
   */
  function stakeNFTWithStables(
    uint256[3] memory stableAmounts,
    address recipient
  ) public override nonReentrant returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Receive tokens from the caller
    _receiveTokens(stableAmounts, 0);

    // Mint the LP NFT
    nftTokenId = uniV3Pooler.mintNFTWithStables(stableAmounts, address(this));

    // Return the LP SFT and the base token dust
    _returnSftAndDust(nftTokenId, recipient);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit NFTStaked(
      _msgSender(),
      recipient,
      address(uniswapV3NftManager),
      nftTokenId,
      stableAmounts,
      0
    );

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Staker-stakeNFTOneStable}
   */
  function stakeNFTOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) public override returns (uint256 nftTokenId) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(stableAmount > 0, "Invalid amount");

    // Create stablecoin amounts array
    uint256[3] memory stableAmounts;
    stableAmounts[stableIndex] = stableAmount;

    // Mint and stake the NFT
    nftTokenId = stakeNFTWithStables(stableAmounts, _msgSender());

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Staker-stakeNFTWithBaseToken}
   */
  function stakeNFTWithBaseToken(
    uint256 baseTokenAmount,
    address recipient
  ) public override nonReentrant returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Receive tokens from the caller
    _receiveTokens([uint256(0), uint256(0), uint256(0)], baseTokenAmount);

    // Mint the LP NFT
    nftTokenId = uniV3Pooler.mintNFTWithBaseToken(
      baseTokenAmount,
      address(this)
    );

    // Return the LP SFT and the base token dust
    _returnSftAndDust(nftTokenId, recipient);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit NFTStaked(
      _msgSender(),
      recipient,
      address(uniswapV3NftManager),
      nftTokenId,
      [uint256(0), uint256(0), uint256(0)],
      baseTokenAmount
    );

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Staker-stakeNFTImbalance}
   */
  function stakeNFTImbalance(
    uint256[3] memory stableAmounts,
    uint256 baseTokenAmount,
    address recipient
  ) public override nonReentrant returns (uint256 nftTokenId) {
    // Validate parameters
    require(recipient != address(0), "Invalid recipient");

    // Receive tokens from the caller
    _receiveTokens(stableAmounts, baseTokenAmount);

    // Mint the LP NFT
    nftTokenId = uniV3Pooler.mintNFTImbalance(
      stableAmounts,
      baseTokenAmount,
      address(this)
    );

    // Return the LP SFT and the base token dust
    _returnSftAndDust(nftTokenId, recipient);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit NFTStaked(
      _msgSender(),
      recipient,
      address(uniswapV3NftManager),
      nftTokenId,
      stableAmounts,
      baseTokenAmount
    );

    return nftTokenId;
  }

  /**
   * @dev See {IUniV3Staker-unstakeNFT}
   */
  function unstakeNFT(
    uint256 nftTokenId,
    uint256 stableIndex,
    address recipient
  ) public override nonReentrant returns (uint256 stablesReturned) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");
    require(recipient != address(0), "Invalid recipient");

    // Validate ownership
    require(lpSft.balanceOf(_msgSender(), nftTokenId) == 1, "Must own voucher");

    // Burn the voucher for the LP NFT
    lpSft.burn(_msgSender(), nftTokenId);

    // Read state
    uint256 rewardBefore = uniswapV3Staker.rewards(
      incentiveKey.rewardToken,
      address(this)
    );

    // Unstake the LP NFT
    uniswapV3Staker.unstakeToken(incentiveKey, nftTokenId);

    // Read state
    uint256 rewardAfter = uniswapV3Staker.rewards(
      incentiveKey.rewardToken,
      address(this)
    );

    // Claim the reward
    uint256 rewardClaimed = uniswapV3Staker.claimReward(
      incentiveKey.rewardToken,
      address(this),
      rewardAfter.sub(rewardBefore)
    );

    // Withdraw the LP NFT to the pooler so that it can collect the liquidity
    uniswapV3Staker.withdrawToken(nftTokenId, address(uniV3Pooler), "");

    // Withdraw the liquidity. This returns the LP NFT to the staker.
    stablesReturned = uniV3Pooler.collectFromNFT(
      nftTokenId,
      stableIndex,
      address(this)
    );

    // Transfer the empty LP NFT to the recipient as a keepsake
    uniswapV3NftManager.safeTransferFrom(address(this), recipient, nftTokenId);

    // Return stablecoins to the recipient
    _returnStables(recipient, stableIndex, stablesReturned);

    // Dispatch event
    // slither-disable-next-line reentrancy-events
    emit NFTUnstaked(
      _msgSender(),
      recipient,
      address(uniswapV3NftManager),
      nftTokenId,
      rewardClaimed,
      stableIndex,
      stablesReturned
    );

    return stablesReturned;
  }

  /**
   * @dev See {IUniV3Staker-exitOneStable}
   */
  function exitOneStable(
    uint256 nftTokenId,
    uint256 stableIndex
  ) public override returns (uint256 stablesReturned) {
    // Validate parameters
    require(stableIndex <= 2, "Invalid stable");

    // Unstake and transfer the LP NFT
    stablesReturned = unstakeNFT(nftTokenId, stableIndex, _msgSender());

    return stablesReturned;
  }

  /**
   * @dev See {IUniV3Staker-getIncentive}
   */
  function getIncentive()
    public
    view
    override
    returns (
      uint256 totalRewardUnclaimed,
      uint160 totalSecondsClaimedX128,
      uint96 numberOfStakes
    )
  {
    // Validate state
    require(incentiveCreated, "Incentive not created");

    // Call external contract
    return uniswapV3Staker.incentives(incentiveId);
  }

  /**
   * @dev See {IUniV3Staker-getDeposit}
   */
  function getDeposit(
    uint256 tokenId
  )
    public
    view
    override
    returns (
      address owner_,
      uint48 numberOfStakes,
      int24 tickLower,
      int24 tickUpper
    )
  {
    // Call external contract
    (owner_, numberOfStakes, tickLower, tickUpper) = uniswapV3Staker.deposits(
      tokenId
    );

    // Validate result
    require(owner_ == address(this), "Invalid owner");

    // Translate result
    owner_ = lpSft.ownerOf(tokenId);

    return (owner_, numberOfStakes, tickLower, tickUpper);
  }

  /**
   * @dev See {IUniV3Staker-getStake}
   */
  function getStake(
    uint256 tokenId
  )
    public
    view
    override
    returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity)
  {
    // Validate state
    require(incentiveCreated, "Incentive not created");

    // Call external contract
    return uniswapV3Staker.stakes(tokenId, incentiveId);
  }

  /**
   * @dev See {IUniV3Staker-getRewardsOwed}
   */
  function getRewardsOwed(
    address owner_
  ) public view override returns (uint256 rewardsOwed) {
    // Validate state
    require(incentiveCreated, "Incentive not created");

    // Call external contract
    return uniswapV3Staker.rewards(incentiveKey.rewardToken, owner_);
  }

  /**
   * @dev See {IUniV3Staker-getRewardInfo}
   */
  function getRewardInfo(
    uint256 tokenId
  ) public override returns (uint256 reward, uint160 secondsInsideX128) {
    // Validate state
    require(incentiveCreated, "Incentive not created");

    // Call external contract
    return uniswapV3Staker.getRewardInfo(incentiveKey, tokenId);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Transfer tokens to this contract and approve the UniV3 Pooler to
   * spend tokens
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
      daiToken.safeIncreaseAllowance(address(uniV3Pooler), stableAmounts[0]);
    }
    if (stableAmounts[1] > 0) {
      usdcToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[1]);
      usdcToken.safeIncreaseAllowance(address(uniV3Pooler), stableAmounts[1]);
    }
    if (stableAmounts[2] > 0) {
      usdtToken.safeTransferFrom(_msgSender(), address(this), stableAmounts[2]);
      usdtToken.safeIncreaseAllowance(address(uniV3Pooler), stableAmounts[2]);
    }
    if (baseTokenAmount > 0) {
      baseToken.safeTransferFrom(_msgSender(), address(this), baseTokenAmount);
      baseToken.safeIncreaseAllowance(address(uniV3Pooler), baseTokenAmount);
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
   * @dev Mint an LP SFT and return it, along with the dust, to the recipient
   *
   * @param nftTokenId The ID of the LP NFT
   * @param recipient The recipient of the LP SFT and dust
   */
  function _returnSftAndDust(uint256 nftTokenId, address recipient) private {
    // Mint the recipient a voucher for the LP NFT. This must be held by the
    // sender when unstaking the NFT.
    // slither-disable-next-line reentrancy-events
    lpSft.mint(recipient, nftTokenId);

    // Send the LP NFT to the Uniswap V3 staker contract and automatically
    // stake it
    uniswapV3NftManager.safeTransferFrom(
      address(this),
      address(uniswapV3Staker),
      nftTokenId,
      abi.encode(incentiveKey)
    );

    // Return dust to the recipient
    uint256 baseTokenDust = baseToken.balanceOf(address(this));
    if (baseTokenDust > 0) {
      baseToken.safeTransfer(recipient, baseTokenDust);
    }
  }

  /**
   * @dev Returns the incentive key for the Uniswap V3 staker
   */
  function _createIncentiveKey()
    private
    view
    returns (IUniswapV3Staker.IncentiveKey memory)
  {
    return
      IUniswapV3Staker.IncentiveKey({
        rewardToken: IERC20Minimal(address(baseToken)),
        pool: uniswapV3Pool,
        // slither-disable-next-line timestamp
        startTime: block.timestamp,
        // slither-disable-next-line timestamp
        endTime: block.timestamp + 1 weeks, // TODO
        refundee: address(this)
      });
  }
}
