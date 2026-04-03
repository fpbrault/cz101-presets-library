# Casio CZ-101 SysEx Patch Format

Reference for decoding the 256-byte (nibble-encoded) SysEx dump transmitted by the CZ-101/1000.  
Original spec: <https://www.youngmonkey.ca/nose/audio_tech/synth/Casio-CZ.html>

---

## 1. SysEx Packet Structure

Each preset occupies exactly **264 raw bytes** in a `.SYX` file:

```
[0]     F0          — SysEx start
[1]     44          — Casio manufacturer ID
[2]     00
[3]     00
[4]     70 + ch     — channel (0-based); 0x70 = channel 0
[5]     20          — command: Receive Request 1 (load into synth)
[6]     program     — destination slot (see Program Change table below)
[7..262] data       — 256 nibble-bytes encoding 128 logical bytes
[263]   F7          — SysEx end
```

**Program slot values:**

| Range      | Description            |
|------------|------------------------|
| `0x00–0x0F`| Preset tones 1–16      |
| `0x20–0x2F`| Internal sounds 1–16   |
| `0x40–0x4F`| Cartridge sounds 1–16  |
| `0x60`     | Temporary/edit buffer  |

---

## 2. Nibble Encoding

Each logical byte is transmitted as **two** SysEx bytes: **low nibble first, then high nibble**.

```
Logical byte 0x5F  →  SysEx bytes: 0x0F  0x05
```

**Decode formula** (SysEx byte pair at positions `[n]`, `[n+1]`):

```ts
const logicalByte = (data[n + 1] << 4) | data[n]
```

**Encode formula:**

```ts
const lo = logicalByte & 0x0F
const hi = (logicalByte >> 4) & 0x0F
// transmit: [lo, hi]
```

Since all 128 logical bytes are stored this way, the 256 nibble-bytes occupy SysEx offsets **7–262** (inclusive). The logical byte index `i` maps to SysEx offsets:

```
sysex_offset_low  = 7 + i * 2
sysex_offset_high = 7 + i * 2 + 1
```

---

## 3. Section Map

There are **25 distinct sections** within the 128 logical bytes.

| Sec | Symbol(s) | Logical bytes | Logical offset | SysEx offset (raw) |
|-----|-----------|:-------------:|:--------------:|:------------------:|
| 1   | `pflag`            | 1  |   0  |   7–8   |
| 2   | `pds`              | 1  |   1  |   9–10  |
| 3   | `pdl`, `pdh`       | 2  |   2  |  11–14  |
| 4   | `pvk`              | 1  |   4  |  15–16  |
| 5   | `pvdld`, `pvdlv`   | 3  |   5  |  17–22  |
| 6   | `pvsd`, `pvsv`     | 3  |   8  |  23–28  |
| 7   | `pvdd`, `pvdv`     | 3  |  11  |  29–34  |
| 8   | `mfw`              | 2  |  14  |  35–38  |
| 9   | `mamd`, `mamv`     | 2  |  16  |  39–42  |
| 10  | `mwmd`, `mwmv`     | 2  |  18  |  43–46  |
| 11  | `pmal`             | 1  |  20  |  47–48  |
| 12  | `pma[0..7]`        | 16 |  21  |  49–80  |
| 13  | `pmwl`             | 1  |  37  |  81–82  |
| 14  | `pmw[0..7]`        | 16 |  38  |  83–114 |
| 15  | `pmpl`             | 1  |  54  | 115–116 |
| 16  | `pmp[0..7]`        | 16 |  55  | 117–148 |
| 17  | `sfw`              | 2  |  71  | 149–152 |
| 18  | `samd`, `samv`     | 2  |  73  | 153–156 |
| 19  | `swmd`, `swmv`     | 2  |  75  | 157–160 |
| 20  | `psal`             | 1  |  77  | 161–162 |
| 21  | `psa[0..7]`        | 16 |  78  | 163–194 |
| 22  | `pswl`             | 1  |  94  | 195–196 |
| 23  | `psw[0..7]`        | 16 |  95  | 197–228 |
| 24  | `pspl`             | 1  | 111  | 229–230 |
| 25  | `psp[0..7]`        | 16 | 112  | 231–262 |

Total logical bytes: 128 → 256 SysEx nibble-bytes ✓

---

## 4. Section Decode Reference

### Section 1 — PFLAG (Line Select & Octave)

**Bit layout** of the 1-byte value:

