#!/usr/bin/env bash
# Install built plugin bundles from src-tauri/target/ to system plugin directories
# Usage: ./scripts/install-plugin.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
TAURI="$ROOT/src-tauri"

# Use release by default, allow override via PROFILE env var
PROFILE="${PROFILE:-release}"
INSTALL_AUV2="${INSTALL_AUV2:-1}"
INSTALL_AUV3="${INSTALL_AUV3:-0}"
REMOVE_INSTALLED_AUV2="${REMOVE_INSTALLED_AUV2:-0}"
REMOVE_INSTALLED_AUV3="${REMOVE_INSTALLED_AUV3:-1}"
PLUGIN_NAME="CZ-101 Phase Distortion"
TARGET_DIR="$TAURI/target/$PROFILE"

VST3_SYSTEM="$HOME/Library/Audio/Plug-Ins/VST3"
AU_SYSTEM="$HOME/Library/Audio/Plug-Ins/Components"

VST3_SRC="$TARGET_DIR/CzSynthVst.vst3"
AUV2_SRC="$TARGET_DIR/CzSynthVst.component"
AUV3_SRC="$TARGET_DIR/CzSynthVst.app"

if [[ ! -d "$VST3_SRC" ]]; then
  echo "ERROR: $VST3_SRC not found. Run 'bun run build:plugin' first." >&2
  exit 1
fi
if [[ ! -d "$AUV2_SRC" ]]; then
  echo "ERROR: $AUV2_SRC not found. Run 'bun run build:plugin' first." >&2
  exit 1
fi

mkdir -p "$VST3_SYSTEM" "$AU_SYSTEM"

echo "==> Installing VST3..."
rm -rf "$VST3_SYSTEM/CzSynthVst.vst3"
ditto "$VST3_SRC" "$VST3_SYSTEM/CzSynthVst.vst3"
echo "    -> $VST3_SYSTEM/CzSynthVst.vst3"

if [[ "$INSTALL_AUV2" != "1" ]]; then
  echo "==> Skipping AUv2 component install (INSTALL_AUV2=$INSTALL_AUV2)"
  if [[ "$REMOVE_INSTALLED_AUV2" == "1" && -d "$AU_SYSTEM/CzSynthVst.component" ]]; then
    echo "==> Removing installed AUv2 component..."
    rm -rf "$AU_SYSTEM/CzSynthVst.component"
    echo "    -> removed $AU_SYSTEM/CzSynthVst.component"
  fi
else
  echo "==> Installing AUv2 component..."
  rm -rf "$AU_SYSTEM/CzSynthVst.component"
  ditto "$AUV2_SRC" "$AU_SYSTEM/CzSynthVst.component"
  echo "    -> $AU_SYSTEM/CzSynthVst.component"
fi

if [[ "$INSTALL_AUV3" != "1" ]]; then
  echo "==> Skipping AUv3 app install (INSTALL_AUV3=$INSTALL_AUV3)"
  if [[ "$REMOVE_INSTALLED_AUV3" == "1" && -d "$HOME/Applications/CzSynthVst.app" ]]; then
    echo "==> Removing installed AUv3 app..."
    rm -rf "$HOME/Applications/CzSynthVst.app"
    echo "    -> removed $HOME/Applications/CzSynthVst.app"
  fi
elif [[ -d "$AUV3_SRC" ]]; then
  echo "==> Installing AUv3 app..."
  rm -rf "$HOME/Applications/CzSynthVst.app"
  ditto "$AUV3_SRC" "$HOME/Applications/CzSynthVst.app"
  echo "    -> $HOME/Applications/CzSynthVst.app"
  echo "==> Registering AUv3 app..."
  open "$HOME/Applications/CzSynthVst.app" || true
  sleep 1
  killall CzSynthVst 2>/dev/null || true
else
  echo "==> Skipping AUv3 app install (bundle not built)"
fi

# Invalidate AU cache so the host re-scans
echo "==> Invalidating AU cache..."
killall -9 AudioComponentRegistrar 2>/dev/null || true

echo "==> Done."
