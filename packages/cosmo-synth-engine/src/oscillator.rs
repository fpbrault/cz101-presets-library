use crate::params::{LfoWaveform, WarpAlgo, WaveformId, WindowType};

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

/// CZ Phase Distortion transfer function.
///
/// Maps phase phi ∈ [0, 1) → distorted phase. Mirrors `pdTransfer` in the JS.
pub fn pd_transfer(waveform: WaveformId, phi: f32) -> f32 {
    match waveform {
        // case 1: Saw — identity
        WaveformId::Saw => phi,
        // case 2: Square — step at 0.5
        WaveformId::Square => {
            if phi < 0.5 {
                0.0
            } else {
                1.0
            }
        }
        // case 3: Pulse — pulse between 0.25 and 0.75
        WaveformId::Pulse => {
            if (0.25..0.75).contains(&phi) {
                1.0
            } else {
                0.0
            }
        }
        // case 4: Null — very short ramp at start
        WaveformId::Null => {
            if phi < 0.01 {
                phi / 0.01
            } else {
                0.0
            }
        }
        // case 5: SinePulse — short ramp then zero
        WaveformId::SinePulse => {
            if phi < 0.15 {
                phi / 0.15
            } else {
                0.0
            }
        }
        // case 6: SawPulse — short ramp then passthrough
        WaveformId::SawPulse => {
            if phi < 0.15 {
                phi / 0.15
            } else {
                phi
            }
        }
        // case 7: MultiSine — sine-modulated phase
        WaveformId::MultiSine => {
            phi + 3.0 * libm::sinf(TWO_PI * phi) * libm::sinf(core::f32::consts::PI * phi)
        }
        // case 8: Pulse2 — two narrow pulses
        WaveformId::Pulse2 => {
            if phi < 0.15 || (0.5..0.65).contains(&phi) {
                1.0
            } else {
                0.0
            }
        }
    }
}

