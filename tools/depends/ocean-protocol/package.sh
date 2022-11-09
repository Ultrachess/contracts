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
# ocean-protocol: Smart contracts for Ocean Protocol
#
# SPDX-License-Identifier: Apache-2.0 AND CC-BY-4.0
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
#   * patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

OCEAN_PROTOCOL_NAME="ocean-protocol"
OCEAN_PROTOCOL_VERSION="201f5a6daf5960f4cbf99ab9145330a5289e7a28" # v1.1.8
OCEAN_PROTOCOL_REPO="https://github.com/oceanprotocol/contracts.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_OCEAN_PROTOCOL="${DEPENDS_DIR}/${OCEAN_PROTOCOL_NAME}"

# Checkout directory
REPO_DIR_OCEAN_PROTOCOL="${REPO_DIR}/${OCEAN_PROTOCOL_NAME}"

# Install directory
INSTALL_DIR_OCEAN_PROTOCOL="${INSTALL_DIR}/${OCEAN_PROTOCOL_NAME}"

#
# Checkout
#

function checkout_ocean_protocol() {
  echo "Checking out Ocean Protocol"

  if [ ! -d "${REPO_DIR_OCEAN_PROTOCOL}" ]; then
    git clone "${OCEAN_PROTOCOL_REPO}" "${REPO_DIR_OCEAN_PROTOCOL}"
  fi

  (
    cd "${REPO_DIR_OCEAN_PROTOCOL}"
    git fetch --all
    git reset --hard "${OCEAN_PROTOCOL_VERSION}"
  )
}

#
# Patch
#

function patch_ocean_protocol() {
  echo "Patching Ocean Protocol"

  patch -p1 --directory="${REPO_DIR_OCEAN_PROTOCOL}" < \
    "${DEPENDS_DIR_OCEAN_PROTOCOL}/0001-Update-to-Solidity-0.8.16.patch"
}

#
# Build
#

function build_ocean_protocol() {
  : # No build step
}

#
# Install
#

function install_ocean_protocol() {
  echo "Installing Ocean Protocol"

  rm -rf "${INSTALL_DIR_OCEAN_PROTOCOL}"
  cp -r "${REPO_DIR_OCEAN_PROTOCOL}/contracts" "${INSTALL_DIR_OCEAN_PROTOCOL}"
}
