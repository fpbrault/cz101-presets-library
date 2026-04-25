use crate::params::{LfoWaveform, WindowType};

const TWO_PI: f32 = core::f32::consts::TAU;

/// Wrap a value into [0, 1).
#[inline]
pub fn wrap01(v: f32) -> f32 {
    let w = v - libm::floorf(v);
    if w < 0.0 {
        w + 1.0
    } else {
        w
    }
}

/// Linear interpolation.
#[inline]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Apply amplitude window to oscillator output.
///
/// Returns a gain multiplier [0, 1]. Mirrors `applyWindow` in the JS.
pub fn apply_window(phase: f32, window: WindowType) -> f32 {
    match window {
        WindowType::Off => 1.0,
        WindowType::Saw => phase,
        WindowType::Triangle => 1.0 - libm::fabsf(phase * 2.0 - 1.0),
        WindowType::Trapezoid => {
            if phase < 0.5 {
                1.0
            } else {
                2.0 * (1.0 - phase)
            }
        }
        WindowType::Pulse => {
            if phase < 0.5 {
                1.0
            } else {
                0.0
            }
        }
        WindowType::DoubleSaw => 1.0 - libm::fabsf(2.0 * wrap01(phase * 2.0) - 1.0),
    }
}

// ─── LFO ──────────────────────────────────────────────────────────────────────

/// LFO sample for phase ∈ [0, 1). Mirrors `lfoOutput` in the JS.
pub fn lfo_output(phase: f32, waveform: LfoWaveform) -> f32 {
    match waveform {
        LfoWaveform::Sine => libm::sinf(TWO_PI * phase),
        LfoWaveform::Triangle => {
            if phase < 0.5 {
                4.0 * phase - 1.0
            } else {
                3.0 - 4.0 * phase
            }
        }
        LfoWaveform::Square => {
            if phase < 0.5 {
                1.0
            } else {
                -1.0
            }
        }
        LfoWaveform::Saw => phase * 2.0 - 1.0,
        LfoWaveform::InvertedSaw => 1.0 - phase * 2.0,
        LfoWaveform::Random => {
            let steps_per_cycle = 16.0;
            let step_index = libm::floorf(phase * steps_per_cycle) as i32;
            let seed = step_index as f32 * 12.9898 + 78.233;
            let hash = libm::sinf(seed) * 43758.5453;
            let fract = hash - libm::floorf(hash);
            fract * 2.0 - 1.0
        }
    }
}
