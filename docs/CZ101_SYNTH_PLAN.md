# Cosmo PD-101 Phase Distortion Synthesizer — Implementation Plan

## Overview

Add a `/synth` route to the existing Tauri+React CZ-101 preset librarian app that implements a browser-based CZ-101 synthesizer using Web Audio AudioWorklet technology. The synth reads `DecodedPatch` data from the existing SysEx decoder and renders it to audio in real-time.

## Architecture

### New Files

```
src/lib/synth/
├── pdOscillator.ts          # Phase distortion math (pure functions, testable)
├── windowFunction.ts        # 8 per-cycle window shapes
├── envelopeGenerator.ts     # 8-step CZ envelope with rate/time mapping
├── czVoice.ts               # Single voice parameter model
├── czSynthEngine.ts         # Polyphonic engine (8 voices, note management)
├── patchAdapter.ts          # DecodedPatch → synth parameter mapping
├── cz101Processor.ts        # AudioWorkletProcessor (runs on audio thread)
└── cz101WorkletUrl.ts       # Vite worker import helper

src/features/synth/
├── SynthPage.tsx             # Main page: audio init, patch selector, keyboard
├── SynthKeyboard.tsx         # Virtual 2-octave piano (click/touch + QWERTY)
├── SynthOscilloscope.tsx     # Real-time waveform + spectrum via AnalyserNode
└── useCzSynth.ts             # Hook: manages AudioContext + engine lifecycle

src/routes/SynthPage.tsx       # Lazy-loaded route component
```

### Modified Files

- `src/routes/router.tsx` — add `/synth` route
- `src/components/layout/AppSidebar.tsx` — add Synth nav item with FaMusic icon
- `vite.config.ts` — add AudioWorklet entry point for Vite bundling

---

## Phase Distortion Engine

### 8 Basic Waveforms (Phase Transfer Functions)

The CZ-101 generates waveforms via **phase distortion**: a linear phase accumulator `φ ∈ [0,1)` is transformed by a waveform-specific transfer function, then `sin(2π · f(φ))` produces the output sample.

| ID | Name        | Transfer Function `f(φ)`                                |
|----|-------------|----------------------------------------------------------|
| 1  | Saw         | `f(φ) = φ` (linear ramp → half-sine shape at output)    |
| 2  | Square      | `f(φ) = φ < 0.5 ? 0 : 1` (step function)                |
| 3  | Pulse       | `f(φ) = φ < 0.25 ? 0 : (φ < 0.75 ? 1 : (φ < 1 ? 0 : 0))` |
| 4  | Null        | `f(φ) = φ < 0.01 ? φ/0.01 : 0` (percussive click then silence) |
| 5  | Sine-Pulse  | `f(φ) = φ < 0.15 ? φ/0.15 : 0`                          |
| 6  | Saw-Pulse   | `f(φ) = φ < 0.15 ? φ/0.15 : φ`                          |
| 7  | Multi-Sine  | Resonance: `sin(2πφ) · (1 + k·sin²(πφ))` where k modulates resonance peak count |
| 8  | Pulse2      | `f(φ) = (φ < 0.15 ∨ (φ ≥ 0.5 ∧ φ < 0.65)) ? 1 : 0` (double-frequency pulse) |

### Waveform Output

Each waveform's output sample is: `output = sin(2π · f(φ))` where `f(φ)` is the distorted phase.

The **distortion depth** parameter (controlled by the DCW envelope, 0 to 1) interpolates between a pure sine and the fully distorted waveform:

```
output = sin(2π · lerp(φ, f(φ), depth))
```

At `depth = 0`, output is pure sine. At `depth = 1`, output is the full waveform.

### Combination Waves

When a second waveform is enabled, the oscillator **alternates** between wave1 and wave2 on a per-cycle basis. A cycle counter toggles each period:

- Odd cycles: use `wave1` transfer function
- Even cycles: use `wave2` transfer function

### Window Function (Per-Cycle Amplitude Envelope)

The window function modulates amplitude **within each cycle** of the waveform. It is a per-period amplitude shape that repeats every cycle:

