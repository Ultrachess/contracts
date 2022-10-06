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
# Peripheral smart contracts for Uniswap V3
#
# SPDX-License-Identifier: BUSL-1.1
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

UNISWAP_V3_PERIPHERY_NAME="uniswap-v3-periphery"
UNISWAP_V3_PERIPHERY_VERSION="22a7ead071fff53f00d9ddc13434f285f4ed5c7d" # 1.4.1
UNISWAP_V3_PERIPHERY_REPO="https://github.com/Uniswap/v3-periphery.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_UNISWAP_V3_PERIPHERY="${DEPENDS_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

# Checkout directory
REPO_DIR_UNISWAP_V3_PERIPHERY="${REPO_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

# Install directory for Uniswap V3 Periphery contracts
INSTALL_DIR_UNISWAP_V3_PERIPHERY="${INSTALL_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

#
# Checkout
#

function checkout_uniswap_v3_periphery() {
  echo "Checking out Uniswap V3 Periphery"

  if [ ! -d "${REPO_DIR_UNISWAP_V3_PERIPHERY}" ]; then
    git clone "${UNISWAP_V3_PERIPHERY_REPO}" "${REPO_DIR_UNISWAP_V3_PERIPHERY}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V3_PERIPHERY}"
    git fetch --all
    git reset --hard "${UNISWAP_V3_PERIPHERY_VERSION}"
  )
}

#
# Patch
#

function patch_uniswap_v3_periphery() {
  echo "Patching Uniswap V3 Periphery"

  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0001-Delegate-import-locations-to-dependency-management.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0002-Fix-compiler-errors.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0003-Remove-internal-dependency-from-interface.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0004-Parameterize-LP-pool-init-code-hash.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0005-Make-interface-forward-compatible.patch"
}

#
# Build
#

function build_uniswap_v3_periphery() {
  : # No build step
}

#
# Install
#

function install_uniswap_v3_periphery() {
  echo "Installing Uniswap V3 Periphery"

  # Install Uniswap V3 Periphery contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}"
  cp -r "${REPO_DIR_UNISWAP_V3_PERIPHERY}/contracts" "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}"

  # Remove test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}/test"

  # Remove V2 to V3 migrator, as it depends on UniV2 headers
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}/V3Migrator.sol"
}
