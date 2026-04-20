use crate::params::{Algo, LfoWaveform, WindowType};
use core::cell::UnsafeCell;
use core::sync::atomic::{AtomicU8, Ordering};

const TWO_PI: f32 = core::f32::consts::TAU;
pub const SINE_TABLE_SIZE: usize = 2048;

// 0 = uninitialized, 1 = initializing, 2 = ready
static SINE_TABLE_STATE: AtomicU8 = AtomicU8::new(0);

struct SineTableCell(UnsafeCell<[f32; SINE_TABLE_SIZE]>);

// SAFETY: synchronization is enforced via SINE_TABLE_STATE; readers only access
// after state=2, and initialization writes happen only by the state=1 owner.
unsafe impl Sync for SineTableCell {}

static SINE_TABLE: SineTableCell = SineTableCell(UnsafeCell::new([0.0; SINE_TABLE_SIZE]));

#[inline]
fn sine_table() -> &'static [f32; SINE_TABLE_SIZE] {
    if SINE_TABLE_STATE.load(Ordering::Acquire) != 2 {
        if SINE_TABLE_STATE
            .compare_exchange(0, 1, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
        {
            let mut i = 0;
            while i < SINE_TABLE_SIZE {
                let phase = (i as f32) / (SINE_TABLE_SIZE as f32);
                // SAFETY: this write is performed only by the thread that won
                // the CAS transition to state=1; readers wait for state=2.
                unsafe {
                    (*SINE_TABLE.0.get())[i] = libm::cosf(TWO_PI * phase);
                }
                i += 1;
            }
            SINE_TABLE_STATE.store(2, Ordering::Release);
        } else {
            while SINE_TABLE_STATE.load(Ordering::Acquire) != 2 {
                core::hint::spin_loop();
            }
        }
    }

    // SAFETY: table contents are fully initialized before state=2 is published.
    unsafe { &*SINE_TABLE.0.get() }
}

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

/// Reads from a wavetable using linear interpolation.
///
/// `phase` must be in [0.0, 1.0).
#[inline]
pub fn lookup_table(phase: f32, table: &[f32; SINE_TABLE_SIZE]) -> f32 {
    let exact_index = phase * (SINE_TABLE_SIZE as f32);
    let idx0 = exact_index as usize;
    let idx1 = if idx0 + 1 >= SINE_TABLE_SIZE {
        0
    } else {
        idx0 + 1
    };
    let frac = exact_index - (idx0 as f32);
    lerp(table[idx0], table[idx1], frac)
}

#[inline]
fn sine_lut(phase: f32) -> f32 {
    lookup_table(wrap01(phase), sine_table())
}

// ─── CZ phase warping (internal) ─────────────────────────────────────────────