| ID | Name        | Shape                                                            |
|----|-------------|------------------------------------------------------------------|
| 0  | None        | Constant 1.0 (no windowing)                                     |
| 1  | Saw         | Ramps down from 1.0 to 0.0 over the period                     |
| 2  | Triangle    | 0.0 → 1.0 → 0.0 (peak at midpoint)                             |
| 3  | Trapezoid   | 1.0 → 1.0 → 0.0 (holds high then drops at midpoint)            |
| 4  | Pulse       | 1.0 → 0.0 (drops at midpoint, stays at 0)                      |
| 5  | DoubleSaw   | 0 → 1 → 0 → 1 → 0 (two ramps per period)                       |

Window output: `sample = waveform(φ) · window(φ)`

### Modulation Modes

| Bits | Type              | Behavior                                                          |
|------|-------------------|-------------------------------------------------------------------|
| 000  | None              | No modulation                                                     |
| 001  | None              | No modulation                                                     |
| 010  | Ring 2 (hidden)   | Ring mod with slight detune for metallic quality                  |
| 011  | Noise 1           | Noise modulation — random amplitude variation per cycle           |
| 100  | Ring 1             | Standard ring modulation: `line1 · line2`                        |
| 101  | Ring 1            | Same as 100                                                      |
| 110  | Ring 3 (hidden)   | Combined ring1+ring2                                              |
| 111  | Noise 2 (hidden)  | Milder noise modulation                                           |

- **Ring modulation**: `output = line1Sample · line2Sample`
- **Noise modulation**: `output = line1Sample · random(cycle)` where random varies per-cycle
- **Normal mode** (special bit 0): `output = (line1Sample + modulatedOutput) / 2`
- **Mute line 1** (special bit 1): `output = modulatedOutput` only

---

## Envelope System

### 8-Step Envelope Structure

Each envelope has 8 steps with:

- **Rate** (0–99): Time duration for the step to reach its target level
- **Level** (0–99): Target amplitude/depth/pitch at the end of this step
- **Falling** (DCA): Level decreases from previous step (relative drop)
- **Sustain** (DCW): Hold at this level until note-off
- **End Step** (1–8): After this step, the envelope holds its last level (or loops for DCO)

### Rate-to-Time Mapping

Exponential mapping from rate value to step duration:

```
durationMs = 10000 × 0.5^((99 - rate) / 25)
```

| Rate | Approx. Duration |
|------|-----------------|
| 0    | 10,000 ms       |
| 25   | ~590 ms         |
| 50   | ~35 ms          |
| 75   | ~2 ms           |
| 99   | ~1 ms           |

### Envelope Types

**DCA (Amplitude)**:
- Level 0–99 maps to gain 0.0–1.0
- Falling flag: step level = previous_level - (0x7F - rawLevel)
- Key follow: `gain *= 1 + (keyFollow / 9) × (note - 60) / 60`

**DCW (Waveform / PD Depth)**:
- Level 0–99 maps to PD depth 0.0–1.0
- Sustain points hold until note-off
- Key follow: `depth *= 1 + (keyFollow / 9) × (note - 60) / 60`
- This is the "filter" of the CZ — it sweeps the distortion depth over time

**DCO (Pitch)**:
- Level 0–99 maps to pitch offset in semitones
- Center (level ~50) = no pitch change
- Level 0 = -2 octaves, Level 99 = +2 octaves (approximate)
- Special byte mapping: 0x00–0x3F → 0–63, 0x44–0x67 → 64–99

### Envelope Advance Logic

1. On note-on: start at step 1, advance through each step at its rate duration
2. If step has **sustain** flag: hold at this level until note-off
3. On note-off (release): continue advancing past sustain points
4. At **end step**: hold final level until note-off, then release to 0
5. Release phase: exponential decay from current level to 0 over ~200ms

---

## Voice Signal Flow

### Single Line

```
MIDI Note → DCO Envelope (pitch offset)
                ↓
         Base Frequency (note + octave + DCO pitch)
                ↓
         Phase Accumulator φ (increments at frequency rate)
                ↓
         Phase Distortion: lerpedDistorted = lerp(φ, waveShape(φ), DCW_depth)
                ↓
         Window Function: windowedSample = sin(2π · lerpedDistorted) × window(φ)
                ↓
         DCA Envelope (amplitude)
                ↓
         Output Sample
```

### Dual Line Modes

| Line Select | Behavior                                    |
|-------------|---------------------------------------------|
| L1          | Only Line 1 produces output                 |
| L2          | Only Line 2 produces output                 |
| L1+1'       | Both lines play, Line 2 detuned (thicker sound) |
| L1+2'       | Both lines play (parallel, independent)      |

