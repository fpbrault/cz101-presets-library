# Synth Refactoring Plan

## Decisions
- PhaseDistortionVisualizer: Extract 5-6 hooks, component becomes ~200 lines
- Scope rendering: Shared `drawOscilloscope()` function, keep two hooks
- SharedSynthUiRenderer: Context provider to eliminate prop drilling
- i18n: Single shared locale file in cz-explorer, cosmo-pd101 imports it
- SynthUiContext: Full synthState in context
- Locales: `en` only to start

---

## Phase 1: Install i18next deps
- [ ] Add `i18next` + `react-i18next` to cz-explorer
- [ ] Add `i18next` + `react-i18next` to cosmo-pd101/webview

## Phase 2: Create shared i18n setup
- [ ] `packages/cz-explorer/src/i18n/index.ts` — i18next init
- [ ] `packages/cz-explorer/src/i18n/locales/en/synth.json` — All synth strings
- [ ] `packages/cosmo-pd101/webview/src/i18n.ts` — Re-exports from cz-explorer

## Phase 3: Extract drawOscilloscope
- [ ] `packages/cz-explorer/src/lib/synth/drawOscilloscope.ts` — Pure canvas drawing function

## Phase 4: Extract hooks from PhaseDistortionVisualizer
- [ ] `packages/cz-explorer/src/features/synth/hooks/useAudioEngine.ts`
- [ ] `packages/cz-explorer/src/features/synth/hooks/useNoteHandling.ts`
- [ ] `packages/cz-explorer/src/features/synth/hooks/useLcdControlReadout.ts`
- [ ] `packages/cz-explorer/src/features/synth/hooks/useSynthParamsToWorklet.ts`

## Phase 5: Create SynthUiContext
- [ ] `packages/cz-explorer/src/context/synthUiContext.tsx` — Provider with full synthState

## Phase 6: Refactor PhaseDistortionVisualizer
- [ ] Compose extracted hooks, reduce to ~200 lines

## Phase 7: Refactor SharedSynthUiRenderer
- [ ] Read from SynthUiContext instead of 70+ props

## Phase 8: Update PluginPage
- [ ] Use SynthUiContext + shared i18n
- [ ] Update usePluginScopeRenderer to use drawOscilloscope

## Phase 9: Verify
- [ ] `bun run lint`
- [ ] `bun run build`
- [ ] `bun run test:unit --run`
- [ ] `bun run test:browser --run`
