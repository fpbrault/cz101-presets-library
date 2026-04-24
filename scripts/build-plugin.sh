#!/usr/bin/env bash
# Build the Cosmo PD-101 VST3 / AU plugin using beamer xtask
# Usage: ./scripts/build-plugin.sh [--release]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
RUST_WORKSPACE="$ROOT"
PLUGIN_BASENAME="${PLUGIN_BASENAME:-CosmoPd101}"

normalize_platform() {
  local uname_value="$1"
  case "$uname_value" in
    Darwin) echo "macos" ;;
    Linux) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

HOST_PLATFORM="$(normalize_platform "$(uname -s)")"
PLATFORM="${PLUGIN_PLATFORM:-$HOST_PLATFORM}"

PROFILE="${1:-release}"
BUILD_AUV3="${BUILD_AUV3:-0}"
ARCH="${ARCH:-native}"
PROFILE_ARG=""
if [[ "$PROFILE" == "--release" || "$PROFILE" == "release" ]]; then
  PROFILE_ARG="--release"
  PROFILE="release"
else
  PROFILE="debug"
fi

ensure_rust_target() {
  local target="$1"
  if ! rustup target list --installed | grep -q "^${target}$"; then
    echo "==> Installing missing Rust target: $target"
    rustup target add "$target"
  fi
}

FORMAT_FLAGS=(--vst3)
if [[ "$PLATFORM" == "macos" ]]; then
  FORMAT_FLAGS+=(--auv2)
fi
if [[ "$BUILD_AUV3" == "1" ]]; then
  FORMAT_FLAGS+=(--auv3)
fi

echo "==> Building $PLUGIN_BASENAME plugin ($PROFILE)..."
echo "    Target arch mode: $ARCH"

cd "$RUST_WORKSPACE"

if [[ "$PLATFORM" == "macos" ]]; then
  if [[ "$ARCH" == "universal" ]]; then
    ensure_rust_target "x86_64-apple-darwin"
    ensure_rust_target "aarch64-apple-darwin"
  elif [[ "$ARCH" == "x86_64" ]]; then
    ensure_rust_target "x86_64-apple-darwin"
  elif [[ "$ARCH" == "arm64" ]]; then
    ensure_rust_target "aarch64-apple-darwin"
  fi

  echo "    Using beamer xtask: cargo xtask bundle cosmo-pd101-plugin ${FORMAT_FLAGS[*]} --arch $ARCH"
  cargo run --target-dir packages/xtask/target -p xtask -- bundle cosmo-pd101-plugin "${FORMAT_FLAGS[@]}" --arch "$ARCH" $PROFILE_ARG
else
  if [[ "$PLATFORM" != "windows" && "$PLATFORM" != "linux" ]]; then
    echo "ERROR: unsupported plugin platform '$PLATFORM'. Use PLUGIN_PLATFORM=macos|windows|linux." >&2
    exit 1
  fi

  echo "    Using direct cargo build for VST3 (non-macOS)"
  cargo build -p cosmo-pd101-plugin --features vst3 $PROFILE_ARG

  TARGET_DIR="$RUST_WORKSPACE/packages/cosmo-pd101-plugin/target/$PROFILE"
  BUNDLE_DIR="$TARGET_DIR/$PLUGIN_BASENAME.vst3"

  if [[ "$PLATFORM" == "linux" ]]; then
    PLATFORM_SUBDIR="x86_64-linux"
    SRC_BIN="$TARGET_DIR/libcosmo_pd101_plugin.so"
    DST_BIN="$BUNDLE_DIR/Contents/$PLATFORM_SUBDIR/$PLUGIN_BASENAME.so"
  else
    PLATFORM_SUBDIR="x86_64-win"
    SRC_BIN="$TARGET_DIR/cosmo_pd101_plugin.dll"
    DST_BIN="$BUNDLE_DIR/Contents/$PLATFORM_SUBDIR/$PLUGIN_BASENAME.vst3"
  fi

  if [[ ! -f "$SRC_BIN" ]]; then
    echo "ERROR: expected plugin binary not found at $SRC_BIN" >&2
    exit 1
  fi

  rm -rf "$BUNDLE_DIR"
  mkdir -p "$(dirname "$DST_BIN")"
  cp "$SRC_BIN" "$DST_BIN"
  echo "    -> Created $BUNDLE_DIR"
fi

echo "==> Done. Bundles are in $RUST_WORKSPACE/packages/cosmo-pd101-plugin/target/$PROFILE/"
echo "    Run 'bun run plugin:install' to copy to system plugin dirs."