### Detune

- `detuneFine` (0–60): fine detune in cents (0.5 cent increments)
- `detuneOctave` (0–3): octave offset for Line 2
- `detuneNote` (0–11): semitone offset for Line 2
- `detuneDirection`: "+" or "-" applies to fine detune direction

Line 2 frequency = baseFreq × 2^(detuneOctave + detuneNote/12) × 2^(±detuneFine/1200)

### Vibrato LFO

| Wave | Shape                      |
|------|----------------------------|
| 1    | Triangle                   |
| 2    | Upward Sawtooth            |
| 3    | Downward Sawtooth          |
| 4    | Square                     |

- **Delay**: Time before vibrato starts (0–99 maps to 0ms–5s)
- **Rate**: LFO frequency (0–99 maps to ~0.1Hz–20Hz)
- **Depth**: Pitch modulation amount (0–99 maps to 0–±50 cents)

---

## AudioWorklet Architecture

### `cz101Processor.ts`

Single `AudioWorkletProcessor` that manages all voices internally:

```typescript
class CZ101Processor extends AudioWorkletProcessor {
  voices: VoiceState[] = new Array(8);
  activePatch: PatchParams | null = null;

  process(inputs, outputs, params) {
    // For each output sample:
    //   1. Advance all active voice phase accumulators
    //   2. Evaluate envelope states for each voice
    //   3. Render each line (DCO → DCW → DCA) per voice
    //   4. Mix according to lineSelect mode
    //   5. Output to channel 0
  }
}
```

### Message Protocol (main thread ↔ worklet)

```typescript
// Main → Worklet
{ type: "setPatch", params: PatchParams }
{ type: "noteOn", note: number, velocity: number }
{ type: "noteOff", note: number }
{ type: "setParam", key: string, value: number }

// Worklet → Main
{ type: "ready" }
{ type: "oscilloscope", samples: Float32Array }
```

### `PatchParams` Structure

```typescript
interface PatchParams {
  lineSelect: "L1" | "L2" | "L1+1'" | "L1+2'";
  octave: number;

  line1: {
    waveform1: number;      // 1-8
    waveform2: number | null;
    window: number;          // 0-7
    modulation: number;      // 0-7
    muteLine1: boolean;

    dca: EnvelopeParams;
    dcw: EnvelopeParams;
    dco: EnvelopeParams;
    dcaKeyFollow: number;
    dcwKeyFollow: number;
  };

  line2: {
    waveform1: number;
    waveform2: number | null;
    window: number;
    modulation: number;
    muteLine1: boolean;

    dca: EnvelopeParams;
    dcw: EnvelopeParams;
    dco: EnvelopeParams;
    dcaKeyFollow: number;
    dcwKeyFollow: number;
  };

  detuneFine: number;
  detuneOctave: number;
  detuneNote: number;
  detuneDirection: "+" | "-";

  vibrato: {
    wave: number;
    delay: number;
    rate: number;
    depth: number;
  };
}

interface EnvelopeParams {
  steps: { rate: number; level: number; falling: boolean; sustain: boolean }[];
  endStep: number;
}
```

### Vite Configuration

The AudioWorklet entry point needs special handling in `vite.config.ts`:

```typescript
// New worklet entry adds a separate build target
// The worklet file uses `registerProcessor` (not module.exports)
// Main thread loads it via: new AudioWorkletNode(context, 'cz101-processor')
```

Use Vite's `worker` import pattern:
```typescript
// cz101WorkletUrl.ts
export const workletUrl = new URL('./cz101Processor.ts', import.meta.url)
```

---

## Patch Adapter (`patchAdapter.ts`)

Maps `DecodedPatch` to `PatchParams` for the worklet:

```typescript
function decodedPatchToSynthParams(patch: DecodedPatch): PatchParams
```

Key mappings:
- `WaveformId` (1–8) → waveform select index
- `WaveformConfig.modulation` → modulation bits (none=0, ring=4, noise=3)
- `WaveformConfig.secondWaveform` → combination wave mode
- Envelope steps → `EnvelopeParams` with proper rate-to-ms conversion
- Line select → voice routing mode
- Octave → base frequency multiplier
- Key follow values → scaling factors

### Window Function Extraction

The existing `DecodedPatch` type does **not** include window function data. The SysEx waveform byte (sections 8, 17) encodes window bits:

