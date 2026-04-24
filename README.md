# cosmo-pd

A monorepo for Casio CZ-101 phase distortion synthesis — including a preset manager web/desktop app, an in-browser phase distortion synthesizer, and a VST3/AUv2/AUv3 plugin.

## Overview

This is a **Bun monorepo** containing:

| Package | Description |
|---------|-------------|
| `packages/cz-explorer` | React + Vite web app: preset library, setlists, synth browser UI |
| `packages/cz-explorer-desktop` | Tauri 2 desktop wrapper for cz-explorer |
| `packages/cosmo-synth-engine` | Rust WebAssembly phase distortion synth engine |
| `packages/cosmo-pd101` | beamer-based VST3/AUv2/AUv3 plugin host **and** reusable library for synth-specific UI components, hooks, and SysEx utilities |
| `packages/xtask` | Build automation (xtask pattern) |

## Setup

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/) (auto-installed via `postinstall`)

### Installation

```bash
bun install
```

## Commands

### Development

```bash
bun run dev              # Start the cz-explorer Vite dev server
```

### Build

```bash
bun run build            # Full build: web + plugin + desktop
bun run build:web        # Build WASM engine + cz-explorer web app
bun run build:plugin     # Build VST3/AUv2/AUv3 plugin (macOS, current arch)
bun run build:standalone # Build the Tauri desktop app
```

### Testing

```bash
bun run test             # All tests (JS + Rust)
bun run test:unit        # Unit tests (Happy DOM)
bun run test:browser     # Browser tests (Playwright)
bun run test:component   # Component tests only
bun run test:coverage    # Unit test coverage report
```

### Lint & Format

```bash
bun run lint             # Biome + cargo fmt/clippy check
bun run lint:fix         # Biome auto-fix + cargo fmt
```

### Database

```bash
bun run db:generate      # Generate Drizzle migration files
bun run db:migrate       # Apply pending migrations (requires DATABASE_URL)
bun run db:studio        # Open Drizzle Studio
```

For database migration details, see [docs/db-migrations.md](docs/db-migrations.md).

## Architecture

### Frontend (`packages/cz-explorer`)

- **React 18** + **Vite**: UI and build tooling.
- **TanStack Router**: File-based routing.
- **TanStack Query**: Server state and caching.
- **TanStack Table**: Data grid.
- **Tailwind CSS** + **DaisyUI**: Styling.
- **Drizzle ORM**: Type-safe database access (Postgres/Neon + IndexedDB fallback).

### Synth Engine (`packages/cosmo-synth-engine`)

- Rust compiled to **WebAssembly** via wasm-pack.
- Phase distortion oscillators, CZ envelopes, polyphonic voice management.
- Bindings exported to TypeScript via Specta.

### Desktop (`packages/cz-explorer-desktop`)

- **Tauri 2** wrapping the cz-explorer web app.
- Provides native file system and MIDI access.

### Synth Library (`packages/cosmo-pd101`)

- Reusable React/TypeScript synth UI and domain library.
- `packages/cosmo-pd101/src/index.ts` exports synth-specific React components (`SynthRenderer`), hooks (`useAudioEngine`, `useSynthState`, etc.), SysEx decoder utilities, preset storage/conversion utilities, and shared types consumed by `cz-explorer` and the plugin webview.

### Plugin (`packages/cosmo-pd101-plugin`)

- **beamer** framework: VST3 + AUv2 + AUv3 from a single Rust codebase.
- Embeds the cosmo-synth-engine and a thin React/Vite WebView app via WebView IPC.
- The plugin `webview/` stays as a direct child of the Rust crate for Beamer asset embedding and imports reusable UI from `@cosmo/cosmo-pd101`.

### Database

- **Drizzle ORM** with **PostgreSQL** (Neon hosted or local).
- Browser fallback uses **IndexedDB**.

## Development Tools

- **Bun**: Package manager and script runner.
- **Biome**: Linter and formatter (tabs, double quotes).
- **Vitest**: Unit and browser tests.
- **Playwright**: Browser test runner.

## Testing

Two Vitest projects: `unit` (Happy DOM) and `browser` (Playwright/Chromium).

- Unit test files: `*.{test,spec}.{ts,tsx}` (excluding `.browser.test.`)
- Browser test files: `*.browser.test.{ts,tsx}`

For detailed testing patterns, see [docs/component-testing.md](docs/component-testing.md).

## SysEx Reference

CZ-101 patch format documentation: [docs/CZ101_SYSEX_FORMAT.md](docs/CZ101_SYSEX_FORMAT.md).
