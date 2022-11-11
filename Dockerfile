# syntax=docker.io/docker/dockerfile:1.4
# Need to use Debian-based image because solc >= 0.6 requires modern glibc instead of musl
FROM node:18.10.0-bullseye-slim as base

# This stage installs system dependencies for building the node projects
FROM base as builder

# Install build dependencies
RUN <<EOF
apt-get update
DEBIAN_FRONTEND="noninteractive" apt-get install -y \
  bash \
  git \
  make \
  patch \
  python3 \
  python3-venv \
  tar \
  wget
rm -rf /var/lib/apt/lists/*
EOF


# This stage copies the project and build it
FROM builder as contract-builder

# Build
COPY . /app/contracts
WORKDIR /app/contracts
RUN yarn install --non-interactive
RUN yarn package

# This stage is runtime image for rollups (hardhat)
FROM base as contract-deployer

# Copy yarn build
COPY --from=contract-builder /app /app
WORKDIR /app/contracts

ENTRYPOINT ["npx", "hardhat"]
CMD ["deploy"]
