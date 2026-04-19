use crate::params::{Algo, LfoWaveform, WindowType};

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

// ─── CZ waveform helpers (internal) ──────────────────────────────────────────

fn pd_transfer_cz(algo: Algo, phi: f32) -> f32 {
    match algo {
        Algo::Saw => phi,
        Algo::Square => if phi < 0.5 { 0.0 } else { 1.0 },
        Algo::Pulse => if (0.25..0.75).contains(&phi) { 1.0 } else { 0.0 },
        Algo::Null => if phi < 0.01 { phi / 0.01 } else { 0.0 },
        Algo::SinePulse => if phi < 0.15 { phi / 0.15 } else { 0.0 },
        Algo::SawPulse => if phi < 0.15 { phi / 0.15 } else { phi },
        Algo::MultiSine => phi + 3.0 * libm::sinf(TWO_PI * phi) * libm::sinf(core::f32::consts::PI * phi),
        Algo::Pulse2 => if phi < 0.15 || (0.5..0.65).contains(&phi) { 1.0 } else { 0.0 },
        _ => phi,
    }
}

fn cz_sample(algo: Algo, phi: f32) -> f32 {
    let p = pd_transfer_cz(algo, phi);
    match algo {
        Algo::Saw => 2.0 * p - 1.0,
        Algo::Square | Algo::Pulse | Algo::Pulse2 => if p == 1.0 { 1.0 } else { -1.0 },
        Algo::Null | Algo::SinePulse | Algo::SawPulse => 2.0 * p - 1.0,
        Algo::MultiSine => libm::sinf(TWO_PI * p),
        _ => 2.0 * p - 1.0,
    }
}

// ─── Warp phase distortion ────────────────────────────────────────────────────

fn warp_phase(algo: Algo, phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    match algo {
        Algo::Bend => {
            let scale = -10.0 * amt;
            let num = libm::expm1f(phase * scale);
            let den = libm::expm1f(scale);
            if den == 0.0 { phase } else { num / den }
        }
        Algo::Sync => wrap01(phase * (1.0 + amt * 7.0)),
        Algo::Pinch => {
            let center = 0.5_f32;
            let a = amt * 0.98 + 0.01;
            let diff = phase - center;
            let norm = libm::fabsf(diff) / center;
            let exp = 1.0 / (a + 0.001);
            let sign = if diff < 0.0 { -1.0_f32 } else { 1.0_f32 };
            center + sign * libm::powf(norm, exp) * center
        }
        Algo::Fold => {
            let mut p = phase;
            let folds = 1 + libm::floorf(amt * 5.0) as u32;
            for _ in 0..folds {
                if p > 0.5 { p = 1.0 - p; }
                p *= 2.0;
            }
            wrap01(p)
        }
        Algo::Skew => {
            let bp = 0.2_f32;
            let target = if phase < bp { (phase / bp) * 0.5 } else { 0.5 + ((phase - bp) / (1.0 - bp)) * 0.5 };
            phase + (target - phase) * amt
        }
        Algo::Quantize => {
            let levels = 2.0 + libm::floorf(amt * 30.0);
            let target = libm::roundf(phase * levels) / levels;
            phase + (target - phase) * amt
        }
        Algo::Twist => wrap01(phase + amt * 0.2 * libm::sinf(TWO_PI * phase * 3.0)),
        Algo::Clip => {
            let gain = 1.0 + amt * 4.0;
            let x = (phase - 0.5) * gain;
            x.clamp(-0.5_f32, 0.5_f32) + 0.5
        }
        Algo::Ripple => wrap01(phase + amt * 0.08 * libm::sinf(TWO_PI * phase * 10.0)),
        Algo::Mirror => phase + (1.0 - phase - phase) * amt,
        Algo::Fof => {
            let carrier = wrap01(phase * 5.0);
            let diff = phase - 0.5;
            let window = libm::expf(-20.0 * diff * diff);
            wrap01(carrier * (1.0 - amt) + carrier * window * amt)
        }
        // Karpunk and Sine are stateful/passthrough — handled in voice render
        _ => phase,
    }
}

// ─── Unified algo sample ──────────────────────────────────────────────────────

/// Render one sample from a unified `Algo` selector.
///
/// CZ waveform algos (saw, square, …) morph from sine to their CZ shape as `dcw` → 1.
/// Warp algos (bend, sync, …) distort the phase before driving a sine carrier.
/// `Karpunk` is handled externally (stateful); this returns sine as a placeholder.
pub fn algo_sample(algo: Algo, phase: f32, dcw: f32) -> f32 {
    if algo.is_cz_waveform() {
        lerp(libm::sinf(TWO_PI * phase), cz_sample(algo, phase), dcw)
    } else {
        let warped = warp_phase(algo, phase, dcw);
        libm::sinf(TWO_PI * warped)
    }
}

/// Warp phase only (used to compute the post-warp phase for non-CZ algos).
/// For CZ algos, returns `phase` unchanged (waveform shaping is done in `algo_sample`).
pub fn algo_warp_phase(algo: Algo, phase: f32, dcw: f32) -> f32 {
    if algo.is_cz_waveform() || algo == Algo::Karpunk || algo == Algo::Sine {
        phase
    } else {
        warp_phase(algo, phase, dcw)
    }
}

/// Apply amplitude window to oscillator output.
///
/// Returns a gain multiplier [0, 1]. Mirrors `applyWindow` in the JS.
pub fn apply_window(phase: f32, window: WindowType) -> f32 {
    match window {
        WindowType::Off => 1.0,
        WindowType::Saw => phase,
        WindowType::Triangle => 1.0 - libm::fabsf(phase * 2.0 - 1.0),
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
    }
}
