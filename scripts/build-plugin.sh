#!/usr/bin/env bash
# Build the CZ-101 VST3 / AU plugin and bundle it into dist/
# Usage: ./scripts/build-plugin.sh [--release]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
TAURI="$ROOT/src-tauri"

PROFILE="${1:-release}"
CARGO_FLAGS=""
if [[ "$PROFILE" == "--release" || "$PROFILE" == "release" ]]; then
  CARGO_FLAGS="--release"
  PROFILE="release"
else
  PROFILE="debug"
fi

PLUGIN_NAME="CZ-101 Phase Distortion"
TARGET_DIR="$TAURI/target/$PROFILE"
DYLIB="$TARGET_DIR/libcz_synth_vst.dylib"
DIST="$ROOT/dist"

echo "==> Building cz-synth-vst ($PROFILE)..."
cargo build -p cz-synth-vst $CARGO_FLAGS --manifest-path "$TAURI/Cargo.toml"

# ---------- VST3 bundle ----------
VST3="$DIST/$PLUGIN_NAME.vst3"
VST3_MACOS="$VST3/Contents/MacOS"
echo "==> Bundling VST3..."
mkdir -p "$VST3_MACOS"

# Info.plist
cat > "$VST3/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>CZ-101 Phase Distortion</string>
    <key>CFBundleIdentifier</key>
    <string>com.github.fpbrault.cz101-synth</string>
    <key>CFBundleName</key>
    <string>CZ-101 Phase Distortion</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>CFBundleSignature</key>
    <string>????</string>
</dict>
</plist>
PLIST

cp "$DYLIB" "$VST3_MACOS/$PLUGIN_NAME"
echo "    VST3 -> $VST3"

# ---------- AU (Component) bundle ----------
COMP="$DIST/$PLUGIN_NAME.component"
COMP_MACOS="$COMP/Contents/MacOS"
COMP_RES="$COMP/Contents/Resources/ui"
VST3_RES="$VST3/Contents/Resources/ui"
echo "==> Bundling AU component..."
mkdir -p "$COMP_MACOS" "$COMP_RES" "$VST3_RES"

# Info.plist
cat > "$COMP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>CZ-101 Phase Distortion</string>
    <key>CFBundleIdentifier</key>
    <string>com.github.fpbrault.cz101-synth.component</string>
    <key>CFBundleName</key>
    <string>CZ-101 Phase Distortion</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>AudioComponents</key>
    <array>
        <dict>
            <key>type</key>
            <string>aumu</string>
            <key>subtype</key>
            <string>CZ01</string>
            <key>manufacturer</key>
            <string>FpBr</string>
            <key>name</key>
            <string>fpbrault: CZ-101 Phase Distortion</string>
            <key>version</key>
            <integer>65536</integer>
            <key>factoryFunction</key>
            <string>GetPluginFactoryAUV2</string>
        </dict>
    </array>
</dict>
</plist>
PLIST

cp "$DYLIB" "$COMP_MACOS/$PLUGIN_NAME"

# Embed the Vite UI build into both AU and VST3 bundles
if [[ -f "$DIST/index.html" ]]; then
  echo "==> Embedding Vite UI into AU bundle..."
  rsync -a --delete \
    --exclude="*.vst3" \
    --exclude="*.component" \
    "$DIST/" "$COMP_RES/"
  echo "==> Embedding Vite UI into VST3 bundle..."
  rsync -a --delete \
    --exclude="*.vst3" \
    --exclude="*.component" \
    "$DIST/" "$VST3_RES/"
else
  echo "    (no Vite build found in dist/ — skipping UI embed; run 'bun run build' first)"
fi

echo "    AU  -> $COMP"
echo "==> Done. Run 'bun run plugin:install' to copy to system plugin dirs."
