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
# Canonical liquidity mining contract for Uniswap V3
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files
#   * REPO_DIR - Place to download the repo
#   * INSTALL_DIR - Place to install the contract files
#   * INTERFACE_DIR - Place to install the contract interfaces
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

UNISWAP_V3_STAKER_NAME="uniswap-v3-staker"
UNISWAP_V3_STAKER_VERSION="4328b957701de8bed83689aa22c32eda7928d5ab" # main
UNISWAP_V3_STAKER_REPO="https://github.com/Uniswap/v3-staker.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_UNISWAP_V3_STAKER="${DEPENDS_DIR}/${UNISWAP_V3_STAKER_NAME}"

# Checkout directory
REPO_DIR_UNISWAP_V3_STAKER="${REPO_DIR}/${UNISWAP_V3_STAKER_NAME}"

# Install directory
INSTALL_DIR_UNISWAP_V3_STAKER="${INSTALL_DIR}/${UNISWAP_V3_STAKER_NAME}"

# Install directory for Aave V2 interfaces
INTERFACE_DIR_UNISWAP_V3_STAKER="${INTERFACE_DIR}/${UNISWAP_V3_STAKER_NAME}"

#
# Checkout
#

function checkout_uniswap_v3_staker() {
  echo "Checking out Uniswap V3 Staker"

  if [ ! -d "${REPO_DIR_UNISWAP_V3_STAKER}" ]; then
    git clone "${UNISWAP_V3_STAKER_REPO}" "${REPO_DIR_UNISWAP_V3_STAKER}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V3_STAKER}"
    git fetch --all
    git reset --hard "${UNISWAP_V3_STAKER_VERSION}"
  )
}

#
# Patch
#

function patch_uniswap_v3_staker() {
  echo "Patching Uniswap V3 Staker"

  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_STAKER}" < \
    "${DEPENDS_DIR_UNISWAP_V3_STAKER}/0001-Use-dependencies-from-depends-system.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_STAKER}" < \
    "${DEPENDS_DIR_UNISWAP_V3_STAKER}/0002-Fix-duplicate-symbol-error.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_STAKER}" < \
    "${DEPENDS_DIR_UNISWAP_V3_STAKER}/0003-Allow-inteface-to-be-used-with-newer-version-of-Soli.patch"
}

#
# Build
#

function build_uniswap_v3_staker() {
  : # No build step
}

#
# Install
#

function install_uniswap_v3_staker() {
  echo "Installing Uniswap V3 Staker"

  rm -rf "${INSTALL_DIR_UNISWAP_V3_STAKER}"
  cp -r "${REPO_DIR_UNISWAP_V3_STAKER}/contracts" "${INSTALL_DIR_UNISWAP_V3_STAKER}"

  # Remove test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_STAKER}/test"

  # Install and patch Uniswap V3 Staker interface. This is needed because an
  # older version of OpenZeppelin is used in the interface, so we copy the
  # interfaces and patch in the new version.
  rm -rf "${INTERFACE_DIR_UNISWAP_V3_STAKER}"
  mkdir -p "${INTERFACE_DIR_UNISWAP_V3_STAKER}"
  for file in \
      IUniswapV3Staker.sol \
  ; do
    cp "${REPO_DIR_UNISWAP_V3_STAKER}/contracts/interfaces/${file}" "${INTERFACE_DIR_UNISWAP_V3_STAKER}"

    # Patch Uniswap V3 Periphery interfaces to use compatible version of OpenZeppelin
    sed -i 's|../../openzeppelin-v3/|@openzeppelin/contracts/|g' \
      "${INTERFACE_DIR_UNISWAP_V3_STAKER}/${file}"
    sed -i 's|../../uniswap-v3-periphery/interfaces/|../uniswap-v3-periphery/|g' \
      "${INTERFACE_DIR_UNISWAP_V3_STAKER}/${file}"
    sed -i 's|../../../interfaces/uniswap-v3-core/|../uniswap-v3-core/|g' \
      "${INTERFACE_DIR_UNISWAP_V3_STAKER}/${file}"
  done
}
