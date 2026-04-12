# CZ-101 Synth - New Features Implementation Plan

## Priority Order

| # | Feature | Status |
|---|---------|--------|
| 1 | Read CZ-101 SysEx Presets | Pending |
| 2 | Line Select | Pending |
| 3 | Vibrato | Pending |
| 4 | Ring Modulation & Noise | Pending |
| 5 | Portamento | Pending |
| 6 | LFO | Pending |
| 7 | Key Follow | Pending |
| 8 | Traditional Filter | Pending |

---

## 1. Read CZ-101 SysEx Presets

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/synth/presetStorage.ts` | Add `SynthPresetData` fields for new features |
| `src/components/PhaseDistortionVisualizer.tsx` | Add file input + import handler |
| `src/components/pdAlgorithms.ts` | Add `DEFAULT_*_ENV` exports if needed |

### Implementation Details

**`src/lib/synth/presetStorage.ts`**
- Import `DecodedPatch` from `../midi/czSysexDecoder`
- Add new fields to `SynthPresetData` interface (see Data Model section below)

**`src/components/PhaseDistortionVisualizer.tsx`**
- Import: `import { decodeCzPatch } from "@/lib/midi/czSysexDecoder"`
- Import: `import { convertDecodedPatchToSynthPreset } from "@/lib/synth/czPresetConverter"`
- Add file input in preset panel (after Reset button):
```tsx
<label className="btn btn-xs btn-outline">
  Import SysEx
  <input
    type="file"
    accept=".syx"
    className="hidden"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const decoded = decodeCzPatch(data);
      if (decoded) {
        const preset = convertDecodedPatchToSynthPreset(decoded);
        applyPreset(preset);
      }
    }}
  />
</label>
```
- Ensure `applyPreset()` handles partial preset (fills defaults for missing fields)

---

## 2. Line Select

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add `lineSelect` to params, modify render logic |
| `src/components/PhaseDistortionVisualizer.tsx` | Add line select state + UI |
| `src/lib/synth/presetStorage.ts` | Add `lineSelect` field |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- In params: add `lineSelect: "L1+L2"` (default shows both)
- In `renderVoice()`: check lineSelect to determine if line1/line2 outputs contribute
- Logic:
  - `"L1"`: only line1 plays
  - `"L2"`: only line2 plays  
  - `"L1+L2"`: both lines (current behavior)
  - `"L1+L1'"`: line1 with waveform2 (use waveform2 from line1)
  - `"L1+L2'"`: line1 with line2's waveform

**`src/components/PhaseDistortionVisualizer.tsx`**
- Add state: `const [lineSelect, setLineSelect] = useState("L1+L2")`
- Add UI: segmented control in main synth area above oscillator blocks
- Pass to worklet in `params` object

---

## 3. Vibrato

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add vibrato params + per-voice LFO |
| `src/components/PhaseDistortionVisualizer.tsx` | Add vibrato state + UI |
| `src/lib/synth/presetStorage.ts` | Add vibrato fields |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- Add to params: `vibrato: { enabled: false, waveform: 1, rate: 30, depth: 30, delay: 0 }`
- In voice struct: add `vibratoPhase: 0, vibratoDelayCounter: 0`
- Create LFO function:
```js
function lfoOutput(phase, waveform) {
  switch(waveform) {
    case 1: return Math.sin(TWO_PI * phase);        // sine
    case 2: return 1 - 4 * Math.abs(phase - 0.5); // triangle
    case 3: return phase < 0.5 ? 1 : -1;           // square
    case 4: return phase * 2 - 1;                 // saw
    default: return Math.sin(TWO_PI * phase);
  }
}
```
- On noteOn: reset `vibratoPhase = 0`, `vibratoDelayCounter = delay * sr / 100`
- In render: if delay counter > 0, decrement; else add LFO to pitch:
  ```js
  const lfo = lfoOutput(voice.vibratoPhase, p.vibrato.waveform);
  const pitchMod = 1 + lfo * p.vibrato.depth / 100;
  freq1 *= pitchMod;
  freq2 *= pitchMod;
  ```

**`src/components/PhaseDistortionVisualizer.tsx`**
- Add states:
```ts
const [vibratoEnabled, setVibratoEnabled] = useState(false);
const [vibratoWave, setVibratoWave] = useState(1);
const [vibratoRate, setVibratoRate] = useState(30);
const [vibratoDepth, setVibratoDepth] = useState(30);
const [vibratoDelay, setVibratoDelay] = useState(0);
```
- Add UI section: "Vibrato" with toggle, 4 waveform icons, rate/depth/delay knobs
- Pass to worklet in params

---

## 4. Ring Modulation & Noise

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add ringMod/noise to line params, implement in render |
| `src/components/PerLineWarpBlock.tsx` | Add Ring/Noise toggle buttons |
| `src/lib/synth/presetStorage.ts` | Add ringModEnabled, noiseEnabled fields |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- Add to line params: `ringMod: false, noise: false`
- In render, after computing s1 and s2:
```js
// Ring modulation: multiply outputs
if (l1.ringMod && l2.ringMod) {
  s1 = s1 * s2;  // or normalized version
  s2 = 0;        // collapse to single output
}

