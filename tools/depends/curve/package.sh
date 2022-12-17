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
# Build steps for contracts used in Curve.fi exchange pools
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
#   * python3-venv
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

CURVE_NAME="curve"
CURVE_VERSION="b0bbf77f8f93c9c5f4e415bce9cd71f0cdee960e" # master
CURVE_REPO="https://github.com/curvefi/curve-contract.git"
CURVE_LICENSE="MIT"

#
# Environment paths
#

# Package definition directory
DEPENDS_DIR_CURVE="${DEPENDS_DIR}/${CURVE_NAME}"

# Checkout directory
REPO_DIR_CURVE="${REPO_DIR}/${CURVE_NAME}"

# Bytecode install directory
BYTECODE_DIR_CURVE="${BYTECODE_DIR}/${CURVE_NAME}"

# Interace install directory
INTERFACE_DIR_CURVE="${INTERFACE_DIR}/${CURVE_NAME}"

#
# Checkout
#

function checkout_curve() {
  echo "Checking out Curve"

  if [ ! -d "${REPO_DIR_CURVE}" ]; then
    git clone "${CURVE_REPO}" "${REPO_DIR_CURVE}"
  fi

  (
    cd "${REPO_DIR_CURVE}"
    git fetch --all
    git reset --hard "${CURVE_VERSION}"
  )
}

#
# Patch
#

function patch_curve() {
  echo "Patching Curve"

  patch -p1 --directory="${REPO_DIR_CURVE}" < \
    "${DEPENDS_DIR_CURVE}/0001-Pass-minter-and-initial-holder-via-construction-para.patch"

  # Remove unused pools, tokens and test contracts to save space (~170 MB of
  # bytecode) and several minutes of compile time
  rm -rf "${REPO_DIR_CURVE}/contracts/pools"/[^a]*
  rm -rf "${REPO_DIR_CURVE}/contracts/pools"/aeth
  rm -rf "${REPO_DIR_CURVE}/contracts/pool-templates"
  rm -rf "${REPO_DIR_CURVE}/contracts/testing"
  rm -rf "${REPO_DIR_CURVE}/contracts/tokens"/CurveTokenV[^3]*
}

#
# Build
#

function build_curve() {
  echo "Building Curve"

  # Build Vyper contracts
  (
    cd "${REPO_DIR_CURVE}"

    python3 -m venv .venv

    set +o nounset # Bug in python3-venv that ships with Ubuntu 18.04

    source .venv/bin/activate
    pip3 install eth-brownie
    brownie compile
    deactivate

    set -o nounset
  )

  # Generate Solidity interfaces
  (
    cd "${REPO_DIR_CURVE}"

    npm install --save-dev \
      abi-to-sol \
      prettier \
      prettier-plugin-solidity

    # Generate interfaces from ABIs
    cd "build/contracts"
    for file in *.json; do
      echo "Generating ${file%.json}.sol..."

      jq ".abi" "${file}" | \
        npx abi-to-sol \
          --license="${CURVE_LICENSE}" \
          --solidity-version=">=0.7.0" \
          "${file%.json}" > \
        "../interfaces/${file%.json}.sol"
    done

    # Format interfaces
    cd "../.."
    cp "${ROOT_DIR}/.prettierrc" .
    npx prettier -w "build/interfaces"

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

function install_curve() {
  echo "Installing Curve"

  # Install bytecode
  rm -rf "${BYTECODE_DIR_CURVE}"
  mkdir -p "${BYTECODE_DIR_CURVE}"
  cp -r "${REPO_DIR_CURVE}/build/contracts"/* "${BYTECODE_DIR_CURVE}"

  # Install interfaces
  rm -rf "${INTERFACE_DIR_CURVE}"
  mkdir -p "${INTERFACE_DIR_CURVE}"
  cp -r "${REPO_DIR_CURVE}/build/interfaces"/* "${INTERFACE_DIR_CURVE}"
}
