# CZ-101 Synth Implementation Plan

> Last updated: 2025-04-12

## Progress

| Phase | Status |
|-------|--------|
| Phase 0: Stabilize First | ✅ Complete |
| Phase 1: Presets and State Model | ✅ Complete |
| Phase 2: Layout Rebalance | ✅ Complete |
| Phase 3: Oscilloscope Improvements | ✅ Complete |
| Phase 4: Phase-Line Tabs/Accordion | Pending |
| Phase 3: Oscilloscope Improvements | Pending |
| Phase 4: Phase-Line Tabs/Accordion | Pending |
| Phase 5: Voice Fixes | Pending |
| Phase 6: Parameter Range Cleanup | Pending |
| Phase 7: Effects Tuning | Pending |
| Phase 8: Touch Keyboard | Pending |

## Overview

This plan organizes the implementation of CZ-101 synth improvements into phases. Each phase builds on the previous one, minimizing risk and ensuring the most impactful changes arrive first.

## Phase 0: Stabilize First

**Goal**: Fix current syntax/type errors to create a clean baseline.

| Task | Files | Description |
|------|-------|-------------|
| Fix `PhaseDistortionVisualizer.tsx` | `src/components/PhaseDistortionVisualizer.tsx` | Repair parse errors at lines 664–669, 1328, 1525 |
| Fix `vite.config.ts` | `vite.config.ts` | Remove unused `@ts-expect-error` directive |

**Acceptance**: `bun run lint` and `bun run build` both pass.

---

## Phase 1: Presets and State Model

**Goal**: Refactor presets to support defaults, import/export, and randomization.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 1.1 | Canonical defaults | `src/lib/synth/presetStorage.ts`, `src/components/PhaseDistortionVisualizer.tsx` | Define all defaults in one place; remove duplication between `gatherState`, `applyPreset`, and `resetToDefaults` |
| 1.2 | Export presets | `src/lib/synth/presetStorage.ts` | Add `exportPreset(name): string` that returns JSON |
| 1.3 | Import presets | `src/components/PhaseDistortionVisualizer.tsx` | Add file input to parse imported JSON and call `applyPreset` |
| 1.4 | Randomize patch | `src/components/PhaseDistortionVisualizer.tsx` | Add "Randomize" button that generates musical parameter ranges |
| 1.5 | Random preset load | `src/components/PhaseDistortionVisualizer.tsx` | Add "Random" button that picks a saved preset |
| 1.6 | Compact preset UI | `src/components/PhaseDistortionVisualizer.tsx` | Reduce preset panel vertical footprint |

**Acceptance**: Presets can be saved, loaded, exported, and imported. Defaults apply correctly. Randomize and random preset load both work.

---

## Phase 2: Layout Rebalance

**Goal**: Move oscilloscope to left column; reserve right column for phase-line editing.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 2.1 | Relocate oscilloscope | `src/components/PhaseDistortionVisualizer.tsx` | Move oscilloscope section to the left of the two-column layout |
| 2.2 | Consolidate right column | `src/components/PhaseDistortionVisualizer.tsx` | Right column contains only phase-line editing blocks |
| 2.3 | Reduce visual weight | `src/components/PhaseDistortionVisualizer.tsx` | Shrink scope container proportions |

**Acceptance**: Page layout flows scope left, synthesis editing right. Right column no longer mixes global controls with line editing.

---

## Phase 3: Oscilloscope Improvements

**Goal**: Make the scope easier to read and decouple it from global volume.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 3.1 | Auto-adjust zoom | `src/components/PhaseDistortionVisualizer.tsx` | Add auto-fit logic that scales based on current signal amplitude |
| 3.2 | Higher default zoom | `src/components/PhaseDistortionVisualizer.tsx` | Increase default `scopeVerticalZoom` for clearer waveform |
| 3.3 | Independent scope gain | `src/components/PhaseDistortionVisualizer.tsx` | Decouple scope visualization gain from global `volume` |
| 3.4 | Simplify scope controls | `src/components/PhaseDistortionVisualizer.tsx` | Keep only essential controls visible by default |

**Acceptance**: Lowering master volume does not flatten the visual display. Scope opens at readable scale without manual adjustment.

---

## Phase 4: Phase-Line Visualization and Editing

**Goal**: Per-line phase maps with tabs/accordion for space efficiency.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 4.1 | Split phase map | `src/components/PhaseDistortionVisualizer.tsx` | Show separate phase map for Line 1 and Line 2 instead of combined |
| 4.2 | Tabs or accordion | `src/components/PhaseDistortionVisualizer.tsx` | Replace stacked phase-line blocks with tabs (recommended) |
| 4.3 | Collapsed summary | `src/components/PhaseDistortionVisualizer.tsx` | When collapsed, show: algorithm, octave, tiny envelope preview, single-cycle preview |

**Acceptance**: Each line is independently inspectable. Editor is significantly shorter vertically. Collapsed state still communicates enough information.

---

## Phase 5: Voice and Playability Fixes