// Noise
if (l1.noise) s1 += (Math.random() * 2 - 1) * 0.1;
if (l2.noise) s2 += (Math.random() * 2 - 1) * 0.1;
```

**`src/components/PerLineWarpBlock.tsx`**
- Add props: `ringMod: boolean, setRingMod: (v: boolean) => void`
- Add props: `noise: boolean, setNoise: (v: boolean) => void`
- Add toggle buttons near waveform display

---

## 5. Portamento

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add portamento params + glide logic |
| `src/components/PhaseDistortionVisualizer.tsx` | Add portamento state + UI |
| `src/lib/synth/presetStorage.ts` | Add portamento fields |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- Add to params: `portamento: { enabled: false, mode: "rate", rate: 50, time: 0.5 }`
- In voice struct: add `targetFreq: 0, currentFreq: 0, glideProgress: 0`
- On noteOn: 
  - If enabled, set `targetFreq` to new frequency
  - If different from current, start glide
- In render: apply glide:
  - Rate mode: `currentFreq += (targetFreq - currentFreq) * rate / 1000`
  - Time mode: compute steps, interpolate

**`src/components/PhaseDistortionVisualizer.tsx`**
- Add states: `portamentoEnabled`, `portamentoMode`, `portamentoTime`, `portamentoRate`
- Add UI: toggle + mode selector + slider

---

## 6. LFO (Assignable)

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add LFO params + modulation logic |
| `src/components/PhaseDistortionVisualizer.tsx` | Add LFO state + UI |
| `src/lib/synth/presetStorage.ts` | Add LFO fields |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- Add to params: `lfo: { enabled: false, waveform: "sine", rate: 5, depth: 0.5, target: "pitch" }`
- Create shared LFO state in processor (not per-voice)
- In render: compute LFO output, apply to target:
```js
if (p.lfo.enabled) {
  const lfoPhase = (lfoPhaseRef + p.lfo.rate / sampleRate) % 1;
  const lfoVal = lfoOutput(lfoPhase, p.lfo.waveform);
  const mod = lfoVal * p.lfo.depth;
  switch(p.lfo.target) {
    case "pitch": freq1 *= (1 + mod); freq2 *= (1 + mod); break;
    case "dcw": dcw1 += mod; dcw2 += mod; break;
    case "dca": finalDca1 *= (1 + mod); finalDca2 *= (1 + mod); break;
    case "filter": filterCutoff *= (1 + mod); break;
  }
}
```

**`src/components/PhaseDistortionVisualizer.tsx`**
- Add states: `lfoEnabled`, `lfoWaveform`, `lfoRate`, `lfoDepth`, `lfoTarget`
- Add UI section with controls

---

## 7. Key Follow

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add keyFollow to envelope params, modify advanceEnv |
| `src/components/PerLineWarpBlock.tsx` | Add key follow slider to each envelope |
| `src/lib/synth/presetStorage.ts` | Add key follow fields |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- Add to envelope param objects: `keyFollow: 0`
- In `advanceEnv()`: apply speed multiplier:
```js
const noteOffset = (voice.note - 60) / 60;  // 0 at middle C
const speedMult = 1 + (envData.keyFollow ?? 0) * noteOffset;
const adjustedDuration = duration / speedMult;
```

**`src/components/PerLineWarpBlock.tsx`**
- Add props: `dcoKeyFollow`, `setDcoKeyFollow`, `dcwKeyFollow`, `setDcwKeyFollow`, `dcaKeyFollow`, `setDcaKeyFollow`
- Add slider (0-9) below each StepEnvelopeEditor

---

## 8. Traditional Filter (LP/HP/BP)

### Files to Modify

| File | Changes |
|------|---------|
| `public/pdVisualizerProcessor.js` | Add biquad filter params + implementation |
| `src/components/PhaseDistortionVisualizer.tsx` | Add filter state + UI |
| `src/lib/synth/presetStorage.ts` | Add filter fields |

### Implementation Details

**`public/pdVisualizerProcessor.js`**
- Add to params: `filter: { enabled: false, type: "lp", cutoff: 5000, resonance: 0, envAmount: 0 }`
- Add filter state: `filterX: [0,0], filterY: [0,0]` (per-voice)
- Function to compute biquad coefficients:
```js
function computeBiquadCoeffs(type, freq, res, sr) {
  // Standard biquad formulas for LP/HP/BP
  // Returns { a0, a1, a2, b1, b2 }
}
```
- In render, after generating s1/s2 but before FX:
```js
if (p.filter.enabled) {
  const effectiveCutoff = p.filter.cutoff * (1 + p.filter.envAmount * dcw1);
  const coeffs = computeBiquadCoeffs(p.filter.type, effectiveCutoff, p.filter.resonance, sr);
  s1 = biquad(s1, coeffs, voice.filterState1);
  s2 = biquad(s2, coeffs, voice.filterState2);
}
```

**`src/components/PhaseDistortionVisualizer.tsx`**
- Add states: `filterEnabled`, `filterType`, `filterCutoff`, `filterResonance`, `filterEnvAmount`
- Add UI section with toggle, type buttons (LP/HP/BP), cutoff/resonance/env knobs

---

## Data Model (SynthPresetData)

Add these fields to `src/lib/synth/presetStorage.ts`:

```ts
// === NEW FIELDS ===

