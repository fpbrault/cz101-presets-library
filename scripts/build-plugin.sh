#!/usr/bin/env bash
# Build the CZ-101 VST3 / AU plugin using beamer xtask
# Usage: ./scripts/build-plugin.sh [--release]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
TAURI="$ROOT/src-tauri"

PROFILE="${1:-release}"
PROFILE_ARG=""
if [[ "$PROFILE" == "--release" || "$PROFILE" == "release" ]]; then
  PROFILE_ARG="--release"
  PROFILE="release"
else
  PROFILE="debug"
fi

echo "==> Building CZ-101 Phase Distortion plugin ($PROFILE)..."
echo "    Using beamer xtask: cargo xtask bundle cz-synth-vst --vst3 --auv2"

cd "$TAURI"
cargo run -p xtask -- bundle cz-synth-vst --vst3 --auv2 $PROFILE_ARG

echo "==> Done. Bundles are in $TAURI/target/$PROFILE/"
echo "    Run 'bun run plugin:install' to copy to system plugin dirs."
