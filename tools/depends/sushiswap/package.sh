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
# SushiSwap 2.0
#
# SPDX-License-Identifier: MIT
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
#   * npx (installed with Node)
#   * patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

SUSHISWAP_NAME="sushiswap"
SUSHISWAP_VERSION="56cedd0e06a6cf665083b3a662f9f77b80303ebe" # origin/archieve/canary (SIC)
SUSHISWAP_REMOTE_REPO="https://github.com/sushiswap/sushiswap.git"

#
# Environment paths
#

# Package definition directory
DEPENDS_DIR_SUSHISWAP="${DEPENDS_DIR}/${SUSHISWAP_NAME}"

# Checkout directory
REPO_DIR_SUSHISWAP="${REPO_DIR}/${SUSHISWAP_NAME}"

# Install directory for SushiSwap
INSTALL_DIR_SUSHISWAP="${INSTALL_DIR}/${SUSHISWAP_NAME}"

#
# Checkout
#

function checkout_sushiswap() {
  echo "Checking out SushiSwap"

  if [ ! -d "${REPO_DIR_SUSHISWAP}" ]; then
    git clone "${SUSHISWAP_REMOTE_REPO}" "${REPO_DIR_SUSHISWAP}"
  fi

  (
    cd "${REPO_DIR_SUSHISWAP}"
    git fetch --all
    git reset --hard "${SUSHISWAP_VERSION}"
  )
}

#
# Patch
#

function patch_sushiswap() {
  echo "Patching SushiSwap"

  patch -p1 --directory="${REPO_DIR_SUSHISWAP}" < \
    "${DEPENDS_DIR_SUSHISWAP}/0001-Silence-compiler-warning.patch"
  patch -p1 --directory="${REPO_DIR_SUSHISWAP}" < \
    "${DEPENDS_DIR_SUSHISWAP}/0002-Parametize-LP-init-code-hash.patch"
  patch -p1 --directory="${REPO_DIR_SUSHISWAP}" < \
    "${DEPENDS_DIR_SUSHISWAP}/0003-Use-OpenZeppelin-from-depends-system.patch"
  patch -p1 --directory="${REPO_DIR_SUSHISWAP}" < \
    "${DEPENDS_DIR_SUSHISWAP}/0004-Provide-owner-via-constructor-to-allow-for-delegated.patch"
  patch -p1 --directory="${REPO_DIR_SUSHISWAP}" < \
    "${DEPENDS_DIR_SUSHISWAP}/0005-Allow-interfaces-to-be-forward-compatible.patch"
}

#
# Build
#

function build_sushiswap() {
  : # No build step
}

#
# Install
#

function install_sushiswap() {
  echo "Installing SushiSwap"

  # Install SushiSwap contracts
  rm -rf "${INSTALL_DIR_SUSHISWAP}"
  cp -r "${REPO_DIR_SUSHISWAP}/contracts" "${INSTALL_DIR_SUSHISWAP}"

  # Uninstall mocks
  #rm -rf "${INSTALL_DIR_SUSHISWAP}/mocks"
}