From section 8 byte 2 (`b2`):
- Bits 0–2: `wtExt` (waveform extension for resonance)
- Bits 3–5: modulation select
- Bits 6–7: **window function** (2 bits)

This needs to be extended. Options:
1. Extend `DecodedPatch` to include window function in `WaveformConfig`
2. Re-extract window bits in the adapter from raw SysEx data

**Decision**: Extend `WaveformConfig` in `czSysexDecoder.ts` to include `window: 0-7` and `modBits: number` for full fidelity.

---

## UI Components

### SynthPage

Top-level page component that:
1. Initializes `AudioContext` on first user gesture (click/key)
2. Creates `AudioWorkletNode` and connects to destination
3. Connects `AnalyserNode` for oscilloscope
4. Provides patch selector dropdown (reads from `PresetDatabase`)
5. Renders keyboard, oscilloscope, and parameter display

### SynthKeyboard

Virtual 2-octave piano keyboard:
- 25 keys (C3–C5) with proper black/white key layout
- Click/touch to play notes
- QWERTY keyboard mapping: Z=C3, S=C#3, X=D3, ... M=C5
- Visual key highlighting on active notes
- Velocity: fixed at 100 for mouse/touch, 127 for keyboard shortcuts

### SynthOscilloscope

Real-time visualization using `AnalyserNode`:
- Waveform display (time domain) — shows 2–3 periods
- Optional: spectrum display (frequency domain)
- Uses `requestAnimationFrame` for smooth 60fps updates
- Canvas-based rendering for performance

### useCzSynth Hook

Manages the AudioContext and engine lifecycle:
```typescript
function useCzSynth() {
  // Returns: { playNote, stopNote, setPatch, analyserNode, isReady }
  // Handles AudioContext creation on user gesture
  // Manages AudioWorklet loading
  // Provides preset loading from database
}
```

---

## Routing & Navigation

### Route Addition

`src/routes/router.tsx`:
```typescript
const SynthPage = lazy(() => import("./SynthPage"));

const synthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/synth",
  component: SynthPage,
});
```

### Sidebar Addition

`src/components/layout/AppSidebar.tsx`:
- Add `"synth"` to `AppMode` union type
- Add `/synth` to `routeToMode` and `modeToRoute` maps
- Add nav button with `FaMusic` icon (from `react-icons/fa`)
- Icon-only: synthesizer icon with waveform styling
- Expanded: "Synthesizer" label

---

## DSP Code Reference

This section documents each implemented DSP module in detail, explaining the math, data flow, and design decisions.

### `pdOscillator.ts` — Phase Distortion Transfer Functions

**File**: `src/lib/synth/pdOscillator.ts`

The core synthesis primitive. Phase distortion works by remapping a linear phase accumulator `φ ∈ [0,1)` through a waveform-specific transfer function `f(φ)`, then computing `sin(2π · f(φ))` as the output sample.

#### Transfer Function Catalog

| ID | Name | Formula | Behavior |
|----|------|---------|----------|
| 1 | Saw | `f(φ) = φ` | Linear phase → produces half-sine shape. At full depth, output resembles a sine-saw hybrid. |
| 2 | Square | `f(φ) = φ < 0.5 ? 0 : 1` | Phase stays at 0 for the first half, jumps to 1 for the second half. Produces a square-like waveform. |
| 3 | Pulse | `f(φ) = φ ≥ 0.25 && φ < 0.75 ? 1 : 0` | Centered pulse: high in the middle 50% of the period. Produces a wide-pulse waveform. |
| 4 | Null | `f(φ) = φ < 0.01 ? φ/0.01 : 0` | Extremely short impulse (1% of period) then silence. Simulates percussive click attacks. |
| 5 | Sine-Pulse | `f(φ) = φ < 0.15 ? φ/0.15 : 0` | Short ramp (15% of period) then silence. Softer attack than Null, produces plucky tones. |
| 6 | Saw-Pulse | `f(φ) = φ < 0.15 ? φ/0.15 : φ` | Short pulse at start, then continues as saw (waveform 1). Creates a bright attack transient over a saw body. |
| 7 | Multi-Sine | `f(φ) = φ + k·sin(2πφ)·sin(πφ)` | Phase modulated by sine products. The factor `k` (default 3) controls resonance peak count. Basis for all CZ resonant tones. |
| 8 | Pulse2 | `f(φ) = (φ < 0.15 ∨ (φ ≥ 0.5 ∧ φ < 0.65)) ? 1 : 0` | Double-frequency pulse: pulses at 0% and 50% of the period. Octave-up brightness. |

