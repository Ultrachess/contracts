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
# Core smart contracts of Uniswap V3
#
# SPDX-License-Identifier: BUSL-1.1
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files (TODO)
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

UNISWAP_V3_CORE_NAME="uniswap-v3-core"
UNISWAP_V3_CORE_VERSION="8f3e4645a08850d2335ead3d1a8d0c64fa44f222" # master
UNISWAP_V3_CORE_REPO="https://github.com/Uniswap/v3-core.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_UNISWAP_V3_CORE="${DEPENDS_DIR}/${UNISWAP_V3_CORE_NAME}"

# Checkout directory
REPO_DIR_UNISWAP_V3_CORE="${REPO_DIR}/${UNISWAP_V3_CORE_NAME}"

# Install directory for Uniswap V3 Core
INSTALL_DIR_UNISWAP_V3_CORE="${INSTALL_DIR}/${UNISWAP_V3_CORE_NAME}"

# Install directory for Uniswap V3 Core interfaces
INTERFACE_DIR_UNISWAP_V3_CORE="${INTERFACE_DIR}/${UNISWAP_V3_CORE_NAME}"

#
# Checkout
#

function checkout_uniswap_v3_core() {
  echo "Checking out Uniswap V3 Core"

  if [ ! -d "${REPO_DIR_UNISWAP_V3_CORE}" ]; then
    git clone "${UNISWAP_V3_CORE_REPO}" "${REPO_DIR_UNISWAP_V3_CORE}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V3_CORE}"
    git fetch --all
    git reset --hard "${UNISWAP_V3_CORE_VERSION}"
  )
}

#
# Patch
#

function patch_uniswap_v3_core() {
  echo "Patching Uniswap V3 Core"

  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_CORE}" < \
    "${DEPENDS_DIR_UNISWAP_V3_CORE}/0001-Fix-compiler-errors.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_CORE}" < \
    "${DEPENDS_DIR_UNISWAP_V3_CORE}/0002-Use-construction-parameters-for-CREATE2-factory-depl.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_CORE}" < \
    "${DEPENDS_DIR_UNISWAP_V3_CORE}/0003-Expose-LP-pool-init-code-hash.patch"
}

#
# Build
#

function build_uniswap_v3_core() {
  : # No build step
}

#
# Install
#

function install_uniswap_v3_core() {
  echo "Installing Uniswap V3 Core"

  # Install Uniswap V3 Core contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_CORE}"
  cp -r "${REPO_DIR_UNISWAP_V3_CORE}/contracts" "${INSTALL_DIR_UNISWAP_V3_CORE}"

  # Remove test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_CORE}/test"

  # Install Uniswap V3 Core interfaces
  cp -r "${REPO_DIR_UNISWAP_V3_CORE}/contracts/interfaces" "${INTERFACE_DIR_UNISWAP_V3_CORE}"
}
