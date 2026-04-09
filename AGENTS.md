# Agent Instructions

## Tooling & Environment

- **Package Manager**: Always use `bun`. Do not use `npm` or `yarn`.

## Commands

| Task | Command |
|------|---------|
| Dev server | `bun run dev` |
| Build | `bun run build` (runs `tsc && vite build`) |
| Tauri dev | `bun run tauri dev` |
| Lint | `bun run lint` (Biome check) |
| Lint & fix | `bun run lint:fix` |
| Unit tests | `bun run test:unit` |
| Browser tests | `bun run test:browser` |
| All tests | `bun run test:all` |
| Component tests | `bun run test:component` |
| Coverage | `bun run test:coverage` |
| DB generate migration | `bun run db:generate` |
| DB migrate | `bun run db:migrate` (requires `DATABASE_URL`) |

**Order**: lint → typecheck (via `bun run build`) → test.

## Architecture

Tauri 2 desktop app for managing Casio CZ-101 synthesizer `.SYX` presets.

- `src/components/` — Reusable UI primitives (buttons, inputs, modals)
- `src/features/` — Feature domains: `presets/`, `setlists/`, `synthBackups/`
- `src/lib/` — Business logic (no UI): DB adapters, MIDI ops, SysEx parsing, sync
- `src/lib/db/` — `PresetDatabase` interface with `browserDatabase` (IndexedDB), `postgresDatabase`, and `fakePresetDatabase` + runtime fallback
- `src/lib/presets/presetManager.ts` — Core API surface for preset operations
- `src/db/schema.ts` — Drizzle ORM schema (Postgres)
- `src/context/` — React Context providers (MIDI port, MIDI channel, search, sidebar, toast)
- `src/hooks/` — Custom hooks (`useDragDrop`, `useMidiSetup`)
- `src-tauri/` — Rust backend (minimal; event handlers and native plugins)

## Conventions

- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters` — no unused imports or variables
- **Components**: functional only, `PascalCase.tsx`; wrap expensive ones with `memo()`
- **Hooks**: `useCamelCase.ts`; utilities/lib: `camelCase.ts`
- **Context pattern**: `createContext` → typed interface → Provider → `useXxx` hook with guard. See `src/context/` for templates.
- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: Tailwind CSS + DaisyUI; prefer DaisyUI semantic classes (`btn`, `badge-primary`, etc.) over raw Tailwind utilities. No inline `style=` attributes.
- **Formatting**: Biome — tabs, double quotes, organized imports (`bun run lint:fix`)
- **MIDI/SysEx**: Always use `Uint8Array` for raw MIDI data, never `number[]`. SysEx starts `0xF0`, ends `0xF7`.

## Testing

- Two Vitest projects: `unit` (happy-dom) and `browser` (Playwright/Chromium)
- Browser test files must use `*.browser.test.{ts,tsx}` naming
- Unit test files use `*.{test,spec}.{ts,tsx}` (excluding `.browser.test.`)
- Setup injects `fake-indexeddb/auto` and `vitest-axe/extend-expect` for unit tests
- CI runs `test:unit --run` then installs Playwright + runs `test:browser --run`

## Database

- Drizzle ORM with Postgres dialect; schema in `src/db/schema.ts`; migrations output to `drizzle/`
- `db:migrate` requires `DATABASE_URL` env var
- `db:generate` works with fallback connection string (no DB access needed)

## Memory Management

- **Memory Tools**: Use `memory_set`, `memory_replace`, and `memory_list` to:
  - Remember information when explicitly asked.
  - Recall information when asked.
  - Proactively store useful project context or user preferences to maintain continuity.

## Multi-agent Attribution

This session may involve multiple agents. To determine which agent produced each response, call the `agent_attribution` tool.

## Reference

- Memory Plugin: https://github.com/joshuadavidthomas/opencode-agent-memory