#### Distortion Depth (DCW)

The DCW envelope controls how much the transfer function distorts the sine:

```
output = sin(2π · lerp(φ, f(φ), depth))
```

- `depth = 0`: pure sine (`lerp` returns `φ`) — the waveform has no character
- `depth = 0.5`: halfway between sine and full waveform — the CZ's signature evolving tones
- `depth = 1`: fully distorted — the waveform shape is maximally pronounced

This is **the core sound-design mechanism** of the CZ: the DCW envelope sweeps `depth` over time, giving each note its tonal evolution.

#### Combination Waves

When `waveform2` is set (not null), the oscillator **alternates** between the two waveforms on a per-cycle basis:

- `cycleCount % 2 === 0` → use `waveform1` (primary)
- `cycleCount % 2 === 1` → use `waveform2` (secondary)

This creates a thick, time-varying timbre because the two waveforms' shapes differ each alternate cycle. The cycle counter (`cycleCount`) increments each time `φ` wraps through 1.0.

#### Phase Advancement

```typescript
advancePhase(state, frequency, sampleRate):
  state.phi += frequency / sampleRate
  while state.phi >= 1:
    state.phi -= 1
    state.cycleCount++  // new cycle begins
    newCycle = true
```

The phase accumulator increments by `freq/sr` per sample. When it wraps past 1.0, a new cycle begins and `cycleCount` increments for combination-wave alternation.

---

### `windowFunction.ts` — Per-Cycle Window Envelope

**File**: `src/lib/synth/windowFunction.ts`

Window functions apply a **per-cycle amplitude shape** to the waveform. Each period, the waveform sample is multiplied by the window value at the current phase position:

```
sample = sin(2π · lerpedPhase) × window(φ)
```

This is **not** an amplitude envelope in the traditional sense — it repeats every cycle, creating harmonic-content effects similar to pulse-width modulation.

#### Window Shapes

| ID | Name | Formula | Per-Cycle Shape |
|----|------|---------|-----------------|
| 0 | None | `1` | Flat — no effect |
| 1 | Saw | `1 - φ` | Ramps from 100% at cycle start to 0% at cycle end. Softens high harmonics progressively. |
| 2 | Triangle | `φ < 0.5 ? 2φ : 2(1-φ)` | Peaks at 100% at mid-cycle, zero at cycle boundaries. Creates hollow, reedy tones. |
| 3 | Trapezoid | `φ < 0.5 ? 1 : 2(1-φ)` | Holds 100% for first half, ramps down to 0% for second half. Like a PWM effect. |
| 4 | Pulse | `φ < 0.5 ? 1 : 0` | 100% for first half, 0% for second. Strong harmonic content, buzzy tone. |
| 5/6/7 | DoubleSaw | `1 - |2·(2φ mod 1) - 1|` | Two sawtooth ramps per cycle: 0→1→0→1→0. Creates a warbling, chorus-like effect. |

IDs 5, 6, and 7 are all mapped to DoubleSaw — the original hardware only had 6 unique shapes, with the extra bits creating duplicates.

#### Implementation

```typescript
applyWindow(windowId, phi, sample): sample × WINDOW_FUNCTIONS[windowId](phi)
windowAmplitude(windowId, phi): WINDOW_FUNCTIONS[windowId](phi)
```

`applyWindow` multiplies a sample by the window amplitude. `windowAmplitude` returns just the scalar for debugging or visualization.

---

### `envelopeGenerator.ts` — 8-Step Envelope State Machine

**File**: `src/lib/synth/envelopeGenerator.ts`

The CZ-101 has three envelope types per line (DCA, DCW, DCO), each with up to 8 steps. This module implements the state machine that advances through steps over time.

#### Rate-to-Duration Exponential Mapping

```
durationMs = 10000 × 0.5^((99 - rate) / 25)
```

This maps:
- `rate = 0` → 10,000 ms (very slow, 10 seconds per step)
- `rate = 25` → ~590 ms
- `rate = 50` → ~35 ms
- `rate = 75` → ~2 ms
- `rate = 99` → ~1 ms (essentially instant)

The exponential curve ensures musical timing — small rate values map to long durations (for slow sweeps), while large values are near-instantaneous (for percussive attacks).

