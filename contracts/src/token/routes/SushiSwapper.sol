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

import "../../../depends/canonical-weth/WETH9.sol";
import "../../../depends/sushiswap/uniswapv2/interfaces/IUniswapV2Router02.sol";

/**
 * @dev Token router to obtain or sell a SushiSwap token pair.
 *
 * The provided Uni-V2 router should have the factory that created the token
 * pair so that fees incurred are captured as value by the system.
 */
contract SushiSwapper {
    using SafeERC20 for IERC20;

    //////////////////////////////////////////////////////////////////////////////
    // State
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Native token wrapper contract (e.g. W-ETH or WMATIC)
     */
    WETH9 public immutable nativeWrapper;

    /**
     * @dev The token paired with the native token wrapper in the SushiSwap
     * liquidity pool
     */
    IERC20 public immutable pairToken;

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

        // Initialize state
        nativeWrapper = WETH9(nativeWrapper_);
        pairToken = IERC20(pairToken_);
        uniV2Router = IUniswapV2Router02(uniV2Router_);
    }

    //////////////////////////////////////////////////////////////////////////////
    // Receiver for native wrapper withdrawals
    //////////////////////////////////////////////////////////////////////////////

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {
        //emit Received(msg.sender, msg.value);
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface for adding
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Add an amount of the native token (e.g. W-ETH or WMATIC) to the pair
     *
     * @param recipient The receiver of the token pair amounts
     * @param amount The amount of the native token to split into the pair
     * @param deadline The deadline to use in all token swaps
     */
    function addNative(
        address recipient,
        uint256 amount,
        uint256 deadline
    ) external payable {
        // Validate parameters
        require(recipient != address(0), "Invalid to");

        // slither-disable-next-line arbitrary-send
        nativeWrapper.deposit{value: amount}();

        _addToken(IERC20(address(nativeWrapper)), amount, deadline);

        // Return pair balances
        IERC20(address(nativeWrapper)).safeTransfer(
            recipient,
            nativeWrapper.balanceOf(address(this))
        );
        pairToken.safeTransfer(recipient, pairToken.balanceOf(address(this)));
    }

    /**
     * @dev Add an amount of the paired token
     *
     * @param sender The sender of the native token
     * @param recipient The receiver of the token pair amounts
     * @param amount The amount of the paired token to split into pair
     * @param deadline The deadline to use in all token swaps
     */
    function addPair(
        address sender,
        address recipient,
        uint256 amount,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

        // Transfer amount to this contract
        pairToken.safeTransferFrom(sender, address(this), amount);

        _addToken(pairToken, amount, deadline);

        // Return pair balances
        IERC20(address(nativeWrapper)).safeTransfer(
            recipient,
            nativeWrapper.balanceOf(address(this))
        );
        pairToken.safeTransfer(recipient, pairToken.balanceOf(address(this)));
    }

    /**
     * @dev Add an amount of a token different from the wrapper or paired token
     *
     * @param sender The sender of the native token
     * @param recipient The receiver of the token pair amounts
     * @param token The token contract being spent
     * @param amount The amount of the token to split across the pair
     * @param deadline The deadline to use in all token swaps
     */
    function addForeign(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");
        require(
            token != address(0) &&
                token != address(nativeWrapper) &&
                token != address(pairToken),
            "Invalid token"
        );

        // Transfer amount to this contract
        IERC20(token).safeTransferFrom(sender, address(this), amount);

        // Approve Uni-V2 router spending token
        require(
            IERC20(token).approve(address(uniV2Router), amount),
            "No approval"
        );

        // Swap entire amount to native wrapper
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = address(nativeWrapper);
        uint256[] memory amounts = uniV2Router.swapExactTokensForTokens(
            amount,
            0,
            path,
            address(this),
            deadline
        );
        require(amounts[0] > 0, "No tokens received");

        _addToken(IERC20(address(nativeWrapper)), amount, deadline);

        // Return pair balances
        IERC20(address(nativeWrapper)).safeTransfer(
            recipient,
            nativeWrapper.balanceOf(address(this))
        );
        pairToken.safeTransfer(recipient, pairToken.balanceOf(address(this)));
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface for removing
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Liquidate token pair balances into native token
     *
     * @param sender The sender of the token pair amounts
     * @param recipient The receiver of the native token amount
     * @param amount0 The amount of the native token wrapper
     * @param amount1 The amount of the paired token
     * @param deadline The deadline to use in all token swaps
     */
    function removeNative(
        address sender,
        address recipient,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

        // Transfer amounts to this contract
        IERC20(address(nativeWrapper)).safeTransferFrom(
            sender,
            address(this),
            amount0
        );
        IERC20(pairToken).safeTransferFrom(sender, address(this), amount1);

        _removeToken(IERC20(address(nativeWrapper)), amount1, deadline);

        // Swap paired token into native wrapper
        uint256 nativeBalance = nativeWrapper.balanceOf(address(this));
        nativeWrapper.withdraw(nativeBalance);

        // Return native token to the recipient
        // slither-disable-next-line arbitrary-send
        payable(recipient).transfer(nativeBalance);
    }

    /**
     * @dev Liquidate token pair balances into paired token
     *
     * @param sender The sender of the token pair amounts
     * @param recipient The receiver of the paired token amount
     * @param amount0 The amount of the native token wrapper
     * @param amount1 The amount of the paired token
     * @param deadline The deadline to use in all token swaps
     */
    function removePair(
        address sender,
        address recipient,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");

        // Transfer amounts to this contract
        IERC20(address(nativeWrapper)).safeTransferFrom(
            sender,
            address(this),
            amount0
        );
        IERC20(pairToken).safeTransferFrom(sender, address(this), amount1);

        _removeToken(pairToken, amount0, deadline);

        // Return paired token to the recipient
        pairToken.safeTransfer(recipient, pairToken.balanceOf(address(this)));
    }

    /**
     * @dev Liquidate token pair balances into a given alternative token
     *
     * @param sender The sender of the token pair amounts
     * @param recipient The receiver of the paired token amount
     * @param returnToken The token to return to the recipient
     * @param amount0 The amount of the native token wrapper
     * @param amount1 The amount of the paired token
     * @param deadline The deadline to use in all token swaps
     */
    function removeForeign(
        address sender,
        address recipient,
        address returnToken,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external {
        // Validate parameters
        require(sender != address(0), "Invalid from");
        require(recipient != address(0), "Invalid to");
        require(returnToken != address(0), "Invalid token");

        // Transfer amounts to this contract
        IERC20(address(nativeWrapper)).safeTransferFrom(
            sender,
            address(this),
            amount0
        );
        IERC20(pairToken).safeTransferFrom(sender, address(this), amount1);

        _removeToken(IERC20(address(nativeWrapper)), amount0, deadline);

        uint256 nativeBalance = nativeWrapper.balanceOf(address(this));

        // Approve Uni-V2 router spending the return token
        require(
            nativeWrapper.approve(address(uniV2Router), nativeBalance),
            "No approval"
        );

        // Swap entire amount to native wrapper
        address[] memory path = new address[](2);
        path[0] = address(nativeWrapper);
        path[1] = returnToken;
        uint256[] memory amounts = uniV2Router.swapExactTokensForTokens(
            nativeBalance,
            0,
            path,
            address(this),
            deadline
        );
        require(amounts[0] > 0, "No tokens received");

        // Return foreign token balance
        IERC20(returnToken).safeTransfer(
            recipient,
            IERC20(returnToken).balanceOf(address(this))
        );
    }

    //////////////////////////////////////////////////////////////////////////////
    // Private interface
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Add an amount of a given token
     *
     * @param token The token contract being spent
     * @param amount The amount of the token to split across the pair
     * @param deadline The deadline to use in all token swaps
     */
    function _addToken(IERC20 token, uint256 amount, uint256 deadline) private {
        // Calculuate destination token
        address destinationToken = address(token) == address(nativeWrapper)
            ? address(pairToken)
            : address(nativeWrapper);

        // TODO: (Safely) handle inaccuracy due to price impact
        uint256 swapAmount = amount / 2;

        // Approve Uni-V2 router spending token
        require(
            IERC20(token).approve(address(uniV2Router), swapAmount),
            "No approval"
        );

        // Swap amount to destination token
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = destinationToken;
        uint256[] memory amounts = uniV2Router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            address(this),
            deadline
        );
        require(amounts[0] > 0, "No tokens received");
    }

    /**
     * @dev Liquidiate a token pair into a given token
     *
     * @param token The token contract being swapped into
     * @param amount The amount of token to swap
     * @param deadline The deadline to use in all token swaps
     */
    function _removeToken(
        IERC20 token,
        uint256 amount,
        uint256 deadline
    ) private {
        // Calculuate source token
        address sourceToken = address(token) == address(nativeWrapper)
            ? address(pairToken)
            : address(nativeWrapper);

        // Approve Uni-V2 router spending token
        require(
            IERC20(sourceToken).approve(address(uniV2Router), amount),
            "No approval"
        );

        // Swap amount to destination token
        address[] memory path = new address[](2);
        path[0] = sourceToken;
        path[1] = address(token);
        uint256[] memory amounts = uniV2Router.swapExactTokensForTokens(
            amount,
            0,
            path,
            address(this),
            deadline
        );
        require(amounts[0] > 0, "No tokens received");
    }
}
