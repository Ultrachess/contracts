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
# OpenZeppelin V2
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
#   * npm
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

OPENZEPPELIN_V2_NAME="openzeppelin-v2"
OPENZEPPELIN_V2_PACKAGE="@openzeppelin/contracts"
OPENZEPPELIN_V2_VERSION="2.5.1"
OPENZEPPELIN_V2_TARBALL="$(npm view ${OPENZEPPELIN_V2_PACKAGE}@${OPENZEPPELIN_V2_VERSION} dist.tarball)"
OPENZEPPELIN_V2_ARCHIVE_NAME="${OPENZEPPELIN_V2_NAME}-${OPENZEPPELIN_V2_VERSION}.tar.gz"

#
# Environment paths and directories
#

# Package definition directory
DEPENDS_DIR_OPENZEPPELIN_V2="${DEPENDS_DIR}/${OPENZEPPELIN_V2_NAME}"

# Checkout directory
REPO_DIR_OPENZEPPELIN_V2="${REPO_DIR}/${OPENZEPPELIN_V2_NAME}"

# Install directory
INSTALL_DIR_OPENZEPPELIN_V2="${INSTALL_DIR}/${OPENZEPPELIN_V2_NAME}"

# Archive path
OPENZEPPELIN_V2_ARCHIVE_PATH="${REPO_DIR}/${OPENZEPPELIN_V2_ARCHIVE_NAME}"

#
# Checkout
#

function checkout_openzeppelin_v2() {
  echo "Downloading OpenZeppelin V2"

  if [ ! -f "${OPENZEPPELIN_V2_ARCHIVE_PATH}" ]; then
    wget -O "${OPENZEPPELIN_V2_ARCHIVE_PATH}" "${OPENZEPPELIN_V2_TARBALL}"
  fi

  echo "Extracting OpenZeppelin V2"

  rm -rf "${REPO_DIR_OPENZEPPELIN_V2}"
  mkdir -p "${REPO_DIR_OPENZEPPELIN_V2}"
  tar -xzf "${OPENZEPPELIN_V2_ARCHIVE_PATH}" -C "${REPO_DIR_OPENZEPPELIN_V2}" --strip-components=1 --overwrite
}

#
# Patch
#

function patch_openzeppelin_v2() {
  : # No patch step
}

#
# Build
#

function build_openzeppelin_v2() {
  : # No build step
}

#
# Install
#

function install_openzeppelin_v2() {
  echo "Installing OpenZeppelin V2"

  rm -rf "${INSTALL_DIR_OPENZEPPELIN_V2}"
  cp -r "${REPO_DIR_OPENZEPPELIN_V2}" "${INSTALL_DIR_OPENZEPPELIN_V2}"

  # Remove non-Solidity files
  find "${INSTALL_DIR_OPENZEPPELIN_V2}" -type f ! -name "*.sol" -delete
}