#### Envelope Phases

The envelope state machine has four phases:

| Phase | Behavior |
|-------|----------|
| `Attack` | Advancing through steps 0→7 at each step's rate. Steps with `sustain=true` hold. After `endStep`, transitions to `Sustain`. |
| `Sustain` | Holding the current level. Entered when a step has `sustain=true` (DCW envelopes) or after reaching `endStep`. |
| `Release` | 200ms linear decay from the current level to 0. Entered on note-off. |
| `Off` | Envelope output is 0. Final state after release completes. |

#### Step Advancement Algorithm

For each sample, `advanceEnvelope(state, params, deltaMs)` advances the state:

1. **Each step** has a rate → duration. The envelope interpolates linearly from the current level to the step's target level over that duration.
2. **Sustain points**: When a step has `sustain=true` and we're at its start (`offset === 0`), the envelope immediately transitions to `Sustain` phase and holds at that level. On note-off, it resumes advancing past the sustain point.
3. **endStep**: After completing the end step, the envelope holds its final level in `Sustain` phase until note-off.
4. **Multiple steps per call**: The `while` loop consumes `remainingMs` across multiple steps in a single call, correctly handling steps that are shorter than the sample period (e.g., at high rates).

```typescript
while (remainingMs > 0 && state.phase === Attack) {
  if (step >= endStep) → Sustain phase, hold final level
  if (step.sustain && offset === 0) → Sustain phase, hold at this level
  compute elapsed = offset + remaining
  if elapsed < stepDuration → interpolate, consume remaining
  else → advance to next step, carry remaining time
}
```

#### Level Interpolation

Within a step, levels interpolate linearly from the current level to the target:

```typescript
state.currentLevel = fromLevel + (targetLevel - fromLevel) × progress
```

Where `progress = elapsedInStep / stepDuration`. This gives piecewise-linear envelopes — a reasonable approximation of the CZ hardware's exponential segments.

#### Note-Off and Release

```typescript
envelopeNoteOff(state):
  if (state.phase !== Off) {
    state.releaseStartLevel = state.currentLevel
    state.releaseOffsetMs = 0
    state.phase = Release
  }
```

Release phase decays linearly over 200ms: `level = startLevel × (1 - t/200)` until `t ≥ 200ms`, then `phase = Off`.

---

### `cz101Processor.ts` — AudioWorklet Renderer

**File**: `src/lib/synth/cz101Processor.ts`

This is the **self-contained AudioWorklet processor** that runs on the audio rendering thread. It cannot import modules, so all DSP math is inlined from the standalone modules.

#### Architecture Constraints

AudioWorklets run in a separate JavaScript context with no module import support. The processor must:
- Be a single self-contained file
- Register itself via `registerProcessor("cz101-processor", CZ101Processor)`
- Communicate with the main thread via `this.port.onmessage` / `this.port.postMessage`
- Use `Float32Array` for audio buffers (no `Uint8Array` or complex objects)

#### Message Protocol

**Main → Worklet** (via `AudioWorkletNode.port.postMessage`):

| Message | Fields | Description |
|---------|--------|-------------|
| `setPatch` | `params: PatchParamsMsg` | Full patch parameters (all envelopes, waveforms, etc.) |
| `noteOn` | `note: number, velocity: number` | Start a note (MIDI note number, 0-127) |
| `noteOff` | `note: number` | Release the note |

**Worklet → Main** (via `this.port.postMessage`):

| Message | Fields | Description |
|---------|--------|-------------|
| `ready` | (none) | Sent on construction, signals worklet is ready |
| `oscilloscope` | `samples: number[]` | ~256-sample waveform buffer for visualization |

#### Per-Channel State (`LineState`)

Each line (1 and 2) maintains independent state:

```typescript
interface LineState {
  phi: number;          // Phase accumulator [0, 1)
  cycleCount: number;   // Cycle counter for combination waves
  dcaEnv: EnvState;     // Amplitude envelope state
  dcwEnv: EnvState;     // Waveform/depth envelope state
  dcoEnv: EnvState;     // Pitch envelope state
}
```

#### Sample Rendering Loop (`renderLineSample`)

For each output sample, each active line computes:

