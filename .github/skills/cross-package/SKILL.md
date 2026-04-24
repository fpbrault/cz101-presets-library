---
name: cross-package
description: "Work across multiple packages in the cosmo-pd monorepo. Use when: moving code from cosmo-pd101-webview into cz-explorer or vice versa; adding a new export to cosmo-pd101's public API (index.ts); tracing how a feature flows from Rust DSP through WASM bindings to React UI; understanding data flow between packages; synchronizing types across package boundaries; managing shared dependencies."
---

# Cross-Package Workflows

Guide for working across packages in the cosmo-pd monorepo.

## Package Dependency Graph

```
cosmo-synth-engine (Rust/WASM)
        ↓ compiled to WASM + TS bindings
cosmo-pd101 (React/TS synth lib)
        ↓ exported via index.ts → lib-dist/
cz-explorer (React app)
        ↑ wrapped by
cz-explorer-desktop (Tauri)
```

## Moving Code: cosmo-pd101 → cz-explorer

When a component or hook in `cosmo-pd101` needs to be consumed in `cz-explorer`:

1. **Export from cosmo-pd101** (`packages/cosmo-pd101/src/index.ts`):
   ```ts
   export { MyComponent } from "./components/MyComponent";
   export type { MyComponentProps } from "./components/MyComponent";
   ```
2. **Import in cz-explorer** using the package alias:
   ```ts
   import { MyComponent } from "@cosmo/cosmo-pd101";
   ```
3. **Rebuild lib-dist**: The dev watcher handles this automatically; for CI use `bun run build`
4. **Check TypeScript**: Run `bun run build` to verify types compile without errors

## Moving Code: cz-explorer → cosmo-pd101

When a UI primitive in `cz-explorer` should become reusable in the synth UI lib:

1. Move the file to `packages/cosmo-pd101/src/components/` (or `lib/`)
2. Update import paths in `cz-explorer` to use the package import
3. Export from `packages/cosmo-pd101/src/index.ts`
4. Ensure no `cz-explorer`-specific deps (TanStack Query, app routing) bleed into the lib

## Adding a Parameter End-to-End

New synth parameter from DSP to UI:

| Step | Location | Action |
|------|----------|--------|
| 1 | `cosmo-synth-engine/src/params.rs` | Add Rust parameter |
| 2 | `cosmo-synth-engine/src/wasm.rs` | Expose via wasm-bindgen |
| 3 | `cosmo-pd101/src/lib/synth/bindings/synth.ts` | Add TypeScript binding type |
| 4 | `cosmo-pd101/src/features/synth/hooks/useSynthParamsToWorklet.ts` | Pass to worklet |
| 5 | `cosmo-pd101/src/lib/synth/czPresetConverter.ts` | Map from SysEx if applicable |
| 6 | `cosmo-pd101/src/components/panels/` | Add UI control |
| 7 | `cosmo-pd101/webview/src/index.ts` | Export if cz-explorer needs it |

## Tracing a Feature Across Packages

To understand how a feature flows (e.g., a knob change):

1. **UI** → `packages/cosmo-pd101/src/components/controls/ControlKnob.tsx`
2. **State** → `packages/cosmo-pd101/src/features/synth/useSynthState.ts`
3. **Worklet bridge** → `packages/cosmo-pd101/src/features/synth/hooks/useSynthParamsToWorklet.ts`
4. **DSP** → `packages/cosmo-synth-engine/src/processor.rs` → `voice.rs`

## Managing Shared Types

- Types shared between webview and cz-explorer: define in `cosmo-pd101/src/` and export via `index.ts`
- Types shared between Rust and TS: define in Rust (`preset_wire.rs`, `params.rs`), generate TS via `wasm-bindgen` or manually mirror in `bindings/synth.ts`
- Never copy-paste types across packages; always import from the canonical location

## Validation Checklist (after cross-package changes)

```bash
bun run lint          # Biome lint
bun run build         # TypeScript check + Vite build (catches type errors)
bun run test:unit     # Unit tests
bun run test:browser  # Browser tests
```

## Key Boundaries
- `cosmo-pd101` and `cosmo-pd101-plugin/webview` must not import from `cz-explorer` (one-way dependency)
- `cz-explorer-desktop` only adds native capabilities; all UI stays in `cz-explorer`
- WASM bindings live in `cosmo-pd101`; never import WASM directly in `cz-explorer`
