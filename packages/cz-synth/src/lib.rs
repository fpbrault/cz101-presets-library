//! CZ-101 Phase Distortion synthesizer DSP core.
//!
//! Compiles to:
//! - Native (Tauri desktop, VST3/AU)
//! - WebAssembly (AudioWorklet via wasm-bindgen, feature = "wasm")
//! - Mobile (iOS/Android via UniFFI, feature = "uniffi")

#![cfg_attr(not(feature = "std"), no_std)]

pub mod envelope;
pub mod fx;
pub mod oscillator;
pub mod params;
pub mod processor;
pub mod voice;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

#[cfg(feature = "uniffi")]
pub mod uniffi_ffi;

// UniFFI scaffolding must be set up at the crate root so the generated
// `UniFfiTag` type is in scope for the derive macros in `uniffi_ffi`.
#[cfg(feature = "uniffi")]
uniffi::setup_scaffolding!();
