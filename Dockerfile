# syntax=docker.io/docker/dockerfile:1.4
# Need to use Debian-based image because solc >= 0.6 requires modern glibc instead of musl
FROM node:20-bookworm as base

# This stage installs system dependencies for building the node projects
FROM base as builder

# Install build dependencies
RUN apt update && \
  DEBIAN_FRONTEND="noninteractive" apt install -y \
    bash \
    git \
    jq \
    make \
    patch \
    tar \
    wget && \
  rm -rf /var/lib/apt/lists/*

# Build and install Python from source
ENV PYTHON_VERSION="3.11.4"
RUN wget "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz"
RUN tar -zvxf "Python-${PYTHON_VERSION}.tgz" # --directory="${PYTHON_EXTRACT_DIR}"
RUN cd "Python-${PYTHON_VERSION}" && \
  ./configure \
    --prefix="/usr" \
    --with-pydebug \
    --enable-shared
RUN make -C "Python-${PYTHON_VERSION}" -j$(getconf _NPROCESSORS_ONLN) install

# Update Python dependencies
RUN python3 -m pip install --upgrade --break-system-packages Cython pip setuptools wheel

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
