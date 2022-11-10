/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

// slither-disable-next-line solc-version
pragma solidity >=0.6.0;

import {IAaveIncentivesController} from "../../depends/aave-v2/interfaces/IAaveIncentivesController.sol";

contract MockIncentivesController is IAaveIncentivesController {
    function getAssetData(
        address
    ) external view override returns (uint256, uint256, uint256) {
        return (0, 0, 0);
    }

    function assets(
        address
    ) external view override returns (uint128, uint128, uint256) {
        return (0, 0, 0);
    }

    function setClaimer(
        address,
        address // solhint-disable-next-line no-empty-blocks
    ) external override {}

    function getClaimer(address) external view override returns (address) {
        return address(1);
    }

    function configureAssets(
        address[] calldata,
        uint256[] calldata // solhint-disable-next-line no-empty-blocks
    ) external override {}

    function handleAction(
        address,
        uint256,
        uint256 // solhint-disable-next-line no-empty-blocks
    ) external override {}

    function getRewardsBalance(
        address[] calldata,
        address
    ) external view override returns (uint256) {
        return 0;
    }

    function claimRewards(
        address[] calldata,
        uint256,
        address
    ) external override returns (uint256) {
        return 0;
    }

    function claimRewardsOnBehalf(
        address[] calldata,
        uint256,
        address,
        address
    ) external override returns (uint256) {
        return 0;
    }

    function getUserUnclaimedRewards(
        address
    ) external view override returns (uint256) {
        return 0;
    }

    function getUserAssetData(
        address,
        address
    ) external view override returns (uint256) {
        return 0;
    }

    // slither-disable-next-line naming-convention
    function REWARD_TOKEN() external view override returns (address) {
        return address(0);
    }

    // slither-disable-next-line naming-convention
    function PRECISION() external view override returns (uint8) {
        return 0;
    }

    // slither-disable-next-line naming-convention
    function DISTRIBUTION_END() external view override returns (uint256) {
        return 0;
    }
}
