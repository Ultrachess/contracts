#!/bin/bash
################################################################################
#
#  Copyright (C) 2022 Ultrachess Team
#  This file is part of Ultrachess - https://github.com/Ultrachess/contracts
#
#  SPDX-License-Identifier: Apache-2.0
#  See the file LICENSE for more information.
#
################################################################################

#
# Aave V2 protocol
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files (TODO)
#   * REPO_DIR - Place to download the repo
#   * INSTALL_DIR - Place to install the contract files
#
# Dependencies:
#
#   * git
#   * patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

AAVE_V2_NAME="aave-v2"
AAVE_V2_VERSION="61c2273a992f655c6d3e7d716a0c2f1b97a55a92" # master
AAVE_V2_REPO="https://github.com/aave/protocol-v2.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_AAVE_V2="${DEPENDS_DIR}/${AAVE_V2_NAME}"

# Checkout directory
REPO_DIR_AAVE_V2="${REPO_DIR}/${AAVE_V2_NAME}"

# Install directory for Aave V2
INSTALL_DIR_AAVE_V2="${INSTALL_DIR}/${AAVE_V2_NAME}"

#
# Checkout
#

function checkout_aave_v2() {
  echo "Checking out Aave V2"

  if [ ! -d "${REPO_DIR_AAVE_V2}" ]; then
    git clone "${AAVE_V2_REPO}" "${REPO_DIR_AAVE_V2}"
  fi

  (
    cd "${REPO_DIR_AAVE_V2}"
    git fetch --all
    git reset --hard "${AAVE_V2_VERSION}"
  )
}

#
# Patch
#

function patch_aave_v2() {
  echo "Patching Aave V2"

  patch -p1 --directory="${REPO_DIR_AAVE_V2}" < \
    "${DEPENDS_DIR_AAVE_V2}/0001-feat-add-owner-constructor-parameter-to-support-CREA.patch"
  patch -p1 --directory="${REPO_DIR_AAVE_V2}" < \
    "${DEPENDS_DIR_AAVE_V2}/0002-Make-initialization-state-public.patch"
}

#
# Build
#

function build_aave_v2() {
  : # No build step
}

#
# Install
#

function install_aave_v2() {
  echo "Installing Aave V2"

  # Install Aave V2 contracts
  rm -rf "${INSTALL_DIR_AAVE_V2}"
  cp -r "${REPO_DIR_AAVE_V2}/contracts" "${INSTALL_DIR_AAVE_V2}"

  # Remove problematic mock
  rm -rf "${INSTALL_DIR_AAVE_V2}/mocks/swap/MockUniswapV2Router02.sol"

  # These contracts cause an infinite recusion exception in Slither
  rm -rf "${INSTALL_DIR_AAVE_V2}/misc/UiIncentiveDataProviderV2.sol"
  rm -rf "${INSTALL_DIR_AAVE_V2}/misc/UiIncentiveDataProviderV2V3.sol"
}