```
  7  6  5  4  3  2   1   0
  0  0  0  0  0  0  OCTV LS
                    [1:0][1:0]
```

**OCTV** (bits 3–2):

| OCTV | Octave |
|------|--------|
| `00` | 0      |
| `01` | +1     |
| `10` | −1     |

**LS** – Line Select (bits 1–0):

| LS   | Line        |
|------|-------------|
| `00` | Line 1      |
| `01` | Line 2      |
| `10` | Line 1+1′   |
| `11` | Line 1+2′   |

```ts
const pflag  = logicalByte(data, 0)
const octave = (pflag >> 2) & 0x03   // 0=0, 1=+1, 2=−1
const lineSelect = pflag & 0x03       // 0=L1, 1=L2, 2=L1+1', 3=L1+2'
```

---

### Section 2 — PDS (Detune Direction)

| Value | Direction |
|-------|-----------|
| `0x00`| Up (+)    |
| `0x01`| Down (−)  |

```ts
const pds = logicalByte(data, 1)
const detuneDown = pds === 0x01
```

---

### Section 3 — PDL / PDH (Detune Amount)

Two bytes: fine (`pdl`) and coarse (`pdh`).

**PDL – Fine detune** (first byte):

| Byte range | Fine value |
|------------|------------|
| `0x00–0x0F` | 0–15      |
| `0x11–0x1F` | 16–30     |
| `0x21–0x2F` | 31–45     |
| `0x31–0x3F` | 46–60     |

Pattern: `fine = (byte & 0x0F) + ((byte >> 4) * 16)`  
(i.e. bits [3:0] give 0–15; adding the upper nibble×16 gives the range offset)

**PDH – Coarse detune** (second byte):

| Byte range | Oct | Note |
|------------|-----|------|
| `0x00–0x0B` | 0   | 0–11 |
| `0x0C–0x17` | 1   | 0–11 |
| `0x18–0x23` | 2   | 0–11 |
| `0x24–0x2F` | 3   | 0–11 |

```ts
const pdl      = logicalByte(data, 2)
const pdh      = logicalByte(data, 3)
const detuneFine   = (pdl & 0x0F) + ((pdl >> 4) * 16)
const detuneOct    = Math.floor(pdh / 12)
const detuneNote   = pdh % 12
```

---

### Section 4 — PVK (Vibrato Wave)

| Byte   | Wave |
|--------|------|
| `0x08` | 1    |
| `0x04` | 2    |
| `0x20` | 3    |
| `0x02` | 4    |

```ts
const pvk = logicalByte(data, 4)
const vibratoWaveMap: Record<number, number> = { 0x08: 1, 0x04: 2, 0x20: 3, 0x02: 4 }
const vibratoWave = vibratoWaveMap[pvk] ?? 1
```

---

### Sections 5/6/7 — Vibrato Delay / Rate / Depth

Each is a 3-byte group encoding a single integer value (0–99).

Below 32: the value `n` is stored as `[n, 0x00, n]` (delay) / `[n, 0x00, n*2]` (depth) / `[n, 0x00, n*0x20]` (rate).  
For 32–99 use the lookup tables in the original spec; in practice the first byte alone approximates the value: `value ≈ firstByte`.

A precise reverse lookup is best implemented as a precomputed 100-entry table (see [src/lib/czSysexDecoder.ts](../src/lib/czSysexDecoder.ts)).

---

### Section 8 — MFW (DCO1 Waveform + Modulation)

Two logical bytes forming a **16-bit field**:

```
  Byte 1 (high)                Byte 2 (low)
  [7:5]   [4:2]   [1]  [0]    [7:6] [5:3]  [2:0]
  F_WF    S_WF    SL   WT      --   MOD    WT_EXT
```

- **F_WF** (bits 15–13): first waveform index bits  
- **S_WF** (bits 12–10): second waveform index bits  
- **SL** (bit 9): `1` if a second-line waveform is active  
- **MOD** (bits 5–3 of byte2): modulation type  
- **WT_EXT** (bits 2–0 of byte2): waveform extension (distinguishes wf 6/7/8)

**Waveform encoding** (3-bit prefix in F_WF / S_WF):

| Bits | Waveform |
|------|----------|
| `000`| 1 – Sawtooth               |
| `001`| 2 – Square                 |
| `010`| 3 – Pulse                  |
| `100`| 4 – Double Sine            |
| `101`| 5 – Saw-Pulse              |
| `110`| 6–8 (see WT_EXT below)     |

