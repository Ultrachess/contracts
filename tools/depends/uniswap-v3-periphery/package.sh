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
# Peripheral smart contracts for Uniswap V3
#
# SPDX-License-Identifier: BUSL-1.1
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files (TODO)
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

UNISWAP_V3_PERIPHERY_NAME="uniswap-v3-periphery"
UNISWAP_V3_PERIPHERY_VERSION="6cce88e63e176af1ddb6cc56e029110289622317" # 1.4.3
UNISWAP_V3_PERIPHERY_REPO="https://github.com/Uniswap/v3-periphery.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_UNISWAP_V3_PERIPHERY="${DEPENDS_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

# Checkout directory
REPO_DIR_UNISWAP_V3_PERIPHERY="${REPO_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

# Install directory for Uniswap V3 Periphery contracts
INSTALL_DIR_UNISWAP_V3_PERIPHERY="${INSTALL_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

# Install directory for Uniswap V3 Periphery interfaces
INTERFACE_DIR_UNISWAP_V3_PERIPHERY="${INTERFACE_DIR}/${UNISWAP_V3_PERIPHERY_NAME}"

#
# Checkout
#

function checkout_uniswap_v3_periphery() {
  echo "Checking out Uniswap V3 Periphery"

  if [ ! -d "${REPO_DIR_UNISWAP_V3_PERIPHERY}" ]; then
    git clone "${UNISWAP_V3_PERIPHERY_REPO}" "${REPO_DIR_UNISWAP_V3_PERIPHERY}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V3_PERIPHERY}"
    git fetch --all
    git reset --hard "${UNISWAP_V3_PERIPHERY_VERSION}"
  )
}

#
# Patch
#

function patch_uniswap_v3_periphery() {
  echo "Patching Uniswap V3 Periphery"

  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0001-Delegate-import-locations-to-dependency-management.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0002-Fix-compiler-errors.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0003-Remove-internal-dependency-from-interface.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0004-Parameterize-LP-pool-init-code-hash.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V3_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V3_PERIPHERY}/0005-Make-interface-forward-compatible.patch"
}

#
# Build
#

function build_uniswap_v3_periphery() {
  : # No build step
}

#
# Install
#

function install_uniswap_v3_periphery() {
  echo "Installing Uniswap V3 Periphery"

  # Install Uniswap V3 Periphery contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}"
  cp -r "${REPO_DIR_UNISWAP_V3_PERIPHERY}/contracts" "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}"

  # Remove example and test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}/examples"
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}/test"

  # Remove V2 to V3 migrator, as it depends on UniV2 headers
  rm -rf "${INSTALL_DIR_UNISWAP_V3_PERIPHERY}/V3Migrator.sol"

  # Install and patch Uniswap V3 Periphery interfaces. This is needed because
  # an older version of OpenZeppelin is used in the interface, so we copy the
  # interfaces and patch in the new version.
  rm -rf "${INTERFACE_DIR_UNISWAP_V3_PERIPHERY}"
  mkdir -p "${INTERFACE_DIR_UNISWAP_V3_PERIPHERY}"
  for file in \
      IERC721Permit.sol \
      IMulticall.sol \
      INonfungiblePositionManager.sol \
      IPeripheryImmutableState.sol \
      IPeripheryPayments.sol \
      IPoolInitializer.sol \
  ; do
    cp "${REPO_DIR_UNISWAP_V3_PERIPHERY}/contracts/interfaces/${file}" "${INTERFACE_DIR_UNISWAP_V3_PERIPHERY}"

    # Patch Uniswap V3 Periphery interfaces to use compatible version of OpenZeppelin
    sed -i 's|../../openzeppelin-v3/token/ERC721/IERC721.sol|@openzeppelin/contracts/token/ERC721/IERC721.sol|g' \
      "${INTERFACE_DIR_UNISWAP_V3_PERIPHERY}/${file}"
    sed -i 's|../../openzeppelin-v3/token/ERC721/IERC721Enumerable.sol|@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol|g' \
      "${INTERFACE_DIR_UNISWAP_V3_PERIPHERY}/${file}"
    sed -i 's|../../openzeppelin-v3/token/ERC721/IERC721Metadata.sol|@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol|g' \
      "${INTERFACE_DIR_UNISWAP_V3_PERIPHERY}/${file}"
  done
}
