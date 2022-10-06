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
# uniswap-lib: Solidity libraries that are shared across Uniswap contracts
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files
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

UNISWAP_LIB_NAME="uniswap-lib"
UNISWAP_LIB_VERSION="c01640b0f0f1d8a85cba8de378cc48469fcfd9a6"
UNISWAP_LIB_REPO="https://github.com/Uniswap/${UNISWAP_LIB_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_UNISWAP_LIB="${DEPENDS_DIR}/${UNISWAP_LIB_NAME}"

# Checkout directory
REPO_DIR_UNISWAP_LIB="${REPO_DIR}/${UNISWAP_LIB_NAME}"

# Install directory
INSTALL_DIR_UNISWAP_LIB="${INSTALL_DIR}/${UNISWAP_LIB_NAME}"

#
# Checkout
#

function checkout_uniswap_lib() {
  echo "Checking out Uniswap Lib"

  if [ ! -d "${REPO_DIR_UNISWAP_LIB}" ]; then
    git clone "${UNISWAP_LIB_REPO}" "${REPO_DIR_UNISWAP_LIB}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_LIB}"
    git fetch --all
    git reset --hard "${UNISWAP_LIB_VERSION}"
  )
}

#
# Patch
#

function patch_uniswap_lib() {
  echo "Patching Uniswap Lib"

  patch -p1 --directory="${REPO_DIR_UNISWAP_LIB}" < \
    "${DEPENDS_DIR_UNISWAP_LIB}/0001-Fix-compiler-error.patch"
}

#
# Build
#

function build_uniswap_lib() {
  : # No build step
}

#
# Install
#

function install_uniswap_lib() {
  echo "Installing Uniswap Lib"

  rm -rf "${INSTALL_DIR_UNISWAP_LIB}"
  cp -r "${REPO_DIR_UNISWAP_LIB}/contracts" "${INSTALL_DIR_UNISWAP_LIB}"

  # Remove test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_LIB}/test"

  # Unistall problematic files
  rm "${INSTALL_DIR_UNISWAP_LIB}/libraries/BitMath.sol"
  rm "${INSTALL_DIR_UNISWAP_LIB}/libraries/FixedPoint.sol"
  rm "${INSTALL_DIR_UNISWAP_LIB}/libraries/FullMath.sol"
}
