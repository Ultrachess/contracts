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
# Canonical W-ETH package. See:
#
#   https://blog.0xproject.com/cartesi-token-a9aa7d0279dd)
#
# The version used here is v1.4.0, released 2019-02-28.
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files
#   * REPO_DIR - Place to download the repo
#   * INSTALL_DIR - Place to install the contract files
#
# Dependencies:
#
#   * npm
#   * patch
#   * tar
#   * wget
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#
# NOTE: Dependency version should match package version in node_modules
#

CARTESI_TOKEN_NAME="cartesi-token"
CARTESI_TOKEN_PACKAGE="@cartesi/token"
CARTESI_TOKEN_VERSION="1.7.0"
CARTESI_TOKEN_TARBALL="$(npm view ${CARTESI_TOKEN_PACKAGE}@${CARTESI_TOKEN_VERSION} dist.tarball)"
CARTESI_TOKEN_ARCHIVE_NAME="${CARTESI_TOKEN_NAME}-${CARTESI_TOKEN_VERSION}.tar.gz"

#
# Environment paths and directories
#

# Package definition directory
DEPENDS_DIR_CARTESI_TOKEN="${DEPENDS_DIR}/${CARTESI_TOKEN_NAME}"

# Checkout directory
REPO_DIR_CARTESI_TOKEN="${REPO_DIR}/${CARTESI_TOKEN_NAME}"

# Install directory
INSTALL_DIR_CARTESI_TOKEN="${INSTALL_DIR}/${CARTESI_TOKEN_NAME}"

# Archive path
CARTESI_TOKEN_ARCHIVE_PATH="${REPO_DIR}/${CARTESI_TOKEN_ARCHIVE_NAME}"

#
# Checkout
#

function checkout_cartesi_token() {
  echo "Downloading Cartesi token"

  if [ ! -f "${CARTESI_TOKEN_ARCHIVE_PATH}" ]; then
    wget -O "${CARTESI_TOKEN_ARCHIVE_PATH}" "${CARTESI_TOKEN_TARBALL}"
  fi

  echo "Extracting Cartesi token"

  rm -rf "${REPO_DIR_CARTESI_TOKEN}"
  mkdir -p "${REPO_DIR_CARTESI_TOKEN}"
  tar -xzf "${CARTESI_TOKEN_ARCHIVE_PATH}" -C "${REPO_DIR_CARTESI_TOKEN}" --strip-components=1 --overwrite
}

#
# Patch
#

function patch_cartesi_token() {
  echo "Patching Cartesi token"

  patch -p1 --directory="${REPO_DIR_CARTESI_TOKEN}" < \
    "${DEPENDS_DIR_CARTESI_TOKEN}/0001-Delegate-import-locations-to-depends-system.patch"
  patch -p1 --directory="${REPO_DIR_CARTESI_TOKEN}" < \
    "${DEPENDS_DIR_CARTESI_TOKEN}/0002-Parameterize-initial-beneficiary-of-CTSI-for-CREATE2.patch"
}

#
# Build
#

function build_cartesi_token() {
  : # No build step
}

#
# Install
#

function install_cartesi_token() {
  echo "Installing Cartesi token"

  rm -rf "${INSTALL_DIR_CARTESI_TOKEN}"
  cp -r "${REPO_DIR_CARTESI_TOKEN}/contracts" "${INSTALL_DIR_CARTESI_TOKEN}"
}
