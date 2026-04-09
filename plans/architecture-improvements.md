# Architecture Improvement Plan

## Context

This is a Tauri 2 desktop app (React + TypeScript) for managing Casio CZ-101 synthesizer `.SYX` presets. The codebase has evolved organically and accumulated several architectural debt points that hinder maintainability and testability.

**Reference**: Run `rg "AppMode" --sort=path` to find mode-routing logic. Run `rg "setPresetDatabase|presetDatabase\s*=" --sort=path` to find module-level singleton state. Run `rg "localStorage" --sort=path` to audit all localStorage access.

---

## Phase 1: Foundation (Do First)

### 1.1 Add React Router

**Why**: Navigation is a hand-rolled mode-switch in `PresetManager.tsx` (`"presets" | "synthBackups" | "setlists" | "tagManager" | "duplicateFinder"`). No URL, no history, no lazy loading.

**What**:
- Install `@tanstack/router` (aligns with existing TanStack Query stack) or `react-router`
- Create route definitions: `/presets`, `/setlists`, `/synth-backups`, `/tags`, `/duplicates`
- Migrate `AppMode` state to URL params/query
- Lazy-load route components with `lazy()` + `Suspense`
- Remove mode-switch conditional rendering from `PresetManager.tsx`

**Files touched**: `App.tsx`, `PresetManager.tsx`, `AppSidebar.tsx`, new `src/routes/` directory

**Verification**: `bun run build` + manual nav testing

---

### 1.2 Centralize localStorage Access

**Why**: localStorage is accessed directly across 7+ files with ad-hoc string keys. No type safety, no namespace, no rehydration abstraction.

**What**:
- Create `src/lib/storage/` directory with:
  - `keys.ts` — typed key constants (`STORAGE_KEYS.PRESET_FILTERS = "preset_filters"`, etc.)
  - `storage.ts` — typed `get`/`set` helpers with JSON parse/stringify
- Audit all localStorage usage with `rg "localStorage\." --sort=path`
- Replace direct `localStorage.getItem/setItem` calls throughout with `storage.get(key)` / `storage.set(key, value)`
- Migrate `SearchFilterContext`, `MidiPortContext`, `MidiChannelContext`, `onlineSyncSettings`, `onlineAuthSession` to use centralized storage

**Files touched**: New `src/lib/storage/` module, all files using localStorage

---

### 1.3 Eliminate Module-Level Singleton (`presetDatabase`)

**Why**: `presetManager.ts` has `let presetDatabase: PresetDatabase` at module scope, set via `setPresetDatabase()`. This is a hidden global — hard to mock in tests, prevents tree-shaking, couples callers to initialization order.

**What**:
- Create `PresetDatabaseContext` in `src/context/` that provides the `PresetDatabase` implementation
- Remove module-level `presetDatabase` variable and `setPresetDatabase()` / `resetPresetDatabase()` from `presetManager.ts`
- Update all callers of `presetManager.ts` functions to consume via context (or pass db as arg for critical paths)
- Keep `presetManager.ts` as a pure module of domain functions that accept a `PresetDatabase` as first argument
- `FakePresetDatabase` remains for test isolation

**Files touched**: `presetManager.ts`, new `PresetDatabaseContext.tsx`, all files importing `presetManager`

---

### 1.4 Standardize Test Co-location

**Why**: Tests are scattered: `lib/presets/*.test.ts` at root, `features/*/components/*.test.tsx` alongside components, `components/*/tests/` subdirs. No consistent pattern.

**What**:
- Move all tests to co-locate next to their source file: `PresetManager.test.ts` next to `PresetManager.ts`
- Delete empty `tests/` directories
- Rename all `.browser.test.tsx` files to `*.test.tsx` (Vitest handles browser vs unit via config glob)
- Update vitest config globs if needed: unit `["**/*.test.ts", "**/*.test.tsx", "!**/*.browser.test.ts"]`, browser `["**/*.browser.test.ts", "**/*.browser.test.tsx"]`

**Files touched**: All test files, `vitest.config.ts`

---

## Phase 2: Structure

### 2.1 Add Barrel Exports

**Why**: No `index.ts` files means deep import paths and tight coupling to internal file structure.

**What**:
- Add `index.ts` to every directory under `src/` that has multiple exported items
- Use Biome's `organizeImports` to manage (run `bun run lint:fix`)
- Expose only public API via barrel; internal files stay non-exported

**Files touched**: All directories under `src/`

---

### 2.2 Fix Feature Boundaries

**Why**: `src/components/presets/` and `src/features/presets/` both contain preset-related components, causing confusion about ownership.

