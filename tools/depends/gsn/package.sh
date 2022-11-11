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
# GSN v2 - Ethereum Gas Station Network
#
# SPDX-License-Identifier: GPL-3.0-only
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
#   * patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

GSN_NAME="gsn"
GSN_VERSION="13b69a6804e12c7f670ae0c88d90396bb6aed651" # v3.0.0-beta2
GSN_REPO="https://github.com/opengsn/gsn.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_GSN="${DEPENDS_DIR}/${GSN_NAME}"

# Checkout directory
REPO_DIR_GSN="${REPO_DIR}/${GSN_NAME}"

# Install directory for GSN contracts
INSTALL_DIR_GSN="${INSTALL_DIR}/${GSN_NAME}"

#
# Checkout
#

function checkout_gsn() {
  echo "Checking out GSN"

  if [ ! -d "${REPO_DIR_GSN}" ]; then
    git clone "${GSN_REPO}" "${REPO_DIR_GSN}"
  fi

  (
    cd "${REPO_DIR_GSN}"
    git fetch --all
    git reset --hard "${GSN_VERSION}"
  )
}

#
# Patch
#

function patch_gsn() {
  : # No patch step
}

#
# Build
#

function build_gsn() {
  : # No build step
}

#
# Install
#

function install_gsn() {
  echo "Installing GSN"

  # Install GSN contracts
  rm -rf "${INSTALL_DIR_GSN}"
  cp -r "${REPO_DIR_GSN}/packages/contracts/src" "${INSTALL_DIR_GSN}"

  # Remove test contracts
  rm -rf "${INSTALL_DIR_GSN}/test"
}
