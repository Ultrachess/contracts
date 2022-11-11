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

import "../../../depends/sushiswap/interfaces/IMiniChefV2.sol";

import "../WrappedMCV2.sol";

/**
 * @dev Token router to swap between a token pair and the LP token
 */
contract MCV2Wrapper {
    using SafeERC20 for IERC20;

    //////////////////////////////////////////////////////////////////////////////
    // State
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev The LP token for the token pair
     */
    IERC20 public immutable lpToken;

    /**
     * @dev The WrappedMCV2 contract
     */
    WrappedMCV2 public immutable wrappedMCV2;

    //////////////////////////////////////////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Initializes the contract
     *
     * @param lpToken_ The LP token pair contract
     * @param wrappedMCV2_ The WrappedMCV2 contract
     */
    constructor(address lpToken_, address wrappedMCV2_) {
        // Validate paremeters
        require(lpToken_ != address(0), "Invalid LP");
        require(wrappedMCV2_ != address(0), "Invalid WMCV2");

        // Initialize state
        lpToken = IERC20(lpToken_);
        wrappedMCV2 = WrappedMCV2(wrappedMCV2_);
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface for depositing
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Deposit an amount of the LP token pair into the MasterChefV2 contract
     *
     * @param amount The amount of SushiLP tokens to deposit
     * @param sender The sender of the SushiLP tokens
     * @param recipient The recipient of the WrappedMCV2 tokens
     */
    function depositLP(
        uint256 amount,
        address sender,
        address recipient
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

        // Transfer amounts to this contract
        lpToken.safeTransferFrom(sender, address(this), amount);

        // Approve contract spending tokens
        require(lpToken.approve(address(wrappedMCV2), amount), "No approval");

        // Call external contracts
        wrappedMCV2.deposit(amount);

        // Transfer amount back to recipient
        require(wrappedMCV2.transfer(recipient, amount), "Xfer to failed");
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface for withdrawing
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Deposit an amount of the LP token pair into the MasterChefV2 contract
     *
     * @param amount The amount of SushiLP tokens to withdraw
     * @param sender The sender of the WrappedMCV2 tokens
     * @param recipient The recipient of the SushiLP tokens
     */
    function withdrawLP(
        uint256 amount,
        address sender,
        address recipient
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

        // Transfer amounts to this contract
        require(
            wrappedMCV2.transferFrom(sender, address(this), amount),
            "Xfer from failed"
        );

        // Approve contract spending tokens
        require(
            wrappedMCV2.approve(address(wrappedMCV2), amount),
            "No approval"
        );

        // Call external contracts
        wrappedMCV2.withdraw(amount, address(this));

        // Transfer amount back to recipient
        lpToken.safeTransfer(recipient, amount);
    }
}
