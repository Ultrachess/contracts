/*
 * Copyright (C) 2022 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

import * as hardhat from "hardhat";

// Fixture setup
const setupTest = hardhat.deployments.createFixture(async ({ deployments }) => {
  // Ensure we start from a fresh deployment
  await deployments.fixture();
});

describe("Contract deployment", () => {
  it("should deploy contracts", async function () {
    this.timeout(60 * 1000);

    await setupTest();
  });
});
