#!/usr/bin/env bash
# Build the CZ-101 VST3 / AU plugin using beamer xtask
# Usage: ./scripts/build-plugin.sh [--release]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
RUST_WORKSPACE="$ROOT"

PROFILE="${1:-release}"
BUILD_AUV3="${BUILD_AUV3:-0}"
PROFILE_ARG=""
if [[ "$PROFILE" == "--release" || "$PROFILE" == "release" ]]; then
  PROFILE_ARG="--release"
  PROFILE="release"
else
  PROFILE="debug"
fi

FORMAT_FLAGS=(--vst3 --auv2)
if [[ "$BUILD_AUV3" == "1" ]]; then
  FORMAT_FLAGS+=(--auv3)
fi

echo "==> Building CZ-101 Phase Distortion plugin ($PROFILE)..."
echo "    Using beamer xtask: cargo xtask bundle cosmo-pd101 ${FORMAT_FLAGS[*]}"

cd "$RUST_WORKSPACE"
cargo run --target-dir packages/xtask/target -p xtask -- bundle cosmo-pd101 "${FORMAT_FLAGS[@]}" $PROFILE_ARG

echo "==> Done. Bundles are in $RUST_WORKSPACE/packages/cosmo-pd101/target/$PROFILE/"
echo "    Run 'bun run plugin:install' to copy to system plugin dirs."
