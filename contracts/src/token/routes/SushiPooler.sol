/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../../depends/sushiswap/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "../../../depends/sushiswap/uniswapv2/interfaces/IUniswapV2Router02.sol";

/**
 * @dev Token router to swap between a token pair and the LP token
 */
contract SushiPooler {
    using SafeERC20 for IERC20;

    //////////////////////////////////////////////////////////////////////////////
    // State
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Native token wrapper contract (e.g. W-ETH or WMATIC)
     */
    IERC20 public immutable nativeWrapper;

    /**
     * @dev The token paired with the native token wrapper in the SushiSwap
     * liquidity pool
     */
    IERC20 public immutable pairToken;

    /**
     * @dev The LP token for the token pair
     */
    IERC20 public immutable lpToken;

    /**
     * @dev The SushiSwap token router
     *
     * The provided router should have the Uni-V2 factory that created the LP pool
     * so that the fees incurred by swaps are captured as value by the system.
     */
    IUniswapV2Router02 public immutable uniV2Router;

    //////////////////////////////////////////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Initializes the contract
     *
     * @param nativeWrapper_ The address of the native token wrapper contract
     *        (e.g. W-ETH or WMATIC)
     * @param pairToken_ The address of the token paired with the native token
     * @param uniV2Router_ The address of SushiSwap's Uni-V2 router contract used
     *        for swapping
     */
    constructor(
        address nativeWrapper_,
        address pairToken_,
        address uniV2Router_
    ) {
        // Validate paremeters
        require(nativeWrapper_ != address(0), "Invalid native");
        require(pairToken_ != address(0), "Invalid pair");
        require(uniV2Router_ != address(0), "Invalid router");

        address lpToken_ = IUniswapV2Factory(
            IUniswapV2Router02(uniV2Router_).factory()
        ).getPair(nativeWrapper_, pairToken_);
        require(lpToken_ != address(0), "Invalid pair");

        // Initialize state
        nativeWrapper = IERC20(nativeWrapper_);
        pairToken = IERC20(pairToken_);
        lpToken = IERC20(lpToken_);
        uniV2Router = IUniswapV2Router02(uniV2Router_);
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface for adding
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Add an amount of the native token (e.g. W-ETH or WMATIC) to the pair
     *
     * @param amountADesired The amount of the native wrapped token to add
     * @param amountBDesired The amount of the paired token to add
     * @param amountAMin The minimum amount of the native wrapped token to add
     * @param amountBMin The minimum amount of the pair token to add
     * @param sender The sender of the native and paired tokens
     * @param recipient The recipient of the SushiLP tokens
     * @param deadline The deadline to use in all token swaps
     */
    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address sender,
        address recipient,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

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
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface for removing
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Add an amount of the native token (e.g. W-ETH or WMATIC) to the pair
     *
     * @param amountLiquidity The amount of SushiLP tokens to remove from the pool
     * @param amountAMin The minimum amount of the native wrapped token returned
     * @param amountBMin The minimum amount of the pair token returned
     * @param sender The sender of the SushiLP tokens
     * @param recipient The recipient of the paired tokens
     * @param deadline The deadline to use in all token swaps
     */
    function removeLiquidity(
        uint256 amountLiquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address sender,
        address recipient,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

        // Transfer liquidity to this contract
        lpToken.safeTransferFrom(sender, address(this), amountLiquidity);

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
    }
}