**WT_EXT** (byte2 bits [2:0]) for base-`110` waveforms:

| WT_EXT | Waveform |
|--------|----------|
| `001`  | 6 – Resonance 1 |
| `010`  | 7 – Resonance 2 |
| `011`  | 8 – Resonance 3 |

**Modulation** (byte2 bits [5:3]):

| Bits  | Type             |
|-------|------------------|
| `000` | None             |
| `100` | Ring modulation  |
| `011` | Noise modulation |

```ts
// example from spec: first=4, second=2, ring → 0x86 0x20
const b1 = logicalByte(data, 14)  // MFW byte 1
const b2 = logicalByte(data, 15)  // MFW byte 2
const wfBits = [0b000, 0b001, 0b010, 0b100, 0b101, 0b110, 0b110, 0b110]
const wfFromBits = (bits: number, ext: number) => {
  if (bits === 0b110) return 5 + ext  // wf 6, 7, or 8
  return [1,2,3,0,4,5][bits]           // wf 1..5 (index 3 unused)
}
const fwfBits  = (b1 >> 5) & 0x07
const swfBits  = (b1 >> 2) & 0x07
const slActive = (b1 >> 1) & 0x01
const mod      = (b2 >> 3) & 0x07
const wtExt    = b2 & 0x07
const firstWf  = wfFromBits(fwfBits, wtExt)
const secondWf = slActive ? wfFromBits(swfBits, wtExt) : null
const modType  = mod === 0b100 ? 'ring' : mod === 0b011 ? 'noise' : 'none'
```

---

### Sections 9/10 & 18/19 — Key Follow (DCA1/DCW1/DCA2/DCW2)

Two bytes per section: `[xMD, xMV]`.

| Key follow | xMD  | xMV  |
|------------|------|------|
| 0          | 0x00 | 0x00 |
| 1          | 0x01 | 0x08 |
| 2          | 0x02 | 0x11 |
| 3          | 0x03 | 0x1A |
| 4          | 0x04 | 0x24 |
| 5          | 0x05 | 0x2F |
| 6          | 0x06 | 0x3A |
| 7          | 0x07 | 0x45 |
| 8          | 0x08 | 0x52 |
| 9          | 0x09 | 0x5F |

DCW key follow values (MW variant):

| Key follow | xMD  | xMV  |
|------------|------|------|
| 0          | 0x00 | 0x00 |
| 1          | 0x01 | 0x1F |
| 2          | 0x02 | 0x2C |
| 3          | 0x03 | 0x39 |
| 4          | 0x04 | 0x46 |
| 5          | 0x05 | 0x53 |
| 6          | 0x06 | 0x60 |
| 7          | 0x07 | 0x6E |
| 8          | 0x08 | 0x92 |
| 9          | 0x09 | 0xFF |

The first byte (`xMD`) directly equals the key-follow value (0–9).

```ts
const keyFollow = logicalByte(data, offset)  // xMD byte = key follow 0..9
```

---

### Sections 11/13/15 & 20/22/24 — End Step Numbers

Each is a 1-byte value encoding the envelope end step (1–8 → stored as `0x00–0x07`).

```ts
const endStep = logicalByte(data, offset) + 1  // 1-based
```

---

### Sections 12 & 21 — DCA Envelope (PMA / PSA)

16 bytes = 8 pairs of `[rate_byte, level_byte]`.

**Rate decode (DCA):**
```
byte = 0x00  → rate = 0
byte = 0x7F  → rate = 99
otherwise:   rate = floor((99 × byte) / 119) + 1
```

**Rate bit 7** (`byte & 0x80`): if set, the _level will decrease_ on this step (the stored byte is `byte & 0x7F` for the actual rate; add 0x80 when encoding to indicate direction).

**Level decode (DCA):**
```
byte = 0x00  → level = 0
byte = 0x7F  → level = 99
otherwise:   level = floor((99 × byte) / 127) + 1
```

```ts
const decodeRate_DCA = (b: number): { rate: number; falling: boolean } => ({
  rate: b === 0 ? 0 : b === 0x7F ? 99 : Math.floor((99 * (b & 0x7F)) / 119) + 1,
  falling: (b & 0x80) !== 0,
})
const decodeLevel_DCA = (b: number): number =>
  b === 0 ? 0 : b === 0x7F ? 99 : Math.floor((99 * b) / 127) + 1
```

---