```
1. dcaLevel = advanceEnv(dcaEnv, line.dca, deltaMs)
2. dcwDepth = advanceEnv(dcwEnv, line.dcw, deltaMs)
3. dcoOffset = advanceEnv(dcoEnv, line.dco, deltaMs)

4. Apply key follow: amplitude = clamp(dcaLevel × (1 + keyFollow × (note-60)/60))
5. Apply key follow: depth = clamp(dcwDepth × (1 + keyFollow × (note-60)/60))

6. Compute frequency: baseFreq × 2^(dcoSemitones/12)
   where dcoSemitones = (dcoOffset - 0.5) × 4

7. Advance phase: phi += freq / sampleRate
   On wrap: cycleCount++

8. Select waveform (combination wave alternation):
   useWave = (waveform2 !== null && cycleCount % 2 === 1) ? waveform2 : waveform1

9. Compute PD sample:
   distorted = pdTransfer(useWave, phi)
   lerped = lerp(phi, distorted, depth)
   sample = sin(2π × lerped) × windowApply(window, phi)

10. Apply amplitude: sample × amplitude
```

**Key follow** scales the DCA level and DCW depth based on the played note relative to middle C (MIDI 60). At key follow = 0, all notes have equal amplitude/depth. At key follow = 9, high notes are louder/brighter, low notes are softer/darker.

**DCO pitch envelope** offsets the center frequency by mapping `dcoOffset` (0–1) to approximately ±2 semitones: `dcoSemitones = (dcoOffset - 0.5) × 4`, so offset 0 = -2 semitones, offset 0.5 = unison, offset 1 = +2 semitones.

#### Line Mixing and Modulation

After rendering both lines, the processor combines them based on line select and modulation:

```
if modulation bits indicate noise (011):
  output = (line1 + line1 × random(-1,+1)) / 2
  (Mute-line1 bit would suppress the direct line1 contribution)

if modulation bits indicate ring mod (100, 101, 010, 110):
  output = line1 × line2

if modulation bits indicate mild noise (111):
  output = (line1 + line1 × random(-1,+1)×0.5) / 2

if no modulation:
  L1 only → output = line1
  L2 only → output = line2
  L1+1' or L1+2' → output = (line1 + line2) / 2
```

**Ring modulation** multiplies both lines sample-by-sample, creating sum-and-difference harmonics. **Noise modulation** multiplies the line by a random value, creating spectrally rich noise-overlay effects.

#### Note-On / Note-Off

- **noteOn**: Sets MIDI note and velocity (scaled 0–1), creates fresh `LineState` for both lines
- **noteOff**: Calls `envNoteOff` on all 6 envelopes (DCA, DCW, DCO × 2 lines)
- The processor goes `active = false` when both lines' DCA envelopes reach `Off` phase

#### Detune Calculation

Line 2's frequency adjusts relative to the base:

```
line2Freq = baseFreq × 2^(detuneOctave + detuneNote/12 + detuneSign × detuneFine/1200)
```

- `detuneOctave` (0–3): shifts by whole octaves
- `detuneNote` (0–11): shifts by semitones
- `detuneFine` (0–60): shifts by cents (0.5 cent increments → divide by 1200 for semitone fraction)
- `detuneDirection`: "+" or "-" (applied as sign to fine detune)

#### Vibrato LFO

*(Defined in the processor but not yet active in the render loop — pending implementation)*

The vibrator parameters include:
- `wave`: 1=Triangle, 2=Up Saw, 3=Down Saw, 4=Square
- `delay`: Time before vibrato starts (0–99, mapped to 0–5 seconds)
- `rate`: LFO frequency (0–99, mapped to ~0.1–20 Hz)
- `depth`: Pitch modulation (0–99, maps to 0–±50 cents)

---

### `patchAdapter.ts` — DecodedPatch → PatchParamsMsg Mapper

**File**: `src/lib/synth/patchAdapter.ts`

Converts the application-level `DecodedPatch` (from the SysEx decoder) into the serializable `PatchParamsMsg` format consumable by the AudioWorklet.

#### Key Mappings

| DecodedPatch Field | PatchParamsMsg Field | Notes |
|---|---|---|
| `lineSelect` | `lineSelect` | Direct string: "L1", "L2", "L1+1'", "L1+2'" |
| `octave` | `octave` | Direct: -1, 0, or 1 |
| `dco1.firstWaveform` | `line1.waveform1` | Cast from `WaveformId` to `number` |
| `dco1.secondWaveform` | `line1.waveform2` | Null-preserving cast |
| `dco1.modulation` | `line1.modulation` | "none"→0, "ring"→0b100, "noise"→0b011 |
| Envelope `.steps[]` | EnvelopeMsg `.steps[]` | Preserves `{rate, level, falling, sustain}` |
| `dca1KeyFollow` | `line1.dcaKeyFollow` | Direct |
| `dcw1KeyFollow` | `line1.dcwKeyFollow` | Direct |

