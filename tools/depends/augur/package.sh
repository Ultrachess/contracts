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
# Augur v2
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
#   * patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

AUGUR_REPO_NAME="augur"
AUGUR_VERSION="3df4c197bf462f099184c18d88ac72f2316f6fbb" # v2.1.13
AUGUR_REMOTE_REPO="https://github.com/AugurProject/${AUGUR_REPO_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_AUGUR="${DEPENDS_DIR}/chain/${AUGUR_REPO_NAME}"

# Checkout directory
REPO_DIR_AUGUR="${REPO_DIR}/${AUGUR_REPO_NAME}"

# Install directory for Augur
INSTALL_DIR_AUGUR="${INSTALL_DIR}/${AUGUR_REPO_NAME}"

#
# Checkout
#

function checkout_augur() {
  echo "Checking out Augur"

  if [ ! -d "${REPO_DIR_AUGUR}" ]; then
    git clone "${AUGUR_REMOTE_REPO}" "${REPO_DIR_AUGUR}"
  fi

  (
    cd "${REPO_DIR_AUGUR}"
    git fetch --all
    git reset --hard "${AUGUR_VERSION}"
  )
}

#
# Patch
#

function patch_augur() {
  : # No patch step
}

#
# Build
#

function build_augur() {
  # No build steps
  :
}

#
# Install
#

function install_augur() {
  echo "Installing Augur"

  # Install Augur contracts
  rm -rf "${INSTALL_DIR_AUGUR}"
  cp -r "${REPO_DIR_AUGUR}/packages/augur-core/src/contracts" "${INSTALL_DIR_AUGUR}"
}