/// Generates the target phase readout line for CZ waveforms at max DCW.
///
/// The returned phase is fed into a sine carrier rather than treated as
/// an audio amplitude directly.
fn cz_warp_phase(algo: Algo, phi: f32, dcw: f32) -> f32 {
    // Clamp DCW slightly below 1.0 for division safety on extreme edges
    let dcw = dcw.clamp(0.0, 0.999);

    match algo {
        // WAVE 000: Sawtooth (Smooth morph to sharp single kink)
        Algo::Saw => {
            let p_peak = lerp(0.5, 0.01, dcw);

            if phi < p_peak {
                (phi / p_peak) * 0.5
            } else {
                0.5 + ((phi - p_peak) / (1.0 - p_peak)) * 0.5
            }
        }

        // WAVE 001: Square (Expands outwards from the center)
        Algo::Square => {
            let p_peak = lerp(0.5, 0.01, dcw);
            let p_fall = lerp(1.0, 0.51, dcw);

            if phi < p_peak {
                (phi / p_peak) * 0.5
            } else if phi < 0.5 {
                0.5
            } else if phi < p_fall {
                0.5 + ((phi - 0.5) / (p_fall - 0.5)) * 0.5
            } else {
                1.0
            }
        }

        // WAVE 010: Pulse (Same as square, but asymmetrical holding times)
        Algo::Pulse => {
            let p_peak = lerp(0.5, 0.01, dcw);
            let p_hold = lerp(0.5, 0.03, dcw);
            let p_fall = lerp(1.0, 0.04, dcw);

            if phi < p_peak {
                (phi / p_peak) * 0.5
            } else if phi < p_hold {
                0.5
            } else if phi < p_fall {
                0.5 + ((phi - p_hold) / (p_fall - p_hold)) * 0.5
            } else {
                1.0
            }
        }

        // WAVE 011: Null (Morphs from sawtooth to a flat line at the trough)
        Algo::Null => {
            let p_peak = lerp(0.5, 0.01, dcw);

            if phi < p_peak {
                (phi / p_peak) * 0.5
            } else {
                1.0 // Hold at trough (-1.0 amplitude)
            }
        }

        // WAVE 100: Sine-Pulse (Morphs from sine to pulse by squeezing the center of the phase)
        Algo::SinePulse => {
            let p_end = lerp(1.0, 0.5, dcw);

            // Prevent division by zero when DCW is 0
            if p_end >= 0.999 {
                phi
            } else if phi < p_end {
                phi / p_end
            } else {
                (phi - p_end) / (1.0 - p_end)
            }
        }

        // WAVE 101: Saw-Pulse
        Algo::SawPulse => {
            let p_peak = lerp(0.5, 0.01, dcw);
            let p_end = lerp(1.0, 0.5, dcw);

            if phi < p_peak {
                (phi / p_peak) * 0.5
            } else if phi < p_end {
                0.5 + ((phi - p_peak) / (p_end - p_peak)) * 0.5
            } else {
                1.0
            }
        }

        // WAVE 110: Resonance / MultiSine (Sysex only)
        Algo::MultiSine => {
            // Scales the carrier frequency up to ~15x at max DCW.
            // Note: This intentionally wraps the phase. The CZ architecture relies
            // on an Amplitude Window function to pinch the volume to 0 at the wrap points!
            wrap01(phi * lerp(1.0, 15.0, dcw))
        }

        // WAVE 111: Pulse2 (Sysex only)
        Algo::Pulse2 => {
            // Wrap the master phase at 2x speed to play the entire shape twice per cycle
            let p = wrap01(phi * 2.0);

            // The exact same sliding breakpoints as the normal Pulse (WAVE 010)
            let p_peak = lerp(0.5, 0.01, dcw);
            let p_hold = lerp(0.5, 0.01, dcw);
            let p_fall = lerp(1.0, 0.01, dcw);

            if p < p_peak {
                (p / p_peak) * 0.5
            } else if p < p_hold {
                0.5
            } else if p < p_fall {
                0.5 + ((p - p_hold) / (p_fall - p_hold)) * 0.5
            } else {
                1.0
            }
        }

        // Fallback for non-CZ or undefined algos
        _ => phi,
    }
}

fn warp_phase(algo: Algo, phase: f32, amt: f32) -> f32 {
    if amt == 0.0 {
        return phase;
    }
    match algo {
        Algo::Bend => {
            let scale = -10.0 * amt;
            let num = libm::expm1f(phase * scale);
            let den = libm::expm1f(scale);
            if den == 0.0 {
                phase
            } else {
                num / den
            }
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
                if p > 0.5 {
                    p = 1.0 - p;
                }
                p *= 2.0;
            }
            wrap01(p)
        }
        Algo::Skew => {
            let bp = 0.2_f32;
            let target = if phase < bp {
                (phase / bp) * 0.5
            } else {
                0.5 + ((phase - bp) / (1.0 - bp)) * 0.5
            };
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
/// `phase` is expected to be post-distortion (already processed by
/// `algo_warp_phase` in the voice path), so this function performs only the
/// final sine-table readout.
pub fn algo_sample(algo: Algo, phase: f32, dcw: f32) -> f32 {
    if algo.is_cz_waveform() {
        // The function now returns a perfectly continuous phase line at all DCW levels
        let final_phase = cz_warp_phase(algo, phase, dcw);

        // Read out using the inverted cosine
        -libm::cosf(TWO_PI * final_phase)
    } else {
        // Non-CZ warp algorithms (Bend, Pinch, etc.)
        let warped = warp_phase(algo, phase, dcw);
        -libm::cosf(TWO_PI * warped)
    }
}

/// Warp phase only.
///
/// For CZ algos, expose the final distorted phase for visualizers and sync logic.
pub fn algo_warp_phase(algo: Algo, phase: f32, dcw: f32) -> f32 {
    if algo.is_cz_waveform() {
        phase
    } else if algo == Algo::Karpunk || algo == Algo::Sine {
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