#### Window Function Limitation

Currently, `window` is hardcoded to `0` (None) for both lines because the existing `DecodedPatch` type does not include window function bits. The SysEx waveform byte encodes window bits in bits 6–7, which need to be extracted by extending `czSysexDecoder.ts`.

#### Modulation Bit Mapping

The `modulation` field uses a 3-bit encoding:
- `"none"` → `0` (no modulation)
- `"ring"` → `0b100` (standard ring modulation, bits 010)
- `"noise"` → `0b011` (noise modulation, bits 011)

The hidden variants (Ring 2 = 010, Ring 3 = 110, Noise 2 = 111) are not currently exposed by the `DecodedPatch` type but would map naturally when the decoder is extended.

---

## Testing Strategy

### Unit Tests (Vitest)

Test the pure math functions that don't depend on Web Audio:

1. **`pdOscillator.ts`**: Verify each waveform transfer function produces correct shapes
   - Input: phase values 0.0, 0.25, 0.5, 0.75, 1.0
   - Verify output matches expected waveform shapes
   - Test `lerp` between sine and distorted phase at various depths

2. **`windowFunction.ts`**: Verify each window curve
   - Test boundary values (0.0, 0.5, 1.0)
   - Verify continuity

3. **`envelopeGenerator.ts`**: Verify rate-to-time mapping
   - Test rate 0 → ~10000ms
   - Test rate 99 → ~1ms
   - Verify step advance logic with sustain points

4. **`patchAdapter.ts`**: Verify `DecodedPatch` → `PatchParams` conversion
   - Use existing test fixtures from `czSysexDecoder.test.ts`

### Browser Tests

For Web Audio-dependent code:
- AudioWorklet loads and initializes
- Note-on/note-off produces audio output
- Waveform shapes match expected output (capture and analyze)

---

## Implementation Order

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | `pdOscillator.ts`, `windowFunction.ts` | Pure math — phase distortion & window functions |
| 2 | `envelopeGenerator.ts` | 8-step envelope with exponential rate mapping |
| 3 | `cz101Processor.ts`, `cz101WorkletUrl.ts` | AudioWorklet voice rendering |
| 4 | `czVoice.ts`, `czSynthEngine.ts` | Main-thread engine, note management |
| 5 | `patchAdapter.ts` | DecodedPatch → PatchParams |
| 6 | Extend `czSysexDecoder.ts` | Add window function & modulation bits to `WaveformConfig` |
| 7 | `useCzSynth.ts` | React hook for AudioContext + engine lifecycle |
| 8 | `SynthKeyboard.tsx`, `SynthOscilloscope.tsx` | UI components |
| 9 | `SynthPage.tsx` | Assemble synth page |
| 10 | `SynthPage.tsx` (route), `router.tsx`, `AppSidebar.tsx` | Wire navigation |
| 11 | `vite.config.ts` | AudioWorklet build config |
| 12 | Unit tests | Test pure math modules |

### Phase 1 Scope (Monophonic)

The initial implementation will be **monophonic** (single note at a time) to validate the synthesis engine. Polyphonic support (8 voices) will be added once monophonic is working correctly.

### Scope — What's Included

- All 8 waveforms + combination waves
- All 8 window functions
- 8-step envelopes (DCA, DCW, DCO) with correct timing
- Ring modulation and noise modulation
- Line select modes (L1, L2, L1+1', L1+2')
- Detune (fine, octave, note)
- Vibrato LFO (4 waveforms, delay, rate, depth)
- Key follow (DCA and DCW)
- Patch loading from existing preset database
- Virtual keyboard (mouse/touch + QWERTY)
- Oscilloscope visualization
- Octave shift (from patch's octave parameter: -1, 0, +1)

### Scope — Future Enhancements

- Polyphonic mode (8 voices) with voice stealing
- MIDI input via WebMIDI (play from external keyboard)
- Real-time parameter editing with UI controls
- Patch save/export
- Audio recording
- Effects (reverb, chorus, delay)
- Comparison mode (A/B with hardware)