**What**:
- Move ALL preset-specific components from `src/components/presets/` to `src/features/presets/components/`
- `src/components/` should contain only truly reusable primitives (`ui/`, `forms/`, `layout/`, `charts/`, `feedback/`)
- Rename `src/components/presets/` → `src/features/presets/components/` (move the directory)
- Same for any overlapping `setlists` or `synthBackups` components
- After move: delete `src/components/presets/`, `src/components/setlists/`, `src/components/synthBackups/` if empty

**Files touched**: `src/components/presets/`, `src/features/presets/`

---

### 2.3 Consolidate State Management

**Why**: 5 React Contexts + localStorage-backed modules + TanStack Query creates inconsistent reactivity. Changes in localStorage don't trigger React re-renders unless explicitly wired.

**What**:
- Migrate all persistent data (setlists, synthBackups, playlists, auth session) to use TanStack Query with appropriate query/mutation keys
- Create `useSetlists()`, `useSynthBackups()`, `usePlaylists()` hooks that wrap TanStack Query mutations
- Remove direct localStorage calls from `playlistManager`, `synthBackupManager` — keep them as pure data-transform modules, not storage
- Contexts should only manage ephemeral UI state (toast, sidebar, MIDI port selection)
- Consolidate MIDI contexts: consider merging `MidiPortContext` and `MidiChannelContext` into one `MidiContext`

**Files touched**: `src/context/`, `src/lib/collections/`, `src/features/setlists/`, `src/features/synthBackups/`

---

## Phase 3: Refinement

### 3.1 Split `presetManager.ts` Monolith

**Why**: `presetManager.ts` (~600+ lines) mixes SysEx normalization, CRUD, MIDI I/O, and factory preset logic. Unwieldy to test and maintain.

**What**:
- Extract `src/lib/sysex/normalize.ts` — pure SysEx normalization functions
- Extract `src/lib/sysex/fingerprint.ts` — fingerprint logic (currently in `presetFingerprint.ts`)
- Extract `src/lib/midi/operations.ts` — MIDI send/receive operations with timeouts
- Keep `presetManager.ts` as a thin coordinator that composes the above
- Ensure all extracted modules are pure functions with no side effects

**Files touched**: `src/lib/presets/presetManager.ts`, new `src/lib/sysex/` directory

---

### 3.2 Route Sync Through `PresetDatabase` Interface

**Why**: `remotePresetSyncAdapter.ts` talks directly to Neon Data API, bypassing the `PresetDatabase` abstraction. The fallback logic in `postgresDatabaseWithFallback` is disconnected from sync decisions.

**What**:
- Add `sync()` method to `PresetDatabase` interface
- Implement `sync()` in `IndexedDbPresetDatabase` (no-op or push to remote)
- Make `RemotePresetSyncAdapter` a wrapper that coordinates with whichever `PresetDatabase` is active
- Or: keep sync adapter separate but ensure `PresetSyncCoordinator` uses the active db for conflict resolution
- Simplify `postgresDatabaseWithFallback.ts` — it should only handle connection fallback, not sync logic

**Files touched**: `src/lib/presets/presetManager.ts`, `src/lib/db/browserDatabase.ts`, `src/lib/db/postgresDatabase.ts`, `src/lib/sync/remotePresetSyncAdapter.ts`, `src/lib/sync/presetSync.ts`

---

### 3.3 Clean Up `App.tsx` Provider Composition

**Why**: `App.tsx` likely has deeply nested providers, hard to follow.

**What**:
- Create `src/AppProviders.tsx` that composes all context providers in one place
- Use context composition pattern: group related contexts into sub-components (`MidiProvider`, `SearchProvider`, etc.)
- `App.tsx` should only render `AppProviders` + `Router` + `Layout`
- Ensure provider order is logical (QueryClient outermost for React 18 concurrent mode)

**Files touched**: `App.tsx`, new `src/AppProviders.tsx`, `src/context/`

---

## Execution Order

```
Phase 1 (Foundation):
  1.1 React Router         → enables everything else cleanly
  1.2 localStorage central  → reduces hidden state, easier testing
  1.3 Kill module singleton → dependency injection via context
  1.4 Test co-location     → low effort, high consistency gain

Phase 2 (Structure):
  2.1 Barrel exports        → import hygiene
  2.2 Feature boundaries     → clarity of ownership
  2.3 State consolidation    → reactive everywhere

Phase 3 (Refinement):
  3.1 Split presetManager   → easier to test & reason about
  3.2 Sync abstraction      → consistent data model
  3.3 Provider cleanup      → readability
```

**Note**: Run `bun run lint` and `bun run build` after every change. Run `bun run test:all --run` after Phase 1 to catch regressions.