// Line select
lineSelect: "L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'";

// Vibrato
vibratoEnabled: boolean;
vibratoWave: 1 | 2 | 3 | 4;
vibratoRate: number;        // 0-99
vibratoDepth: number;        // 0-1
vibratoDelay: number;        // 0-99

// Portamento
portamentoEnabled: boolean;
portamentoMode: "rate" | "time";
portamentoRate: number;      // 0-99
portamentoTime: number;      // 0-2 seconds

// LFO
lfoEnabled: boolean;
lfoWaveform: "sine" | "triangle" | "square" | "saw" | "random";
lfoRate: number;             // 0-20 Hz
lfoDepth: number;            // 0-1
lfoTarget: "pitch" | "dcw" | "dca" | "filter";

// Ring Mod & Noise
ringModEnabled: boolean;
noiseEnabled: boolean;

// Filter
filterEnabled: boolean;
filterType: "lp" | "hp" | "bp";
filterCutoff: number;        // 20-20000 Hz
filterResonance: number;     // 0-1
filterEnvAmount: number;     // -1 to 1

// Key Follow (0-9)
dca1KeyFollow: number;
dcw1KeyFollow: number;
dca2KeyFollow: number;
dcw2KeyFollow: number;
```

---

## Testing Checklist

After each feature:
1. [ ] Lint passes: `bun run lint`
2. [ ] Build passes: `bun run build`
3. [ ] UI renders without errors
4. [ ] Audio works (play some notes)
5. [ ] State persists in presets

---

## Implementation Notes

1. **All DSP in worklet** — React only sends param values; worklet computes all audio
2. **Preserve existing features** — Don't break what works (step envelopes, dual-algo, DCW compensation)
3. **Use existing decoder** — `decodeCzPatch()` already extracts vibrato, key follow, ring/noise
4. **Incremental** — Build feature-by-feature, test after each
5. **Sync presetStorage.ts** — Add all new fields to `SynthPresetData` interface so presets save/load correctly