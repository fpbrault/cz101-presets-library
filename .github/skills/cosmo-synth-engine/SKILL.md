---
name: cosmo-synth-engine
description: "Work in the cosmo-synth-engine Rust/WASM audio DSP package. Use when: modifying the phase distortion DSP core; adding oscillators, envelopes, or FX; updating audio parameters; working with wasm-bindgen WASM bindings; building for WebAssembly or native targets; debugging audio artifacts; understanding the processor/voice/envelope architecture."
---

# cosmo-synth-engine Package

Rust DSP core for the Cosmo PD-101 phase distortion synthesizer. Compiles to both native (Tauri, VST3/AU) and WebAssembly (AudioWorklet). Located at `packages/cosmo-synth-engine/`.

## Package Overview

| Module | File | Purpose |
|--------|------|---------|
| Library root | `src/lib.rs` | Module declarations, WASM feature gate |
| Processor | `src/processor.rs` | Top-level audio processor (drives voices) |
| Voice | `src/voice.rs` | Per-voice state machine |
| Oscillator | `src/oscillator.rs` | Phase distortion oscillator |
| Envelope | `src/envelope.rs` | Step-based envelope engine |
| Envelope map | `src/envelope_map.rs` | Envelope parameter mapping |
| Default envelopes | `src/default_envelopes.rs` | Factory envelope shapes |
| Parameters | `src/params.rs` | Synth parameter definitions |
| Preset wire | `src/preset_wire.rs` | Serializable preset format |
| DSP utils | `src/dsp_utils.rs` | Shared DSP helpers |
| FX | `src/fx.rs` | Effects (chorus, reverb, delay, filter) |
| Generators | `src/generators/` | Waveform generator implementations |
| WASM bindings | `src/wasm.rs` | `wasm-bindgen` exports (feature = "wasm") |

## Architecture

```
processor.rs  →  voice.rs  →  oscillator.rs
                            →  envelope.rs
            →  fx.rs
```

- `Processor` owns N voices and the FX chain
- Each `Voice` owns an `Oscillator` and envelopes
- Parameters flow in via `params.rs` types; preset data via `preset_wire.rs`
- `wasm.rs` wraps the processor for AudioWorklet use

## Development Workflow

### Adding a New Parameter
1. Add variant to the parameter enum/struct in `src/params.rs`
2. Apply it in the relevant DSP module (`voice.rs`, `fx.rs`, etc.)
3. Update `src/preset_wire.rs` if it should be persisted in presets
4. Update WASM bindings in `src/wasm.rs` if exposed to JS
5. Update TypeScript bindings in `packages/cosmo-pd101/webview/src/lib/synth/bindings/synth.ts`

### Adding a New FX
1. Implement DSP in `src/fx.rs`
2. Add parameters to `src/params.rs`
3. Wire into `src/processor.rs`
4. Expose via `src/wasm.rs`
5. Add UI panel in `packages/cosmo-pd101/webview/src/components/panels/fx/`

### Building for WASM
```bash
# From workspace root
bun run build        # Builds WASM + TypeScript
```

The WASM target is controlled via Cargo feature `wasm`. Build uses `wasm-pack` or `cargo build --target wasm32-unknown-unknown`.

### Building for Native (Tauri / VST)
```bash
bun run tauri dev    # Tauri development build
bun run tauri build  # Tauri production build
```

## Testing

Tests live in `packages/cosmo-synth-engine/tests/` (currently sparse). Write Rust unit tests with `#[cfg(test)]` modules inside source files:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_envelope_shape() { ... }
}
```

Run with:
```bash
cd packages/cosmo-synth-engine && cargo test
```

## Key Conventions
- `no_std` compatible (feature-gated with `cfg_attr`)
- WASM bindings gated on `#[cfg(target_arch = "wasm32")]` or `feature = "wasm"`
- Use `f32` for audio samples (not `f64`)
- Parameter types in `params.rs` must be `Copy + Clone`
- Preset wire types must be serializable (`serde`)

## WASM → TypeScript Boundary
- `src/wasm.rs` exports via `wasm-bindgen`
- Corresponding TS types in `packages/cosmo-pd101/webview/src/lib/synth/bindings/synth.ts`
- Worklet URL exposed via `src/lib/synth/pdVisualizerWorkletUrl.ts`

## Commands
```bash
cargo test                    # Run Rust unit tests
cargo build                   # Native build
cargo build --release         # Optimized native build
# WASM build is driven by the monorepo build task
bun run build                 # Full monorepo build including WASM
```
