# syntax=docker.io/docker/dockerfile:1.4
# Need to use Debian-based image because solc >= 0.6 requires modern glibc instead of musl
FROM node:18.12.1-bullseye-slim as base

# This stage installs system dependencies for building the node projects
FROM base as builder

# Install build dependencies
RUN <<EOF
apt-get update
DEBIAN_FRONTEND="noninteractive" apt-get install -y \
  bash \
  git \
  jq \
  make \
  patch \
  python3 \
  python3-venv \
  tar \
  wget
rm -rf /var/lib/apt/lists/*
EOF


# This stage copies the project and build it
FROM builder as ultrachess-builder

WORKDIR /app/contracts

# Build depends
COPY tools tools
COPY .prettierrc .
RUN ./tools/build-depends.sh

# Clean up depends
RUN rm -rf tools

# Install yarn dependencies
COPY package.json yarn.lock .
RUN yarn install --non-interactive

# Build contracts and typechain code
COPY contracts/src contracts/src
COPY contracts/test contracts/test
COPY hardhat.config.ts .
RUN yarn compile

# Copy deployment scripts
COPY deploy deploy
COPY src src

# This stage is the runtime image
FROM base as ultrachess-deployer

# Pull in the latest npm to avoid update notices in the log
RUN npm install -g npm

# Copy yarn build
COPY --from=ultrachess-builder /app /app
WORKDIR /app/contracts

ENTRYPOINT ["npx", "hardhat"]
CMD ["deploy"]
