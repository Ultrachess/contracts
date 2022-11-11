/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import "../../depends/sushiswap/interfaces/IMiniChefV2.sol";

/**
 * @notice Access MCV2 pool information outside of the provided {IMiniChefV2}
 * interface
 */
interface MiniChefV2Pools {
    /**
     * @notice Address of the LP token for each MCV2 pool
     */
    function lpToken(uint256 poolIndex) external view returns (IERC20 token);
}

/**
 * @dev Implementation of the https://eips.ethereum.org/EIPS/eip-20[ERC20] Token
 * Standard to wrap MasterChef V2 shares
 */
contract WrappedMCV2 is Context, ERC20 {
    using SafeERC20 for IERC20;

    //////////////////////////////////////////////////////////////////////////////
    // Constants
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev The ERC 20 token name used by wallets to identify the token
     */
    string private constant TOKEN_NAME = "Wrapped MasterChef V2";

    /**
     * @dev The ERC 20 token symbol used as an abbreviation of the token, such
     * as BTC, ETH, AUG or SJCX.
     */
    string private constant TOKEN_SYMBOL = "WMCV2";

    /**
     * @dev Max number of supported pools in the MCV2 contract
     *
     * Polygon currently has 57 pools, and Coinbase trades around 180 coins, so
     * 200 makes a good conservative upper bound.
     */
    uint256 private constant MAX_POOLS = 200;

    //////////////////////////////////////////////////////////////////////////////
    // State
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev The instance of the MasterChef V2 contract
     */
    IMiniChefV2 public immutable mcv2;

    /**
     * @dev The LP token pair of the pool
     */
    IERC20 public immutable lpToken;

    /**
     * @dev Pool index of the LP pool in the MCV2 contract
     */
    uint256 public immutable poolIndex;

    //////////////////////////////////////////////////////////////////////////////
    // Events
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev A user has deposited WMATIC/WETH SushiLP
     *
     * @param user The user depositing SushiLP tokens
     * @param amount The amount of SushiLP tokens deposited
     */
    event DepositLP(address indexed user, uint256 amount);

    /**
     * @dev A user has withdrawn WMATIC/WETH SushiLP
     *
     * @param user The user withdrawing SushiLP tokens
     * @param amount The amount of SushiLP tokens withdrawn
     * @param to Who to send the withdrawn amount to
     */
    event WithdrawLP(address indexed user, uint256 amount, address indexed to);

    /**
     * @dev Funds have been harvested by this contract
     *
     * @param user The address of this contract
     *
     * TODO: Also log the amount of SUSHI harvested
     */
    event HarvestSUSHI(address indexed user);

    //////////////////////////////////////////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Initializes the ERC-20 token with a name and symbol
     *
     * @param _mcv2 The MasterChef V2 contract
     * @param _lpToken The LP token pair
     */
    constructor(
        address _mcv2,
        address _lpToken
    ) ERC20(TOKEN_NAME, TOKEN_SYMBOL) {
        // Validate paremeters
        require(_mcv2 != address(0), "Invalid MCV2");
        require(_lpToken != address(0), "Invalid LP");

        // Search for LP token
        uint256 _poolIndex = type(uint256).max;
        uint256 _poolLength = IMiniChefV2(_mcv2).poolLength();
        for (uint256 i = 0; i < _poolLength && i < MAX_POOLS; ++i) {
            // lpToken is an array and doesn't use much gas to view
            // slither-disable-next-line calls-loop
            if (MiniChefV2Pools(_mcv2).lpToken(i) == IERC20(_lpToken)) {
                _poolIndex = i;
                break;
            }
        }
        require(_poolIndex != type(uint256).max, "LP not found");

        // Initialize state
        mcv2 = IMiniChefV2(_mcv2);
        lpToken = IERC20(_lpToken);
        poolIndex = _poolIndex;
    }

    //////////////////////////////////////////////////////////////////////////////
    // External interface
    //////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Deposit LP tokens to MCV2 for SUSHI allocation
     *
     * @param amount LP token amount to deposit
     */
    function deposit(uint256 amount) external {
        // Update state
        _mint(_msgSender(), amount);

        // Emit events
        emit DepositLP(_msgSender(), amount);

        // Call external contracts
        lpToken.safeTransferFrom(_msgSender(), address(this), amount);
        require(lpToken.approve(address(mcv2), amount), "Approval failed");
        mcv2.deposit(poolIndex, amount, address(this));
    }

    /**
     * @dev Withdraw LP tokens from MCV2
     *
     * @param amount LP token amount to withdraw
     * @param to Receiver of the LP tokens
     */
    function withdraw(uint256 amount, address to) external {
        // Validate paremeters
        require(to != address(0), "Invalid to");

        // Update state
        _burn(_msgSender(), amount);

        // Emit events
        emit WithdrawLP(_msgSender(), amount, to);

        // Call external contracts
        mcv2.withdraw(poolIndex, amount, address(this));
        lpToken.safeTransfer(to, amount);
    }

    /**
     * @dev Harvest proceeds
     *
     * TODO: Restrict access
     */
    function harvest() external {
        // Emit events
        emit HarvestSUSHI(address(this));

        // Call external contracts
        mcv2.harvest(poolIndex, address(this));
    }

    /**
     * @dev Withdraw LP tokens from MCV2 and harvest proceeds for transaction
     * sender to `to`
     *
     * @param amount LP token amount to withdraw
     * @param to Receiver of the LP tokens
     *
     * TODO: Restrict access
     */
    function withdrawAndHarvest(uint256 amount, address to) external {
        // Validate parameters
        require(to != address(0), "Invalid to");

        // Update state
        _burn(_msgSender(), amount);

        // Emit events
        emit WithdrawLP(_msgSender(), amount, to);
        emit HarvestSUSHI(address(this));

        // Call external contracts
        mcv2.withdrawAndHarvest(poolIndex, amount, address(this));
        lpToken.safeTransfer(to, amount);
    }
}