**Goal**: Fix mono mode, sustain, and velocity handling.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 5.1 | Fix mono mode | `src/components/PhaseDistortionVisualizer.tsx`, `public/pdVisualizerProcessor.js` | Review mono behavior; add predictable retrigger/legato logic |
| 5.2 | Fix sustain stuck notes | `src/components/PhaseDistortionVisualizer.tsx`, `public/pdVisualizerProcessor.js` | Review note lifecycle and sustain handler |
| 5.3 | Velocity off mode | `src/components/PhaseDistortionVisualizer.tsx` | Add explicit velocity-disable option (not just target selection) |
| 5.4 | Verify note handlers | `src/components/PhaseDistortionVisualizer.tsx` | Check `sendNoteOn`, `sendNoteOff`, sustain refs for edge cases |

**Acceptance**: Mono mode behaves predictably. Sustain does not hang. Velocity can be disabled entirely.

---

## Phase 6: Parameter Range Cleanup

**Goal**: Reduce ranges and add useful granularity for PM and chorus.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 6.1 | Reduce PM amount range | `src/components/PhaseDistortionVisualizer.tsx` | Lower `intPmAmount` max; identify musically useful upper bound |
| 6.2 | Reduce PM ratio range | `src/components/PhaseDistortionVisualizer.tsx` | Lower `intPmRatio` max; add finer stepping |
| 6.3 | Add intermediate values | `src/components/PhaseDistortionVisualizer.tsx` | Add finer step sizes so controls feel less jumpy |
| 6.4 | Cap chorus depth | `src/components/PhaseDistortionVisualizer.tsx` | Set max to 3 (currently 20) |
| 6.5 | Granular chorus depth | `src/components/PhaseDistortionVisualizer.tsx` | Add finer stepping for chorus depth values |

**Acceptance**: PM controls are easier to dial in musically. Chorus depth is constrained to sensible values.

---

## Phase 7: Effects Tuning

**Goal**: Improve reverb and recalibrate chorus defaults.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 7.1 | Improve reverb | `src/components/PhaseDistortionVisualizer.tsx`, `public/pdVisualizerProcessor.js` | Retune reverb algorithm; reduce harshness or smearing |
| 7.2 | Recalibrate chorus | `src/components/PhaseDistortionVisualizer.tsx` | Tune around new constrained depth range |
| 7.3 | Set better defaults | `src/components/PhaseDistortionVisualizer.tsx` | Adjust default FX so reset state sounds intentional |

**Acceptance**: Default FX sound acceptable without immediate tweaking. Reverb and chorus feel additive.

---

## Phase 8: Touch Keyboard Decision

**Goal**: Remove or rework the touch keyboard.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 8.1 | Decide fate | — | Choose between remove or rework based on usage |
| 8.2 | If rework: overlay style | `src/components/PhaseDistortionVisualizer.tsx` | Make keyboard taller; use overlay presentation |
| 8.3 | If rework: improve layout | `src/components/PhaseDistortionVisualizer.tsx` | Ensure desktop keyboard and touch input coexist cleanly |

**Recommendation**: Rework rather than remove, unless usage data indicates the feature is unused.

**Acceptance**: Keyboard is either clearly useful or removed cleanly. No more cramped button strip.

---

## Implementation Order Summary

```
Phase 0  → Stabilize compile errors
Phase 1  → Presets and defaults
Phase 2  → Layout rebalance
Phase 3  → Oscilloscope behavior
Phase 4  → Phase-line tabs/accordion and per-line maps
Phase 5  → Mono/sustain/velocity fixes
Phase 6  → PM and chorus range tuning
Phase 7  → Reverb improvement
Phase 8  → Touch keyboard rework or removal
```

## Why This Order

1. **Fix blockers first** — Compile errors make every other task riskier.
2. **Structural UI before fine-tuning** — Layout changes affect where controls live; doing them early prevents rework.
3. **State model before UI** — Cleaner preset handling makes subsequent UI easier to build.
4. **Polishing last** — Effects tuning and keyboard decisions are lower risk and benefit from all the groundwork.

## Acceptance Criteria

- [ ] `bun run lint` passes
- [ ] `bun run build` passes
- [ ] Manual synth smoke test:
  - [ ] Poly mode works
  - [ ] Mono mode works
  - [ ] Sustain releases cleanly
  - [ ] Velocity toggle works
  - [ ] Preset save/load works
  - [ ] Preset export/import works
  - [ ] Randomize patch works
  - [ ] Random saved preset works
- [ ] Manual UI test on narrow and wide layouts
- [ ] Manual audio test:
  - [ ] Scope scales independently of volume
  - [ ] Chorus depth behaves in range 0–3
  - [ ] Reverb sounds acceptable

---

## Notes

- **LSP errors** shown in `PhaseDistortionVisualizer.tsx` at lines 664–669, 1328, 1525 need repair before any other work begins.
- **Voice mode** implementation lives in `polyMode` state and the worklet processor.
- **Preset storage** uses `localStorage` with prefix `cz101-preset-` and key `cz101-current-state`.
- **Touch keyboard** currently renders as a button strip below the main controls; redesign should use overlay or full-width presentation.
