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
#   * INTERFACE_DIR - Place to install the contract interfaces
#
# Dependencies:
#
#   * git
#   * jq
#   * npm (installed with Node)
#   * npx (installed with Node)
#   * patch
#   * python3
#   * python3-dev
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
CURVE_DAO_VERSION="567927551903f71ce5a73049e077be87111963cc" # master
CURVE_DAO_REPO="https://github.com/curvefi/curve-dao-contracts.git"
CURVE_DAO_LICENSE="MIT"

#
# Tool versions
#

ETH_BROWNIE_VERSION="1.20.5"
ETH_BROWNIE_REQUIREMENTS_URL="https://raw.github.com/eth-brownie/brownie/v${ETH_BROWNIE_VERSION}/requirements.in"

#
# Environment paths
#

# Package definition directory
DEPENDS_DIR_CURVE_DAO="${DEPENDS_DIR}/${CURVE_DAO_NAME}"

# Checkout directory
REPO_DIR_CURVE_DAO="${REPO_DIR}/${CURVE_DAO_NAME}"

# Bytecode install directory
BYTECODE_DIR_CURVE_DAO="${BYTECODE_DIR}/${CURVE_DAO_NAME}"

# Interace install directory
INTERFACE_DIR_CURVE_DAO="${INTERFACE_DIR}/${CURVE_DAO_NAME}"

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
  patch -p1 --directory="${REPO_DIR_CURVE_DAO}" < \
    "${DEPENDS_DIR_CURVE_DAO}/0002-Rename-reserved-word-in-Solidity.patch"

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

  # Build Vyper contracts
  (
    cd "${REPO_DIR_CURVE_DAO}"

    # Create virtual environment
    python3 -m venv .venv

    # Bug in python3-venv that ships with Ubuntu 18.04
    set +o nounset

    # Enter virtual environment
    source .venv/bin/activate

    # Update Python dependencies
    pip3 install --upgrade Cython pip setuptools wheel

    # Install brownie dependencies
    echo "Downloading requirements from ${ETH_BROWNIE_REQUIREMENTS_URL}"
    wget "${ETH_BROWNIE_REQUIREMENTS_URL}" -O requirements.in
    sed -i 's/^pyyaml.*//g' requirements.in
    pip3 install --upgrade -r requirements.in

    # Update PyYAML to fix Cython error
    pip3 install --upgrade PyYAML

    # Install brownie
    pip3 install --no-deps eth-brownie==${ETH_BROWNIE_VERSION}

    # Run brownie
    brownie compile

    # Leave virtual environment
    deactivate

    set -o nounset
  )

  # Generate Solidity interfaces
  (
    cd "${REPO_DIR_CURVE_DAO}"

    npm install --save-dev --update \
      abi-to-sol \
      prettier \
      prettier-plugin-solidity

    # Generate interfaces from ABIs
    cd "build/contracts"
    for file in *.json; do
      echo "Generating ${file%.json}.sol..."

      jq ".abi" "${file}" | \
        npx abi-to-sol \
          --license="${CURVE_DAO_LICENSE}" \
          --solidity-version=">=0.7.0" \
          "${file%.json}" > \
        "../interfaces/${file%.json}.sol"
    done

    # Format interfaces
    cd "../.."
    cp "${ROOT_DIR}/.prettierrc" .
    npx prettier -w "build/interfaces" || true

    # We aren't able to use abi-to-sol with version ">=0.6.0" due to the
    # following error:
    #
    #   Error: Desired Solidity range lacks unambiguous location specifier for parameter of type "address[8]".
    #
    # To work around this, we generate with version >=0.7.0, and then replace it afterward
    find "build/interfaces" -type f -name "*.sol" -exec \
      sed -i "s|pragma solidity >=0.7.0;|pragma solidity >=0.6.0;|g" {} \;
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

  # Install interfaces
  rm -rf "${INTERFACE_DIR_CURVE_DAO}"
  mkdir -p "${INTERFACE_DIR_CURVE_DAO}"
  cp -r "${REPO_DIR_CURVE_DAO}/build/interfaces"/* "${INTERFACE_DIR_CURVE_DAO}"
}
