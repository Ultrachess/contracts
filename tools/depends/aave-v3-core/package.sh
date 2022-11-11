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
# Aave V3 core protocol
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

AAVE_V3_CORE_NAME="aave-v3-core"
AAVE_V3_CORE_VERSION="94e571f3a7465201881a59555314cd550ccfda57" # master
AAVE_V3_CORE_REPO="https://github.com/aave/${AAVE_V3_CORE_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_AAVE_V3_CORE="${DEPENDS_DIR}/${AAVE_V3_CORE_NAME}"

# Checkout directory
REPO_DIR_AAVE_V3_CORE="${REPO_DIR}/${AAVE_V3_CORE_NAME}"

# Install directory for Aave V3 Core
INSTALL_DIR_AAVE_V3_CORE="${INSTALL_DIR}/${AAVE_V3_CORE_NAME}"

#
# Checkout
#

function checkout_aave_v3_core() {
  echo "Checking out Aave V3 Core"

  if [ ! -d "${REPO_DIR_AAVE_V3_CORE}" ]; then
    git clone "${AAVE_V3_CORE_REPO}" "${REPO_DIR_AAVE_V3_CORE}"
  fi

  (
    cd "${REPO_DIR_AAVE_V3_CORE}"
    git fetch --all
    git reset --hard "${AAVE_V3_CORE_VERSION}"
  )
}

#
# Patch
#

function patch_aave_v3_core() {
  : # No patch step
}

#
# Build
#

function build_aave_v3_core() {
  : # No build step
}

#
# Install
#

function install_aave_v3_core() {
  echo "Installing Aave V3 Core"

  # Install Aave V3 Core contracts
  rm -rf "${INSTALL_DIR_AAVE_V3_CORE}"
  cp -r "${REPO_DIR_AAVE_V3_CORE}/contracts" "${INSTALL_DIR_AAVE_V3_CORE}"
}
