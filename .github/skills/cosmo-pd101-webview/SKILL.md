---
name: cosmo-pd101-webview
description: "Work in the cosmo-pd101 webview package — the reusable synth UI library and plugin host. Use when: building or editing synth UI components (controls, editor, panels); working with hooks like useAudioEngine, useSynthState, useSynthPresetManager; modifying the public library API (index.ts exports); adding new synth parameters; working with SysEx/MIDI decoding; updating the lib-dist build; writing tests for synth components or hooks."
---

# cosmo-pd101 Shared Library and Plugin Webview

Reusable React synth UI library consumed by `cz-explorer` and the plugin webview. The shared library lives at `packages/cosmo-pd101/`; the Beamer plugin shell lives at `packages/cosmo-pd101-plugin/webview/`.

## Package Overview

| Layer | Path | Purpose |
|-------|------|---------|
| Components | `packages/cosmo-pd101/src/components/` | Synth UI: controls, editor, renderer, panels, layout |
| Features | `packages/cosmo-pd101/src/features/synth/` | Synth domain: hooks, engine, preset manager, types |
| Context | `packages/cosmo-pd101/src/context/` | `ModMatrixContext` and others |
| Lib | `packages/cosmo-pd101/src/lib/midi/` | `czSysexDecoder` — CZ SysEx decoder |
| Lib | `packages/cosmo-pd101/src/lib/synth/` | Synth bindings, preset converter, PD algorithms, worklet URLs |
| Plugin shell | `packages/cosmo-pd101-plugin/webview/src/` | App bootstrap, Beamer bridge, plugin-only tests/update checks |
| Public API | `packages/cosmo-pd101/src/index.ts` | Exports consumed by `cz-explorer` and plugin webview |

### Key Subdirectories

```
src/features/synth/
├── engine/           # synthEngineAdapter, synthEngineSnapshot, workletSynthEngineAdapter
├── hooks/            # useAudioEngine, useSynthParamsToWorklet, useNoteHandling, useLcdControlReadout
├── types/            # libraryPreset, presetEntry
├── SynthParamController.tsx
├── useSynthPresetManager.ts
└── useSynthState.ts

src/components/
├── controls/         # ControlKnob, LineSelectControl, ModModeControl, algo/, knob/, modulation/
├── editor/           # StepEnvelopeEditor, PerLineParametersCard, SingleCycleDisplay, etc.
├── layout/           # SynthPanelContainer, AsidePanelSwitcher, SynthLcdDisplay, HoverInfo
├── panels/           # fx/, voice/, analysis/ sub-panels
├── preset/           # PresetNavigator, SynthHeader
├── primitives/       # CzButton, CzTabButton, Card
└── renderer/         # SynthRenderer (top-level component)
```

## Development Workflow

### Adding a New Synth Parameter
1. Add to `src/lib/synth/bindings/synth.ts` binding types
2. Update `src/lib/synth/czPresetConverter.ts` if it maps from SysEx
3. Add control UI in the appropriate panel under `src/components/panels/`
4. Update `src/features/synth/hooks/useSynthParamsToWorklet.ts` to pass to audio worklet
5. If exposed to `cz-explorer`, export from `src/index.ts`

### Adding/Editing UI Controls
- Use `ControlKnob` for knob controls; wraps `KnobView` + modulation support
- Use `AlgoControlsGroup` / `AlgoControlItem` for algorithm-specific controls
- Use `ModulatableControl` for controls that can be modulation targets
- Wrap expensive components with `React.memo()`

### Updating the Public API
- `packages/cosmo-pd101/src/index.ts` is the single public entry point
- Only export what `cz-explorer` actually needs
- After changes, the lib-dist build rebuilds automatically in dev (`bun run dev`)
- Manually rebuild: `bun --filter @cosmo/cosmo-pd101 build:lib`

### Working with SysEx
- Decoder: `src/lib/midi/czSysexDecoder.ts`
- Always use `Uint8Array` for raw MIDI data (never `number[]`)
- SysEx starts `0xF0`, ends `0xF7`
- Converter: `src/lib/synth/czPresetConverter.ts` maps decoded patches to synth presets

## Testing

| Type | Command | Notes |
|------|---------|-------|
| Unit | `bun run test:unit` | Run from workspace root |
| Browser | `bun run test:browser` | Playwright |

- Test files colocated: `*.{test,spec}.{ts,tsx}` (unit) or `*.browser.test.{ts,tsx}` (browser)
- See `src/features/synth/useSynthPresetManager.test.tsx` as a reference test

## Key Conventions
- Tailwind + DaisyUI: prefer semantic DaisyUI classes; no inline `style=`
- TypeScript strict; no unused imports
- Path alias: `@/*` → `./src/*`
- Components: functional, `PascalCase.tsx`, `memo()` for expensive ones
- Hooks: `useCamelCase.ts`

## Build Artifacts
Compiled to `lib-dist/` as ESM `.mjs` files consumed by `cz-explorer` dev server via HMR.

## Commands (from workspace root)
```bash
bun run dev           # Dev server with lib watch + rebuild
bun run build         # Full build
bun run test:unit     # Unit tests
bun run test:browser  # Browser tests
```