/// Full CZ waveform sample for a given phase.
///
/// Applies `pd_transfer` then maps to audio range. Mirrors `czWaveform` in the JS.
pub fn cz_waveform(waveform: WaveformId, phi: f32) -> f32 {
    let p = pd_transfer(waveform, phi);
    match waveform {
        // case 1: Saw — 2p-1
        WaveformId::Saw => 2.0 * p - 1.0,
        // case 2: Square — ±1
        WaveformId::Square => {
            if p == 1.0 {
                1.0
            } else {
                -1.0
            }
        }
        // case 3: Pulse — ±1
        WaveformId::Pulse => {
            if p == 1.0 {
                1.0
            } else {
                -1.0
            }
        }
        // case 4: Null — 2p-1
        WaveformId::Null => p * 2.0 - 1.0,
        // case 5: SinePulse — 2p-1
        WaveformId::SinePulse => p * 2.0 - 1.0,
        // case 6: SawPulse — 2p-1
        WaveformId::SawPulse => 2.0 * p - 1.0,
        // case 7: MultiSine — sin(TWO_PI * p)
        WaveformId::MultiSine => libm::sinf(TWO_PI * p),
        // case 8: Pulse2 — ±1
        WaveformId::Pulse2 => {
            if p == 1.0 {
                1.0
            } else {
                -1.0
            }
        }
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

// ─── Warp algorithms ──────────────────────────────────────────────────────────

/// Exponential bend warp.
///
/// JS: `expm1(phase * scale) / expm1(scale)` where `scale = -10 * amt`.
pub fn warp_bend(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let scale = -10.0 * amt;
    let num = libm::expm1f(phase * scale);
    let den = libm::expm1f(scale);
    if den == 0.0 {
        phase
    } else {
        num / den
    }
}

/// Hard sync warp (repeat phase n times).
///
/// JS: `(phase * n) % 1`  where `n = 1 + amt * 7`.
pub fn warp_sync(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let n = 1.0 + amt * 7.0;
    wrap01(phase * n)
}

/// Pinch warp (compress/expand around center).
///
/// JS: `center + (phase - center) * (|phase - center| / center) ^ (1 / (a + 0.001))`
/// where `a = amt * 0.98 + 0.01`.
pub fn warp_pinch(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let center = 0.5_f32;
    let a = amt * 0.98 + 0.01;
    let diff = phase - center;
    let norm = libm::fabsf(diff) / center;
    let exp = 1.0 / (a + 0.001);
    let sign = if diff < 0.0 { -1.0_f32 } else { 1.0_f32 };
    center + sign * libm::powf(norm, exp) * center
}

/// Wavefold warp.
///
/// JS: fold `1 + floor(amt * 5)` times, result `% 1`.
pub fn warp_fold(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let mut p = phase;
    let folds = 1 + libm::floorf(amt * 5.0) as u32;
    for _ in 0..folds {
        if p > 0.5 {
            p = 1.0 - p;
        }
        p *= 2.0;
    }
    wrap01(p)
}

/// Skew warp (asymmetric time stretch).
///
/// JS: blend between phase and a two-segment linear map at breakpoint 0.2.
pub fn warp_skew(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let bp = 0.2_f32;
    let target = if phase < bp {
        (phase / bp) * 0.5
    } else {
        0.5 + ((phase - bp) / (1.0 - bp)) * 0.5
    };
    phase + (target - phase) * amt
}

/// Step-quantize warp.
///
/// JS: `levels = 2 + floor(amt * 30)`; `target = round(phase * levels) / levels`.
pub fn warp_quantize(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let levels = 2.0 + libm::floorf(amt * 30.0);
    let target = libm::roundf(phase * levels) / levels;
    phase + (target - phase) * amt
}

/// Twist warp (phase-modulated sinusoidal).
///
/// JS: `wrap01(phase + amt * 0.2 * sin(TWO_PI * phase * 3))`
pub fn warp_twist(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    wrap01(phase + amt * 0.2 * libm::sinf(TWO_PI * phase * 3.0))
}

/// Clip/saturate warp.
///
/// JS: `gain = 1 + amt * 4`; clip `(phase - 0.5) * gain` to [-0.5, 0.5] then shift to [0,1].
pub fn warp_clip(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let gain = 1.0 + amt * 4.0;
    let x = (phase - 0.5) * gain;
    x.clamp(-0.5_f32, 0.5_f32) + 0.5
}

/// Ripple warp (high-frequency phase modulation).
///
/// JS: `wrap01(phase + amt * 0.08 * sin(TWO_PI * phase * 10))`
pub fn warp_ripple(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    wrap01(phase + amt * 0.08 * libm::sinf(TWO_PI * phase * 10.0))
}

/// Mirror warp (flip phase toward 0.5).
///
/// JS: `phase + (1 - phase - phase) * amt`
pub fn warp_mirror(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    phase + (1.0 - phase - phase) * amt
}

/// FOF (Formant) warp — Gaussian-windowed 5x carrier.
///
/// JS: carrier = wrap01(phase * 5), window = exp(-20 * (phase-0.5)^2),
///     result = wrap01(carrier * (1-amt) + carrier * window * amt)
pub fn warp_fof(phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    let carrier = wrap01(phase * 5.0);
    let diff = phase - 0.5;
    let window = libm::expf(-20.0 * diff * diff);
    wrap01(carrier * (1.0 - amt) + carrier * window * amt)
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/// Apply a warp algorithm to phase.
///
/// Returns identity if `amt == 0`. Mirrors `applyWarpAlgo` in the JS.
/// `Karpunk` and `Sine` are identity (stateful / handled externally).
pub fn apply_warp_algo(algo: WarpAlgo, phase: f32, amt: f32, _wave_id: WaveformId) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    match algo {
        WarpAlgo::Bend => warp_bend(phase, amt),
        WarpAlgo::Sync => warp_sync(phase, amt),
        WarpAlgo::Pinch => warp_pinch(phase, amt),
        WarpAlgo::Fold => warp_fold(phase, amt),
        WarpAlgo::Cz101 => phase, // identity — CZ waveform shaping is done in czWaveform
        WarpAlgo::Skew => warp_skew(phase, amt),
        WarpAlgo::Quantize => warp_quantize(phase, amt),
        WarpAlgo::Twist => warp_twist(phase, amt),
        WarpAlgo::Clip => warp_clip(phase, amt),
        WarpAlgo::Ripple => warp_ripple(phase, amt),
        WarpAlgo::Mirror => warp_mirror(phase, amt),
        WarpAlgo::Fof => warp_fof(phase, amt),
        WarpAlgo::Karpunk => phase, // stateful — handled in voice render
        WarpAlgo::Sine => phase,    // passthrough
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
