# Cosmo PD-101 Standalone

A standalone desktop synthesizer application built with Tauri 2 and React, featuring native audio I/O via cpal.

## Features

- **Phase Distortion Synthesis**: Full PD-101 synth engine with advanced sound design capabilities
- **Native Audio I/O**: CoreAudio (macOS) and WASAPI (Windows) support via cpal
- **Real-time Settings**: Audio driver, device, and buffer configuration
- **Cross-Platform**: macOS and Windows builds

## Development

### Prerequisites

- Rust 1.70+
- Node.js 18+ / Bun 1.0+
- Xcode (macOS) or Visual Studio (Windows)

### Install Dependencies

```bash
bun install
```

### Development Server

```bash
# Start development server with hot reload
bun run dev

# Or from root: 
bun run dev:standalone
```

### Building

```bash
# Build production app
bun run build

# Or from root:
bun run build:standalone
```

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS + DaisyUI
- **Desktop**: Tauri 2 with native capabilities
- **Audio**: cpal for platform-specific audio I/O
- **Synth Engine**: CosmoProcessor (Rust/WASM) with phase distortion algorithms

## Configuration

Audio settings are persisted via Tauri commands:
- Audio driver (platform-specific)
- Output device selection
- Input channel count
- Buffer size (128-2048)
- Sample rate (44.1/48/96 kHz)

## TODO

- [ ] Implement cpal device enumeration for audio device discovery
- [ ] Build native audio stream with sample-accurate synth callback
- [ ] Add MIDI device discovery and routing
- [ ] Implement menu bar settings UI for macOS
- [ ] Add Windows settings dialog
- [ ] Presets management UI
- [ ] Patch export/import
