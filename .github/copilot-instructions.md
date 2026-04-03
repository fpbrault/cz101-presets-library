# CZ101 Presets Library — Project Guidelines

Desktop app for managing Casio CZ-101 synthesizer presets (`.SYX` MIDI SysEx files). Built with Tauri 2 + React 18 + TypeScript.

## Build & Dev

Use **Bun** as the package manager.

```bash
bun install              # Install dependencies
bun run dev              # Start Vite dev server (port 1420)
bun run tauri dev        # Launch full Tauri desktop app (dev)
bun run build            # TypeScript compile + Vite bundle
bun run tauri build      # Produce distributable desktop binary
```

No test suite is configured.

## Architecture

```
src/              # React frontend
  lib/            # Business logic (no UI): DB abstraction, MIDI ops, SysEx parsing
  components/     # Reusable UI primitives (e.g., Button.tsx)
  *Context.tsx    # Global state via React Context
  *Manager.tsx    # Page-level orchestrator components
src-tauri/        # Rust/Tauri backend (minimal — event handlers, native plugins)
CZSYX/            # Source .SYX cartridge files; convert.js parses them
```

Key files: [src/lib/presetManager.ts](../src/lib/presetManager.ts) (core API), [src/PresetManager.tsx](../src/PresetManager.tsx) (main UI), [src/PresetList.tsx](../src/PresetList.tsx) (virtualized table).

## Conventions

**TypeScript / React**
- Functional components only; no class components.
- Props interfaces defined inline or alongside the component.
- Wrap expensive components with `memo()`.
- Context pattern: `createContext` → typed interface → Provider → `useXxx` hook with guard. See [src/RefreshContext.tsx](../src/RefreshContext.tsx) as the canonical template.
- TypeScript strict mode is on (`noUnusedLocals`, `noUnusedParameters`) — no unused imports or variables.

**State management**
- React Context + `useState` for global/shared state.
- React Query (`@tanstack/react-query`) for async data fetching with `keepPreviousData`.
- `localStorage` (via [src/utils.ts](../src/utils.ts)) for persistent user preferences (MIDI port, channel, toggles).

**Database layer**
- Abstract `PresetDatabase` interface implemented by `IndexedDbPresetDatabase` (browser) and `PostgresPresetDatabase` (optional server).
- Runtime fallback strategy in [src/lib/postgresDatabaseWithFallback.ts](../src/lib/postgresDatabaseWithFallback.ts).
- Do not couple UI components to a specific DB implementation; go through `presetManager.ts`.

**Styling**
- Tailwind CSS + DaisyUI;
- Use DaisyUI semantic classes (`btn`, `badge-primary`, etc.) over raw Tailwind where a component exists.
- Do not add inline `style=` attributes; use Tailwind utilities.

**Naming**
- Components & contexts: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities/lib modules: `camelCase.ts`
- DB classes: `PascalCase` + `Database` suffix

## MIDI / SysEx Notes
- SysEx byte arrays start with `0xF0` and end with `0xF7`.
- Always use `Uint8Array` for raw MIDI data — never plain `number[]`.
- MIDI port state is stored in `MidiChannelContext`; listen for port changes via WebMidi event listeners set up in [src/PresetManager.tsx](../src/PresetManager.tsx).

https://www.youngmonkey.ca/nose/audio_tech/synth/Casio-CZ.html