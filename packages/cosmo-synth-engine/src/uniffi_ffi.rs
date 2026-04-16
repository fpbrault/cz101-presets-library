//! UniFFI bindings for the CZ-101 DSP engine.
//!
//! Exposes `CzSynthEngine` to Swift (iOS) and Kotlin (Android).
//!
//! ## iOS build
//! ```sh
//! rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
//! cargo build --release --target aarch64-apple-ios --features uniffi
//! cargo build --release --target aarch64-apple-ios-sim --features uniffi
//! # Then create XCFramework from the resulting .a files
//! ```
//!
//! ## Android build
//! ```sh
//! cargo install cargo-ndk
//! rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
//! cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 \
//!   -o ../android/app/src/main/jniLibs build --release --features uniffi
//! ```
//!
//! ## Generate Swift/Kotlin bindings
//! ```sh
//! cargo run --features uniffi --bin uniffi-bindgen generate \
//!   --library target/release/libcz_synth.dylib \
//!   --language swift --out-dir bindings/swift
//! cargo run --features uniffi --bin uniffi-bindgen generate \
//!   --library target/release/libcz_synth.dylib \
//!   --language kotlin --out-dir bindings/kotlin
//! ```

use std::sync::Mutex;

use crate::params::SynthParams;
use crate::processor::Cz101Processor;

// ---------------------------------------------------------------------------
// CzSynthEngine — thread-safe wrapper around Cz101Processor
// ---------------------------------------------------------------------------

/// Thread-safe CZ-101 synthesizer engine for use from Swift/Kotlin.
///
/// All methods are safe to call from any thread; a `Mutex` serialises access
/// to the underlying `Cz101Processor`.  Create one instance per audio stream.
#[derive(uniffi::Object)]
pub struct CzSynthEngine {
    inner: Mutex<Cz101Processor>,
}

#[uniffi::export]
impl CzSynthEngine {
    /// Create a new engine at the given sample rate (e.g. 44100 or 48000).
    #[uniffi::constructor]
    pub fn new(sample_rate: f32) -> std::sync::Arc<Self> {
        std::sync::Arc::new(Self {
            inner: Mutex::new(Cz101Processor::new(sample_rate)),
        })
    }

    /// Replace all synthesis parameters from a JSON string.
    ///
    /// Serialize a `SynthParams`-compatible object on the Swift/Kotlin side
    /// with `JSON.encode` / `Gson` and pass the resulting string here.
    pub fn set_params_json(&self, json: String) {
        match serde_json::from_str::<SynthParams>(&json) {
            Ok(p) => {
                if let Ok(mut guard) = self.inner.lock() {
                    guard.set_params(p);
                }
            }
            Err(e) => {
                // Best-effort: log to stderr; host should check return value
                eprintln!("[cosmo-synth-engine] set_params_json error: {e}");
            }
        }
    }

    /// Trigger a note-on event.
    ///
    /// * `note`      — MIDI note number (0–127)
    /// * `frequency` — Hz; pass `0.0` to auto-compute from the MIDI note
    /// * `velocity`  — normalised 0.0–1.0
    pub fn note_on(&self, note: u8, frequency: f32, velocity: f32) {
        let freq = if frequency > 0.0 {
            frequency
        } else {
            midi_note_to_freq(note)
        };
        if let Ok(mut guard) = self.inner.lock() {
            guard.note_on(note, freq, velocity);
        }
    }

    /// Trigger a note-off event.
    pub fn note_off(&self, note: u8) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.note_off(note);
        }
    }

    /// Set the sustain (damper) pedal state.
    pub fn set_sustain(&self, on: bool) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.set_sustain(on);
        }
    }

    /// Render `num_samples` mono samples and return them as a `Vec<f32>`.
    ///
    /// Call this from the audio render callback (e.g. `AVAudioSourceNode`
    /// render block or Oboe `onAudioReady`).  The returned `Vec` is allocated
    /// in Rust and handed to the foreign side — copy into your platform buffer.
    ///
    /// For real-time audio, keep `num_samples` small (128–512) and call
    /// frequently rather than requesting large blocks.
    pub fn process_block(&self, num_samples: u32) -> Vec<f32> {
        let n = num_samples as usize;
        let mut buf = vec![0.0_f32; n];
        if let Ok(mut guard) = self.inner.lock() {
            guard.process(&mut buf);
        }
        buf
    }

    /// Convenience: render `num_samples` stereo (interleaved L/R) samples.
    ///
    /// The engine is mono internally; this duplicates each sample into both
    /// channels.  Returns a `Vec<f32>` of length `2 * num_samples`.
    pub fn process_block_stereo(&self, num_samples: u32) -> Vec<f32> {
        let n = num_samples as usize;
        let mut mono = vec![0.0_f32; n];
        if let Ok(mut guard) = self.inner.lock() {
            guard.process(&mut mono);
        }
        let mut stereo = Vec::with_capacity(n * 2);
        for s in mono {
            stereo.push(s);
            stereo.push(s);
        }
        stereo
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn midi_note_to_freq(note: u8) -> f32 {
    440.0 * libm::powf(2.0_f32, (note as f32 - 69.0) / 12.0)
}
