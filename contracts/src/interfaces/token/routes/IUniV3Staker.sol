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
abstract contract IUniV3Staker {
  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when a new incentive is created
   *
   * @param creator The address of the creator
   * @param reward The reward amount
   * @param startTime The start time of the incentive
   * @param endTime The end time of the incentive
   * @param refundee The incentive's refundee address
   */
  event IncentiveCreated(
    address indexed creator,
    uint256 reward,
    uint256 startTime,
    uint256 endTime,
    address indexed refundee
  );

  /**
   * @dev Emitted when a Uniswap V3 LP NFT is staked
   *
   * @param sender The sender of the underlying stablecoins
   * @param recipient The address of the recipient of the LP NFT
   * @param nftAddress The address of the NFT manager contract
   * @param nftTokenId The ID of the NFT
   * @param stableAmounts The amounts of stablecoins spent on the NFT
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param baseTokenAmount The amount of base tokens spent on the NFT
   */
  event NFTStaked(
    address indexed sender,
    address indexed recipient,
    address nftAddress,
    uint256 nftTokenId,
    uint256[3] stableAmounts,
    uint256 baseTokenAmount
  );

  /**
   * @dev Emitted when a Uniswap V3 LP NFT is unstaked
   *
   * @param sender The sender of the NFT
   * @param nftAddress The address of the NFT manager contract
   * @param nftTokenId The ID of the NFT
   * @param rewardClaimed The amount of the base token claimed as a reward for
   *                      staking the LP NFT
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stablesReturned The amount of stablecoins returned to the recipient
   */
  event NFTUnstaked(
    address indexed sender,
    address indexed recipient,
    address nftAddress,
    uint256 nftTokenId,
    uint256 rewardClaimed,
    uint256 stableIndex,
    uint256 stablesReturned
  );

  //////////////////////////////////////////////////////////////////////////////
  // External interface for staking LP NFTs
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Mints and stakes a Uniswap V3 LP NFT, depositing stablecoins
   *
   * @param stableAmounts The amounts of underlying stablecoins to deposit
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param recipient The recient of the LP NFT
   *
   * @return nftTokenId The ID of the minted LP NFT
   */
  function stakeNFTWithStables(
    uint256[3] memory stableAmounts,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints and stakes a Uniswap V3 LP NFT using a single stablecoin
   *
   * @param stableIndex The index of the stablecoin to use
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param stableAmount The amount of the stablecoin to use
   *
   * @return nftTokenId The ID of the minted LP NFT
   */
  function stakeNFTOneStable(
    uint256 stableIndex,
    uint256 stableAmount
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints and stakes a Uniswap V3 LP NFT, depositing base tokens
   *
   * @param baseTokenAmount The amount of the base token to deposit, or 0 to
   *                        swap half the stable amounts into the base token
   * @param recipient The recient of the LP NFT
   *
   * @return nftTokenId The ID of the minted LP NFT
   */
  function stakeNFTWithBaseToken(
    uint256 baseTokenAmount,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  /**
   * @dev Mints and stakes a Uniswap V3 LP NFT without performing a one-sided
   * token swap
   *
   * @param stableAmounts The amounts of underlying stablecoins to deposit
   *                      (0 = DAI, 1 = USDC, 2 = USDT)
   * @param baseTokenAmount The amount of the base token to deposit, or 0 to
   *                        swap half the stable amounts into the base token
   * @param recipient The recient of the LP NFT
   *
   * @return nftTokenId The ID of the minted LP NFT
   */
  function stakeNFTImbalance(
    uint256[3] memory stableAmounts,
    uint256 baseTokenAmount,
    address recipient
  ) external virtual returns (uint256 nftTokenId);

  //////////////////////////////////////////////////////////////////////////////
  // External interface for unstaking LP NFTs
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Unstakes an LP NFT and returns the underlying liquidity as a
   * stablecoin
   *
   * Instead of burning the empty NFT, it is transfered to the recipient as a
   * keepsake.
   *
   * @param nftTokenId The ID of the LP NFT
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   * @param recipient The recipient of the stablecoin
   *
   * @return stablesReturned The total amount of stablecoins returned to the
   *                         recipient
   */
  function unstakeNFT(
    uint256 nftTokenId,
    uint256 stableIndex,
    address recipient
  ) external virtual returns (uint256 stablesReturned);

  /**
   * @dev Collects everything and returns the empty LP NFT in one transaction
   *
   * @param nftTokenId The ID of the LP NFT
   * @param stableIndex The index of the stablecoin to receive
   *                    (0 = DAI, 1 = USDC, 2 = USDT)
   *
   * @return stablesReturned The total amount of stablecoins returned to the
   *                         recipient
   */
  function exitOneStable(
    uint256 nftTokenId,
    uint256 stableIndex
  ) external virtual returns (uint256 stablesReturned);

  //////////////////////////////////////////////////////////////////////////////
  // Public accessors
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get the staking incentive
   *
   * @return totalRewardUnclaimed The amount of reward token not yet claimed by
   *                              users
   * @return totalSecondsClaimedX128 Total liquidity-seconds claimed,
   *                                 represented as a UQ32.128
   * @return numberOfStakes The count of deposits that are currently staked for
   *                        the incentive
   */
  function getIncentive()
    external
    view
    virtual
    returns (
      uint256 totalRewardUnclaimed,
      uint160 totalSecondsClaimedX128,
      uint96 numberOfStakes
    );

  /**
   * @dev Get information about a deposited LP NFT
   *
   * @return owner_ The owner of the deposited LP NFT
   * @return numberOfStakes Counter of how many incentives for which the
   *                        liquidity is staked
   * @return tickLower The lower tick of the range
   * @return tickUpper The upper tick of the range
   */
  function getDeposit(
    uint256 tokenId
  )
    external
    view
    virtual
    returns (
      address owner_,
      uint48 numberOfStakes,
      int24 tickLower,
      int24 tickUpper
    );

  /**
   * @dev Get information about a staked liquidity NFT
   *
   * @param tokenId The ID of the staked token
   *
   * @return secondsPerLiquidityInsideInitialX128 secondsPerLiquidity
   *                                              represented as a UQ32.128
   * @return liquidity The amount of liquidity in the NFT as of the last time
   *                   the rewards were computed
   */
  function getStake(
    uint256 tokenId
  )
    external
    view
    virtual
    returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity);

  /**
   * @dev Returns amounts of reward tokens owed to a given address according
   * to the last time all stakes were updated
   *
   * @param owner_ The owner for which the rewards owed are checked
   *
   * @return rewardsOwed The amount of the reward token claimable by the owner
   */
  function getRewardsOwed(
    address owner_
  ) external view virtual returns (uint256 rewardsOwed);

  //////////////////////////////////////////////////////////////////////////////
  // Public mutators
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Calculates the reward amount that will be received for the given stake
   *
   * @param tokenId The ID of the token
   *
   * @return reward The reward accrued to the NFT for the given incentive thus
   *                far
   */
  function getRewardInfo(
    uint256 tokenId
  ) external virtual returns (uint256 reward, uint160 secondsInsideX128);
}
