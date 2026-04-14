#!/usr/bin/env bash
# Install built plugin bundles from dist/ to system plugin directories
# Usage: ./scripts/install-plugin.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
DIST="$ROOT/dist"

PLUGIN_NAME="CZ-101 Phase Distortion"
VST3_SYSTEM="$HOME/Library/Audio/Plug-Ins/VST3"
AU_SYSTEM="$HOME/Library/Audio/Plug-Ins/Components"

VST3_SRC="$DIST/$PLUGIN_NAME.vst3"
COMP_SRC="$DIST/$PLUGIN_NAME.component"

if [[ ! -d "$VST3_SRC" ]]; then
  echo "ERROR: $VST3_SRC not found. Run 'bun run plugin:build' first." >&2
  exit 1
fi
if [[ ! -d "$COMP_SRC" ]]; then
  echo "ERROR: $COMP_SRC not found. Run 'bun run plugin:build' first." >&2
  exit 1
fi

mkdir -p "$VST3_SYSTEM" "$AU_SYSTEM"

echo "==> Installing VST3..."
rm -rf "$VST3_SYSTEM/$PLUGIN_NAME.vst3"
cp -r "$VST3_SRC" "$VST3_SYSTEM/"
echo "    -> $VST3_SYSTEM/$PLUGIN_NAME.vst3"

echo "==> Installing AU component..."
rm -rf "$AU_SYSTEM/$PLUGIN_NAME.component"
cp -r "$COMP_SRC" "$AU_SYSTEM/"
echo "    -> $AU_SYSTEM/$PLUGIN_NAME.component"

# Invalidate AU cache so the host re-scans
echo "==> Invalidating AU cache..."
killall -9 AudioComponentRegistrar 2>/dev/null || true

echo "==> Done."
