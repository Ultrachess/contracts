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
# OpenZeppelin 3.0
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

OPENZEPPELIN_V3_NAME="openzeppelin-v3"
OPENZEPPELIN_V3_VERSION="8e0296096449d9b1cd7c5631e917330635244c37" # 3.4.2
OPENZEPPELIN_V3_REPO="https://github.com/OpenZeppelin/openzeppelin-contracts.git"

#
# Environment paths
#

# Package definition directory
DEPENDS_DIR_OPENZEPPELIN_V3="${DEPENDS_DIR}/${OPENZEPPELIN_V3_NAME}"

# Checkout directory
REPO_DIR_OPENZEPPELIN_V3="${REPO_DIR}/${OPENZEPPELIN_V3_NAME}"

# Install directory for OpenZeppelin
INSTALL_DIR_OPENZEPPELIN_V3="${INSTALL_DIR}/${OPENZEPPELIN_V3_NAME}"

#
# Checkout
#

function checkout_openzeppelin_v3() {
  echo "Checking out OpenZeppelin V3"

  if [ ! -d "${REPO_DIR_OPENZEPPELIN_V3}" ]; then
    git clone "${OPENZEPPELIN_V3_REPO}" "${REPO_DIR_OPENZEPPELIN_V3}"
  fi

  (
    cd "${REPO_DIR_OPENZEPPELIN_V3}"
    git fetch --all
    git reset --hard "${OPENZEPPELIN_V3_VERSION}"
  )
}

#
# Patch
#

function patch_openzeppelin_v3() {
  echo "Patching OpenZeppelin V3"

  patch -p1 --directory="${REPO_DIR_OPENZEPPELIN_V3}" < \
    "${DEPENDS_DIR_OPENZEPPELIN_V3}/0001-Fix-compiler-error.patch"
  patch -p1 --directory="${REPO_DIR_OPENZEPPELIN_V3}" < \
    "${DEPENDS_DIR_OPENZEPPELIN_V3}/0002-Make-ERC1155.uri-public.patch"
  patch -p1 --directory="${REPO_DIR_OPENZEPPELIN_V3}" < \
    "${DEPENDS_DIR_OPENZEPPELIN_V3}/0003-Relax-Solidity-version-in-token-presets.patch"
}

#
# Build
#

function build_openzeppelin_v3() {
  : # No build step
}

#
# Install
#

function install_openzeppelin_v3() {
  echo "Installing OpenZeppelin V3"

  # Install OpenZeppelin contracts
  rm -rf "${INSTALL_DIR_OPENZEPPELIN_V3}"
  cp -r "${REPO_DIR_OPENZEPPELIN_V3}/contracts" "${INSTALL_DIR_OPENZEPPELIN_V3}"

  # Remove unused mocks
  rm -rf "${INSTALL_DIR_OPENZEPPELIN_V3}/mocks"

  # Remove non-Solidity files
  find "${INSTALL_DIR_OPENZEPPELIN_V3}" -type f ! -name "*.sol" -delete
}
