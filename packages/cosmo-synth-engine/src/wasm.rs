//! wasm-bindgen glue for the Cosmo PD-101 DSP engine.
//!
//! Exposes `CzSynthProcessor` to JavaScript — used by `czSynthWorklet.js`
//! which runs inside an AudioWorklet scope.
//!
//! Compile with:
//!   wasm-pack build --target no-modules --out-dir $(pwd)/public \
//!     -- --features wasm

use wasm_bindgen::prelude::*;

use crate::params::SynthParams;
use crate::processor::{CosmoProcessor, RuntimeModSources};

/// WebAssembly wrapper around [`CosmoProcessor`].
///
/// All public methods map 1-to-1 to the messages the AudioWorklet receives
/// from the main thread so the JS worklet shim stays minimal.
#[wasm_bindgen]
pub struct CzSynthProcessor {
    inner: CosmoProcessor,
}

#[wasm_bindgen]
impl CzSynthProcessor {
    /// Create a new processor at the given sample rate.
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> CzSynthProcessor {
        CzSynthProcessor {
            inner: CosmoProcessor::new(sample_rate),
        }
    }

    /// Replace all synthesis parameters from a JSON string.
    ///
    /// The caller serializes `SynthParams` with `JSON.stringify` and passes
    /// the result here; we parse it with `serde_json` on the Rust side.
    #[wasm_bindgen(js_name = setParams)]
    pub fn set_params(&mut self, json: &str) {
        match serde_json::from_str::<SynthParams>(json) {
            Ok(p) => self.inner.set_params(p),
            Err(e) => {
                web_sys::console::error_1(
                    &format!("[cosmo-synth-engine] setParams parse error: {e}").into(),
                );
            }
        }
    }

    /// Trigger a note-on event.
    ///
    /// * `note`      — MIDI note number (0-127)
    /// * `frequency` — Hz; pass `0.0` to auto-compute from the MIDI note number
    /// * `velocity`  — normalised 0.0-1.0
    #[wasm_bindgen(js_name = noteOn)]
    pub fn note_on(&mut self, note: u8, frequency: f32, velocity: f32) {
        let freq = if frequency > 0.0 {
            frequency
        } else {
            midi_note_to_freq(note)
        };
        self.inner.note_on(note, freq, velocity);
    }

    /// Trigger a note-off event.
    #[wasm_bindgen(js_name = noteOff)]
    pub fn note_off(&mut self, note: u8) {
        self.inner.note_off(note);
    }

    /// Set the sustain (damper) pedal state.
    #[wasm_bindgen(js_name = setSustain)]
    pub fn set_sustain(&mut self, on: bool) {
        self.inner.set_sustain(on);
    }

    /// Set pitch bend. `value` is normalised [-1.0, 1.0] (MIDI 14-bit mapped to this range).
    /// Actual pitch shift in semitones = value * params.pitchBendRange.
    #[wasm_bindgen(js_name = setPitchBend)]
    pub fn set_pitch_bend(&mut self, value: f32) {
        self.inner.set_pitch_bend(value);
    }

    /// Set mod wheel value. `value` is normalised [0.0, 1.0] (CC1 / 127).
    #[wasm_bindgen(js_name = setModWheel)]
    pub fn set_mod_wheel(&mut self, value: f32) {
        self.inner.set_mod_wheel(value);
    }

    /// Set aftertouch/channel pressure value. `value` is normalised [0.0, 1.0].
    #[wasm_bindgen(js_name = setAftertouch)]
    pub fn set_aftertouch(&mut self, value: f32) {
        self.inner.set_aftertouch(value);
    }

    /// Return the latest runtime modulation-source values as JSON for UI telemetry.
    #[wasm_bindgen(js_name = getRuntimeModSources)]
    pub fn get_runtime_mod_sources(&self) -> String {
        match serde_json::to_string(&self.inner.runtime_mod_sources()) {
            Ok(json) => json,
            Err(e) => {
                web_sys::console::error_1(
                    &format!(
                        "[cosmo-synth-engine] getRuntimeModSources serialize error: {e}"
                    )
                    .into(),
                );
                serde_json::to_string(&RuntimeModSources::default())
                    .unwrap_or_else(|_| String::from("{}"))
            }
        }
    }

    /// Fill `output` with mono samples rendered by the DSP engine.
    ///
    /// The caller passes a `Float32Array` slice backed by WASM linear memory.
    /// The entire slice is filled; returns nothing — same as the JS worklet
    /// `process()` contract.
    #[wasm_bindgen]
    pub fn process(&mut self, output: &mut [f32]) {
        self.inner.process(output);
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn midi_note_to_freq(note: u8) -> f32 {
    440.0 * libm::powf(2.0_f32, (note as f32 - 69.0) / 12.0)
}
