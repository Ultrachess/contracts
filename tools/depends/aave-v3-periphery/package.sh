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
# Aave V3 peripheral contracts
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
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

AAVE_V3_PERIPHERY_NAME="aave-v3-periphery"
AAVE_V3_PERIPHERY_VERSION="594013adcff5c5e02672bfad71030739db1cd132" # v1.20.0 (2022-10-21)
AAVE_V3_PERIPHERY_REPO="https://github.com/aave/${AAVE_V3_PERIPHERY_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_AAVE_V3_PERIPHERY="${DEPENDS_DIR}/${AAVE_V3_PERIPHERY_NAME}"

# Checkout directory
REPO_DIR_AAVE_V3_PERIPHERY="${REPO_DIR}/${AAVE_V3_PERIPHERY_NAME}"

# Install directory for Aave V3 Periphery
INSTALL_DIR_AAVE_V3_PERIPHERY="${INSTALL_DIR}/${AAVE_V3_PERIPHERY_NAME}"

#
# Checkout
#

function checkout_aave_v3_periphery() {
  echo "Checking out Aave V3 Periphery"

  if [ ! -d "${REPO_DIR_AAVE_V3_PERIPHERY}" ]; then
    git clone "${AAVE_V3_PERIPHERY_REPO}" "${REPO_DIR_AAVE_V3_PERIPHERY}"
  fi

  (
    cd "${REPO_DIR_AAVE_V3_PERIPHERY}"
    git fetch --all
    git reset --hard "${AAVE_V3_PERIPHERY_VERSION}"
  )
}

#
# Patch
#

function patch_aave_v3_periphery() {
  echo "Patching Aave V3 Periphery"

  patch -p1 --directory="${REPO_DIR_AAVE_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_AAVE_V3_PERIPHERY}/0001-Use-Aave-V3-Core-from-depends.patch"
}

#
# Build
#

function build_aave_v3_periphery() {
  : # No build step
}

#
# Install
#

function install_aave_v3_periphery() {
  echo "Installing Aave V3 Periphery"

  # Install Aave V3 Periphery contracts
  rm -rf "${INSTALL_DIR_AAVE_V3_PERIPHERY}"
  cp -r "${REPO_DIR_AAVE_V3_PERIPHERY}/contracts" "${INSTALL_DIR_AAVE_V3_PERIPHERY}"
}
