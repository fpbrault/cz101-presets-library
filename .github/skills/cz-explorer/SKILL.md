---
name: cz-explorer
description: "Work in the cz-explorer React/Vite web app package. Use when: adding features to presets, setlists, or synthBackups; working with the IndexedDB/Postgres data layer; adding context providers; writing hooks; working with MIDI sync; adding routes with TanStack Router; writing unit or browser tests for cz-explorer components."
---

# cz-explorer Package

React + Vite SPA for managing synthesizer preset libraries and setlists. Located at `packages/cz-explorer/`.

## Package Overview

| Layer | Path | Purpose |
|-------|------|---------|
| Features | `src/features/` | Domain UI: `presets/`, `setlists/`, `synthBackups/` |
| Components | `src/components/` | Shared UI primitives |
| Routes | `src/routes/` | TanStack Router file-based routes |
| Lib | `src/lib/` | Business logic (no UI): `db/`, `midi/`, `sync/`, `presets/`, etc. |
| DB Schema | `src/db/schema.ts` | Drizzle ORM (Postgres) |
| Context | `src/context/` | React Context providers (MIDI port, MIDI channel, search, sidebar, toast) |
| Hooks | `src/hooks/` | Shared hooks (`useDragDrop`, `useMidiSetup`) |

## Development Workflow

### Adding a New Feature
1. Create folder under `src/features/<featureName>/`
2. Add feature components (`PascalCase.tsx`), hooks (`useCamelCase.ts`), types
3. Keep business logic in `src/lib/<featureName>/` if shared
4. Wire into routes at `src/routes/`
5. Export from feature barrel `index.ts` if consumed elsewhere

### Adding/Modifying DB Access
1. Schema: `src/db/schema.ts` (Drizzle ORM)
2. Implement `PresetDatabase` interface in `src/lib/db/`
3. Three implementations: `browserDatabase` (IndexedDB), `postgresDatabase`, `fakePresetDatabase` (tests)
4. Run `bun run db:generate` after schema changes (no DB required)
5. Run `bun run db:migrate` with `DATABASE_URL` env var to apply migrations

### Adding a Context Provider
Follow the pattern in `src/context/`:
1. `createContext` with a typed interface
2. Provider component
3. `useXxx` hook with a guard that throws if used outside provider

## Testing

| Type | Command | Config |
|------|---------|--------|
| Unit | `bun run test:unit` | happy-dom; `fake-indexeddb/auto` injected |
| Browser | `bun run test:browser` | Playwright/Chromium |
| All | `bun run test:all` | |
| Component | `bun run test:component` | |

- Unit test files: `*.{test,spec}.{ts,tsx}` (not `.browser.test.`)
- Browser test files: `*.browser.test.{ts,tsx}`
- Colocate test files next to source; mock IndexedDB/MIDI with provided fakes

### Testing Patterns
- Use React Testing Library; test behavior not implementation
- IndexedDB is auto-mocked via `fake-indexeddb/auto`
- MIDI dependencies: mock via `vi.mock()` or inject fakes
- Accessibility: `vitest-axe/extend-expect` is available

## Key Conventions
- **Tailwind + DaisyUI**: prefer DaisyUI semantic classes (`btn`, `badge-primary`); no inline `style=`
- **TypeScript strict**: no unused imports/variables
- **Path alias**: `@/*` → `./src/*`
- **MIDI data**: always `Uint8Array`, never `number[]`
- **Formatting**: `bun run lint:fix` (Biome, tabs, double quotes)

## Commands

```bash
bun run dev           # Start dev server
bun run build         # TypeScript check + Vite build
bun run lint          # Biome check
bun run lint:fix      # Biome fix
bun run test:unit     # Unit tests
bun run test:browser  # Browser tests
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Apply migrations (needs DATABASE_URL)
```
