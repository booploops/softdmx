#!/usr/bin/env bash
#
# Cloud Agent environment bootstrap for SoftDMX.
#
# Installs the non-Node toolchain the build needs (Zig for the WASM hot-path
# helpers and flatc for the FlatBuffers schemas), then installs JS
# dependencies and generates the compiled artifacts. Safe to run repeatedly.
set -euo pipefail

ZIG_VERSION="0.14.1"
FLATC_VERSION="24.12.23"
ARCH="$(uname -m)"

install_zig() {
  if command -v zig >/dev/null 2>&1 && [ "$(zig version)" = "$ZIG_VERSION" ]; then
    echo "zig ${ZIG_VERSION} already installed"
    return
  fi
  echo "Installing zig ${ZIG_VERSION}..."
  local url="https://ziglang.org/download/${ZIG_VERSION}/zig-${ARCH}-linux-${ZIG_VERSION}.tar.xz"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/zig.tar.xz" "$url"
  sudo rm -rf /opt/zig
  sudo mkdir -p /opt/zig
  sudo tar -xf "${tmp}/zig.tar.xz" -C /opt/zig --strip-components=1
  sudo ln -sf /opt/zig/zig /usr/local/bin/zig
  rm -rf "$tmp"
}

install_flatc() {
  if command -v flatc >/dev/null 2>&1 && flatc --version | grep -q "$FLATC_VERSION"; then
    echo "flatc ${FLATC_VERSION} already installed"
    return
  fi
  echo "Installing flatc ${FLATC_VERSION}..."
  local url="https://github.com/google/flatbuffers/releases/download/v${FLATC_VERSION}/Linux.flatc.binary.g++-13.zip"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/flatc.zip" "$url"
  unzip -o "${tmp}/flatc.zip" -d "$tmp" >/dev/null
  sudo install -m755 "${tmp}/flatc" /usr/local/bin/flatc
  rm -rf "$tmp"
}

install_zig
install_flatc

echo "Toolchain: node $(node --version), yarn $(yarn --version), zig $(zig version), flatc $(flatc --version)"

corepack enable >/dev/null 2>&1 || true

echo "Installing JS dependencies (yarn install)..."
yarn install --immutable

echo "Compiling FlatBuffers schemas..."
yarn workspace @softdmx/buffers compile

echo "Building WASM (zig)..."
yarn build:wasm

echo "SoftDMX environment ready."
