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
# Build script for dependencies
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Environment paths
#

# Get the absolute path to this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Directory of the dependency build definitions
DEPENDS_DIR="${SCRIPT_DIR}/depends"

# Directory of the downloaded repos
REPO_DIR="${SCRIPT_DIR}/repos"

# Root project directory
ROOT_DIR="${SCRIPT_DIR}/.."

# Contract directory
CONTRACT_DIR="${ROOT_DIR}/contracts"

# Depends install directory
INSTALL_DIR="${CONTRACT_DIR}/depends"

# Ensure directories exist
mkdir -p "${REPO_DIR}"
mkdir -p "${INSTALL_DIR}"

#
# Import dependencies
#

source "${DEPENDS_DIR}/canonical-weth/package.sh"
source "${DEPENDS_DIR}/cartesi-token/package.sh"
source "${DEPENDS_DIR}/openzeppelin-v2/package.sh"
source "${DEPENDS_DIR}/openzeppelin-v3/package.sh"
source "${DEPENDS_DIR}/uniswap-lib/package.sh"
source "${DEPENDS_DIR}/uniswap-v3-core/package.sh"
source "${DEPENDS_DIR}/uniswap-v3-periphery/package.sh"

#
# Checkout dependencies
#

checkout_canonical_weth
checkout_cartesi_token
checkout_openzeppelin_v2
checkout_openzeppelin_v3
checkout_uniswap_lib
checkout_uniswap_v3_core
checkout_uniswap_v3_periphery

#
# Patch dependencies
#

patch_canonical_weth
patch_cartesi_token
patch_openzeppelin_v2
patch_openzeppelin_v3
patch_uniswap_lib
patch_uniswap_v3_core
patch_uniswap_v3_periphery

#
# Build dependencies
#

build_canonical_weth
build_cartesi_token
build_openzeppelin_v2
build_openzeppelin_v3
build_uniswap_lib
build_uniswap_v3_core
build_uniswap_v3_periphery

#
# Install dependencies
#

install_canonical_weth
install_cartesi_token
install_openzeppelin_v2
install_openzeppelin_v3
install_uniswap_lib
install_uniswap_v3_core
install_uniswap_v3_periphery
