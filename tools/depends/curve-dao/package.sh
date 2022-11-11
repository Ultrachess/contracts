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
# Curve DAO contracts
#
# SPDX-License-Identifier: MIT
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files
#   * REPO_DIR - Place to download the repo
#   * BYTECODE_DIR - Place to install the bytecode files
#
# Dependencies:
#
#   * git
#   * patch
#   * python3
#   * python3-venv
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

CURVE_DAO_NAME="curve-dao"
CURVE_DAO_VERSION="3bee979b7b6293c9e7654ee7dfbf5cc9ff40ca58" # master
CURVE_DAO_REPO="https://github.com/curvefi/curve-dao-contracts.git"

#
# Environment paths
#

# Package definition directory
DEPENDS_DIR_CURVE_DAO="${DEPENDS_DIR}/${CURVE_DAO_NAME}"

# Checkout directory
REPO_DIR_CURVE_DAO="${REPO_DIR}/${CURVE_DAO_NAME}"

# Install directory
BYTECODE_DIR_CURVE_DAO="${BYTECODE_DIR}/${CURVE_DAO_NAME}"

#
# Checkout
#

function checkout_curve_dao() {
  echo "Checking out Curve DAO"

  if [ ! -d "${REPO_DIR_CURVE_DAO}" ]; then
    git clone "${CURVE_DAO_REPO}" "${REPO_DIR_CURVE_DAO}"
  fi

  (
    cd "${REPO_DIR_CURVE_DAO}"
    git fetch --all
    git reset --hard "${CURVE_DAO_VERSION}"
  )
}

#
# Patch
#

function patch_curve_dao() {
  echo "Patching Curve DAO"

  patch -p1 --directory="${REPO_DIR_CURVE_DAO}" < \
    "${DEPENDS_DIR_CURVE_DAO}/0001-Use-construction-params-for-CREATE2-factory-deployme.patch"

  # Remove test contracts to save space and compile time
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/testing"

  # Remove unused contracts to save space and compile time
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/bridging"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/burners"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/gauges"/[^L]*
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/gauges"/LiquidityGauge[^.]*
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/streamers"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/vests"

  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/CryptoPoolProxy.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/FeeDistributor.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/GaugeProxy.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/PoolProxy.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/PoolProxySidechain.vy"
}

#
# Build
#

function build_curve_dao() {
  echo "Building Curve DAO"

  (
    cd "${REPO_DIR_CURVE_DAO}"
    python3 -m venv .
    set +o nounset # Bug in python3-venv that ships with Ubuntu 18.04
    source bin/activate
    pip3 install eth-brownie
    brownie compile
    deactivate
    set -o nounset
  )
}

#
# Install
#

function install_curve_dao() {
  echo "Installing Curve DAO"

  rm -rf "${BYTECODE_DIR_CURVE_DAO}"
  mkdir -p "${BYTECODE_DIR_CURVE_DAO}"
  cp -r "${REPO_DIR_CURVE_DAO}/build/contracts"/* "${BYTECODE_DIR_CURVE_DAO}"
}
