# Casio CZ Envelope Data Summary

This document summarizes the envelope machine value data from the Casio CZ MIDI specification, sourced from [kasploosh.com — CZ Envelopes: Machine Values](https://www.kasploosh.com/cz/13466-envelopes/2-machine_values/). 

## Overview

Casio CZ synths expose three main programmable sections:

- **Pitch (DCO)**
- **Wave (DCW)**
- **Amplitude (DCA)**

Each section uses an **8-step envelope**, and every step has:

- a **rate**
- a **level**

The chapter focuses on how those envelope values are stored and converted between the values shown to users and the values stored in SysEx data.

## Human vs. Machine Values

- **Human value (`α`)**: the decimal value shown on the synth LCD.
- **Machine value (`β`)**: the internal 7-bit value used in SysEx and by the synth engine.

Because machine values are 7-bit, the maximum possible machine value is **0x7F (127)**.

One key point from the chapter is that **not every envelope type meaningfully extends past a human value of 99**. Most mappings stop there, but there are exceptions:

- **Pitch envelope level** can extend above 99.
- **Amp envelope rate** can also extend above 99.

## Equation Note

The source document gives these notes for all formulas:

- `α` = human value
- `β` = machine value
- equations are written in **base 10**
- use **integer math only**
- division is truncated
- reverse conversions sometimes need `+ 1` because the original CZ code uses integer arithmetic rather than exact fractional inverses

## Envelope Conversion Formulas

### 1. Pitch Envelope Rate

**Human to SysEx**

```text
β = (α * 127) / 99
```

**SysEx to Human**

```text
if β = 0, then α = 0
if β = 127, then α = 99
otherwise, α = ((β * 99) / 127) + 1
```

### 2. Pitch Envelope Level

**Human to SysEx**

```text
if α > 63, then β = α + 4
otherwise, β = α
```

**SysEx to Human**

```text
if β > 63, then α = β - 4
otherwise, α = β
```

This is one of the two envelope mappings that can exceed a human value of 99.

### 3. Wave Envelope Rate

**Human to SysEx**

```text
β = ((α * 119) / 99) + 8
```

**SysEx to Human**

```text
if β = 8, then α = 0
if β = 127, then α = 99
otherwise, α = (((β - 8) * 99) / 119) + 1
```

### 4. Wave Envelope Level

**Human to SysEx**

```text
β = (α * 127) / 99
```

**SysEx to Human**

```text
if β = 0, then α = 0
if β = 127, then α = 99
otherwise, α = ((β * 99) / 127) + 1
```

### 5. Amp Envelope Rate

**Human to SysEx**

```text
β = (α * 119) / 99
```

**SysEx to Human**

```text
if β = 0, then α = 0
if β = 119, then α = 99
otherwise, α = ((β * 99) / 119) + 1
```

This is the other envelope mapping that can extend above a human value of 99.

### 6. Amp Envelope Level

**Human to SysEx**

```text
if α = 0, then β = 0
otherwise, β = α + 28
```

**SysEx to Human**

```text
if β = 0, then α = 0
otherwise, α = β - 28
```

## Key Takeaways

- All CZ envelope data is fundamentally about converting between a user-facing decimal value and a 7-bit machine value.
- The original Casio documentation is described by the chapter as incomplete and error-prone; this chapter aims to clarify the mappings.
- Integer arithmetic is essential to getting the same results as the hardware.
- Most envelope mappings top out at **99**, but **pitch level** and **amp rate** are the important exceptions.

## Citation and Thanks

Thanks to the Kasploosh Casio CZ documentation, especially the **Machine Values** page, for the detailed reverse-engineering context and clarified conversion logic:

- <https://www.kasploosh.com/cz/13466-envelopes/2-machine_values/>
