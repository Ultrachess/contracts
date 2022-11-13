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
# Yearn protocol
#
# SPDX-License-Identifier: MIT
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

YEARN_NAME="yearn"
YEARN_VERSION="7b7d4042f87d6e854b00de9228c01f6f587cf0c0"
YEARN_REMOTE_REPO="https://github.com/yearn/yearn-protocol.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_YEARN="${DEPENDS_DIR}/${YEARN_NAME}"

# Checkout directory
REPO_DIR_YEARN="${REPO_DIR}/${YEARN_NAME}"

# Install directory for Yearn contracts
INSTALL_DIR_YEARN="${INSTALL_DIR}/${YEARN_NAME}"

# Install directory for Yearn interfaces
INTERFACE_DIR_YEARN="${INTERFACE_DIR}/${YEARN_NAME}"

#
# Checkout
#

function checkout_yearn() {
  echo "Checking out Yearn"

  if [ ! -d "${REPO_DIR_YEARN}" ]; then
    git clone "${YEARN_REMOTE_REPO}" "${REPO_DIR_YEARN}"
  fi

  (
    cd "${REPO_DIR_YEARN}"
    git fetch --all
    git reset --hard "${YEARN_VERSION}"
  )
}

#
# Patch
#

function patch_yearn() {
  echo "Patching Yearn"

  # Patch package
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0001-Delegate-OpenZeppelin-versioning-to-dependency-manag.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0002-Convert-to-OpenZeppelin-3.0.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0003-Move-interfaces-to-Solidity-0.6.12.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0004-Move-contracts-to-Solidity-0.6.12.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0005-feat-Add-supplyRatePerBlock-to-Compound-interface.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0006-Rename-Controller-to-YearnController.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0007-Use-construction-parameters-for-contract-roles.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0008-Use-Canonical-WETH-from-depends.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0009-Rename-Curve-DAO-contracts.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0010-Use-interfaces-directory-from-depends.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0011-Use-OpenZeppelin-V3-from-depends.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0012-Rename-LendingPoolAddressesProvider-to-LendingPoolAd.patch"
}

#
# Build
#

function build_yearn() {
  : # No build step
}

#
# Install
#

function install_yearn() {
  echo "Installing Yearn"

  # Install contracts
  rm -rf "${INSTALL_DIR_YEARN}"
  cp -r "${REPO_DIR_YEARN}/contracts" "${INSTALL_DIR_YEARN}"

  # Install interfaces
  for protocol in \
    aave \
    compound \
    cream \
    dforce \
    maker \
    uniswap \
    yearn \
  ; do
    rm -rf "${INTERFACE_DIR}/${protocol}"
    cp -r "${REPO_DIR_YEARN}/interfaces/${protocol}" "${INTERFACE_DIR}/${protocol}"
  done

  # Rename Aave interface folder
  rm -rf "${INTERFACE_DIR}/aave-v1"
  mv "${INTERFACE_DIR}/aave" "${INTERFACE_DIR}/aave-v1"

  # Install custom curve interfaces
  mkdir -p "${INTERFACE_DIR}/curve"
  cp "${REPO_DIR_YEARN}/interfaces/curve/Curve.sol" "${INTERFACE_DIR}/curve"
  cp "${REPO_DIR_YEARN}/interfaces/curve/Gauge.sol" "${INTERFACE_DIR}/curve"

  # ...but don't include test or exploit contracts
  rm -rf "${INSTALL_DIR_YEARN}/exploits"
  rm -rf "${INSTALL_DIR_YEARN}/test"
}