### Sections 14 & 23 — DCW Envelope (PMW / PSW)

Same 16-byte layout but **rate** is encoded differently:
```
byte = 0x08  → rate = 0
byte = 0x77  → rate = 99
otherwise:   rate = floor((99 × (byte − 8)) / 119) + 1
```

**Level bit 7** (`level_byte & 0x80`): if set, this step is a **sustain point**.

```ts
const decodeRate_DCW = (b: number): { rate: number; falling: boolean } => ({
  rate: b === 8 ? 0 : b === 0x77 ? 99 : Math.floor((99 * ((b & 0x7F) - 8)) / 119) + 1,
  falling: (b & 0x80) !== 0,
})
const decodeSustain_DCW = (b: number): boolean => (b & 0x80) !== 0
```

---

### Sections 16 & 25 — DCO Envelope (PMP / PSP)

Same 16-byte layout. Both rate and level use the same scheme:

**Rate decode (DCO):**
```
byte = 0x00  → rate = 0
byte = 0x7F  → rate = 99
otherwise:   rate = floor((99 × byte) / 127) + 1
```

**Level decode (DCO):**  
Level data 0–63 → bytes `0x00–0x3F`; level 64–99 → bytes `0x44–0x67` (a gap at 0x40–0x43).

```ts
const decodeLevel_DCO = (b: number): number => {
  if (b <= 0x3F) return b               // 0..63 direct
  if (b >= 0x44) return 64 + (b - 0x44) // 64..99
  return 63                              // 0x40–0x43 (undefined, clamp)
}
```

---

### Section 17 — SFW (DCO2 Waveform)

Same 16-bit format as MFW (Section 8), but **modulation bits are ignored** (set to `000`).

---

## 5. Complete Logical Byte Offset Quick Reference

```
 0  pflag          (line select & octave)
 1  pds            (detune direction)
 2  pdl            (detune fine)
 3  pdh            (detune coarse: oct+note)
 4  pvk            (vibrato wave 1–4)
 5  pvdl_d         (vibrato delay: 3 bytes)
 6  pvdl_d_mid
 7  pvdl_v
 8  pvs_d          (vibrato rate: 3 bytes)
 9  pvs_d_mid
10  pvs_v
11  pvd_d          (vibrato depth: 3 bytes)
12  pvd_d_mid
13  pvd_v
14  mfw[0]         (DCO1 waveform byte 1)
15  mfw[1]         (DCO1 waveform byte 2 — modulation)
16  mamd           (DCA1 key follow, 0–9)
17  mamv           (DCA1 key follow velocity)
18  mwmd           (DCW1 key follow, 0–9)
19  mwmv           (DCW1 key follow velocity)
20  pmal           (DCA1 end step 0x00–0x07 → 1–8)
21–36  pma[0..15]  (DCA1 envelope: 8×[rate, level])
37  pmwl           (DCW1 end step)
38–53  pmw[0..15]  (DCW1 envelope: 8×[rate, level])
54  pmpl           (DCO1 end step)
55–70  pmp[0..15]  (DCO1 envelope: 8×[rate, level])
71  sfw[0]         (DCO2 waveform byte 1)
72  sfw[1]         (DCO2 waveform byte 2)
73  samd           (DCA2 key follow, 0–9)
74  samv
75  swmd           (DCW2 key follow, 0–9)
76  swmv
77  psal           (DCA2 end step)
78–93   psa[0..15] (DCA2 envelope: 8×[rate, level])
94  pswl           (DCW2 end step)
95–110  psw[0..15] (DCW2 envelope: 8×[rate, level])
111 pspl           (DCO2 end step)
112–127 psp[0..15] (DCO2 envelope: 8×[rate, level])
```

---

## 6. Implementation Notes

- **All decode logic lives in** [`src/lib/czSysexDecoder.ts`](../src/lib/czSysexDecoder.ts).
- The input to the decoder is the **raw `sysexData` `Uint8Array`** stored on `Preset` (includes F0 header and F7 tail).
- The decoder skips the 7-byte header and reads nibble pairs starting at offset 7.
- Envelope arrays are 0-indexed in the code (`step[0]..step[7]`); Casio documentation is 1-indexed.
- DCA1/2 = amplitude envelope, DCW1/2 = filter/waveshape envelope, DCO1/2 = pitch envelope.
- "Line 2" patches only use DCO2/DCA2/DCW2. "Line 1+1′" / "Line 1+2′" use both sets.
