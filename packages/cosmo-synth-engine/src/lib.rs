//! Cosmo PD-101 Phase Distortion synthesizer DSP core.
//!
//! Compiles to:
//! - Native (Tauri desktop, VST3/AU)
//! - WebAssembly (AudioWorklet via wasm-bindgen, feature = "wasm")

#![cfg_attr(not(feature = "std"), no_std)]

pub mod default_envelopes;
pub mod dsp_utils;
pub mod envelope;
pub mod envelope_map;
pub mod fx;
pub mod generators;
pub mod params;
pub mod preset_wire;
pub mod processor;
pub mod voice;

#[cfg(target_arch = "wasm32")]
pub mod wasm;
