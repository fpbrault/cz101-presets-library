/// Per-voice state and sample rendering for the CZ-101 engine.
///
/// Ported from `createVoice` / `renderVoice` in `pdVisualizerProcessor.js`
/// (lines 488-1257).
extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use libm::{cosf, sinf};

use crate::envelope::EnvGen;
use crate::oscillator::{apply_warp_algo, apply_window, cz_waveform, lfo_output, wrap01};
use crate::params::{
    FilterType, LfoTarget, LineSelect, ModMode, PortamentoMode, SynthParams, VelocityTarget,
    WarpAlgo,
};

// TWO_PI for f32
const TWO_PI: f32 = core::f32::consts::PI * 2.0;

pub const KS_BUFFER_SIZE: usize = 2048;

// ---------------------------------------------------------------------------
// LineEnvs — per-line group of three envelope generators
// ---------------------------------------------------------------------------

/// The three envelope generators for a single oscillator line (DCO, DCW, DCA).
#[derive(Debug, Clone, Default)]
pub struct LineEnvs {
    pub dco: EnvGen,
    pub dcw: EnvGen,
    pub dca: EnvGen,
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Voice {
    pub phi1: f32,
    pub phi2: f32,
    pub pm_phi: f32,
    pub vibrato_phase: f32,
    pub vibrato_delay_counter: u32,
    pub current_freq: f32,
    pub target_freq: f32,
    pub glide_progress: f32,
    pub is_releasing: bool,
    pub is_silent: bool,
    pub sustained: bool,
    pub gate_was_open: bool,
    pub note: Option<u8>,
    pub frequency: f32,
    pub velocity: f32,
    /// LCG PRNG state for Karplus-Strong buffer initialisation.
    pub ks_prng: u32,

    pub line1_env: LineEnvs,
    pub line2_env: LineEnvs,

    pub filter_state1: [f32; 4],
    pub filter_state2: [f32; 4],

    // Karplus-Strong delay buffers (heap-allocated)
    pub ks_buffer1: Vec<f32>,
    pub ks_write_pos1: usize,
    pub ks_last_sample1: f32,
    pub ks_buffer2: Vec<f32>,
    pub ks_write_pos2: usize,
    pub ks_last_sample2: f32,
}

impl Voice {
    pub fn new() -> Self {
        Self {
            phi1: 0.0,
            phi2: 0.0,
            pm_phi: 0.0,
            vibrato_phase: 0.0,
            vibrato_delay_counter: 0,
            current_freq: 0.0,
            target_freq: 0.0,
            glide_progress: 0.0,
            is_releasing: false,
            is_silent: true,
            sustained: false,
            gate_was_open: false,
            note: None,
            frequency: 0.0,
            velocity: 1.0,
            ks_prng: 0x1234_5678,
            line1_env: LineEnvs::default(),
            line2_env: LineEnvs::default(),
            filter_state1: [0.0; 4],
            filter_state2: [0.0; 4],
            ks_buffer1: vec![0.0_f32; KS_BUFFER_SIZE],
            ks_write_pos1: 0,
            ks_last_sample1: 0.0,
            ks_buffer2: vec![0.0_f32; KS_BUFFER_SIZE],
            ks_write_pos2: 0,
            ks_last_sample2: 0.0,
        }
    }

    /// Reset all six envelope generators to their initial state.
    pub fn reset_envs(&mut self) {
        self.line1_env.dco.reset();
        self.line1_env.dcw.reset();
        self.line1_env.dca.reset();
        self.line2_env.dco.reset();
        self.line2_env.dcw.reset();
        self.line2_env.dca.reset();
    }
}

impl Default for Voice {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// render_voice
// ---------------------------------------------------------------------------

/// Render one audio sample from `voice`.
///
/// Returns `0.0` when the voice is silent.
///
/// # Arguments
/// * `voice`       – mutable reference to the voice state
/// * `p`           – current synth parameters
/// * `lfo_mod_val` – pre-computed LFO output value for this sample
/// * `sr`          – sample rate in Hz
pub fn render_voice(
    voice: &mut Voice,
    p: &SynthParams,
    lfo_mod_val: f32,
    sr: f32,
    pitch_bend_semitones: f32,
    mod_wheel: f32,
) -> f32 {
    let l1 = &p.line1;
    let l2 = &p.line2;
    let base_freq = if voice.frequency > 0.0 {
        voice.frequency
    } else {
        220.0
    };

    // -----------------------------------------------------------------------
    // Advance all 6 envelope generators
    // -----------------------------------------------------------------------
    let note_u8 = voice.note.unwrap_or(60);

    voice
        .line1_env
        .dco
        .advance(&l1.dco_env, sr, l1.key_follow, note_u8);
    voice
        .line1_env
        .dcw
        .advance(&l1.dcw_env, sr, l1.key_follow, note_u8);
    voice
        .line1_env
        .dca
        .advance(&l1.dca_env, sr, l1.key_follow, note_u8);
    voice
        .line2_env
        .dco
        .advance(&l2.dco_env, sr, l2.key_follow, note_u8);
    voice
        .line2_env
        .dcw
        .advance(&l2.dcw_env, sr, l2.key_follow, note_u8);
    voice
        .line2_env
        .dca
        .advance(&l2.dca_env, sr, l2.key_follow, note_u8);

    let dca1 = voice.line1_env.dca.output;
    let dca2 = voice.line2_env.dca.output;

    // -----------------------------------------------------------------------
    // If the voice is flagged silent: keep phases advancing and return 0
    // -----------------------------------------------------------------------
    if voice.is_silent {
        let freq1 = base_freq * libm::powf(2.0, l1.octave + l1.detune_cents / 1200.0);
        let freq2 = base_freq * libm::powf(2.0, l2.octave + l2.detune_cents / 1200.0);
        voice.phi1 += freq1 / sr;
        voice.phi2 += freq2 / sr;
        voice.pm_phi += (base_freq * p.int_pm_ratio) / sr;
        if voice.phi1 >= 1.0 {
            voice.phi1 -= 1.0;
        }
        if voice.phi2 >= 1.0 {
            voice.phi2 -= 1.0;
        }
        if voice.pm_phi >= 1.0 {
            voice.pm_phi -= 1.0;
        }
        return 0.0;
    }

    // -----------------------------------------------------------------------
    // Release silence check
    // -----------------------------------------------------------------------
    if voice.is_releasing && libm::fabsf(dca1) < 0.001 && libm::fabsf(dca2) < 0.001 {
        voice.is_silent = true;
        voice.note = None;
        voice.line1_env.dca.output = 0.0;
        voice.line2_env.dca.output = 0.0;
        return 0.0;
    }

    // -----------------------------------------------------------------------
    // Envelope-modulated parameters
    // -----------------------------------------------------------------------
    let dco_depth1 = l1.dco_depth;
    let dco_depth2 = l2.dco_depth;
    let dco1_env = voice.line1_env.dco.output;
    let dco2_env = voice.line2_env.dco.output;
    let dcw1 = l1.dcw_base * voice.line1_env.dcw.output;
    let dcw2 = l2.dcw_base * voice.line2_env.dcw.output;
    let dca1_level = l1.dca_base * dca1;
    let dca2_level = l2.dca_base * dca2;

    // DCW compensation: keep amplitude stable as warp increases
    let comp_a = l1.dcw_comp;
    let comp_b = l2.dcw_comp;
    let compensated_dca1 = dca1_level * (1.0 - comp_a + comp_a * voice.line1_env.dcw.output);
    let compensated_dca2 = dca2_level * (1.0 - comp_b + comp_b * voice.line2_env.dcw.output);

    // Velocity routing
    let vel = voice.velocity;
    let vel_amp = match p.velocity_target {
        VelocityTarget::Amp | VelocityTarget::Both => vel,
        _ => 1.0,
    };
    let vel_dcw = match p.velocity_target {
        VelocityTarget::Dcw | VelocityTarget::Both => vel,
        _ => 1.0,
    };

    let mut final_dcw1 = dcw1 * vel_dcw;
    let mut final_dcw2 = dcw2 * vel_dcw;
    let mut final_dca1 = compensated_dca1 * vel_amp;
    let mut final_dca2 = compensated_dca2 * vel_amp;

    // Frequency with DCO envelope pitch modulation
    let freq1 = base_freq
        * libm::powf(2.0, l1.octave + l1.detune_cents / 1200.0)
        * libm::powf(2.0, (dco_depth1 * dco1_env) / 12.0);
    let freq2 = base_freq
        * libm::powf(2.0, l2.octave + l2.detune_cents / 1200.0)
        * libm::powf(2.0, (dco_depth2 * dco2_env) / 12.0);

    let mut effective_freq1 = freq1;
    let mut effective_freq2 = freq2;

    // -----------------------------------------------------------------------
    // Portamento / glide
    // -----------------------------------------------------------------------
    let port = &p.portamento;
    if port.enabled && (voice.target_freq - voice.current_freq).abs() > 1e-6 {
        match port.mode {
            PortamentoMode::Rate => {
                voice.current_freq +=
                    (voice.target_freq - voice.current_freq) * (port.rate / 1000.0);
            }
            PortamentoMode::Time => {
                voice.glide_progress += 1.0 / (port.time * sr);
                if voice.glide_progress >= 1.0 {
                    voice.current_freq = voice.target_freq;
                } else {
                    let t = voice.glide_progress;
                    voice.current_freq =
                        voice.current_freq + (voice.target_freq - voice.current_freq) * t;
                }
            }
        }
        let ratio = voice.current_freq / base_freq;
        effective_freq1 *= ratio;
        effective_freq2 *= ratio;
    }

    // -----------------------------------------------------------------------
    // Pitch bend
    // -----------------------------------------------------------------------
    if pitch_bend_semitones != 0.0 {
        let bend_ratio = libm::powf(2.0, pitch_bend_semitones / 12.0);
        effective_freq1 *= bend_ratio;
        effective_freq2 *= bend_ratio;
    }

    // -----------------------------------------------------------------------
    // Vibrato
    // -----------------------------------------------------------------------
    let vibrato = &p.vibrato;
    if vibrato.enabled {
        if voice.vibrato_delay_counter > 0 {
            voice.vibrato_delay_counter -= 1;
        } else {
            voice.vibrato_phase += vibrato.rate / sr;
            if voice.vibrato_phase >= 1.0 {
                voice.vibrato_phase -= 1.0;
            }
            let vib_waveform = match vibrato.waveform {
                2 => crate::params::LfoWaveform::Triangle,
                3 => crate::params::LfoWaveform::Square,
                4 => crate::params::LfoWaveform::Saw,
                _ => crate::params::LfoWaveform::Sine,
            };
            let lfo_val = lfo_output(voice.vibrato_phase, vib_waveform);
            let effective_depth = vibrato.depth + mod_wheel * p.mod_wheel_vibrato_depth;
            let pitch_mod = 1.0 + lfo_val * (effective_depth / 1000.0);
            effective_freq1 *= pitch_mod;
            effective_freq2 *= pitch_mod;
        }
    }

    // -----------------------------------------------------------------------
    // Global LFO modulation
    // -----------------------------------------------------------------------
    if lfo_mod_val != 0.0 {
        let lfo = &p.lfo;
        let mod_val = lfo_mod_val * lfo.depth;
        match lfo.target {
            LfoTarget::Pitch => {
                effective_freq1 *= 1.0 + mod_val;
                effective_freq2 *= 1.0 + mod_val;
            }
            LfoTarget::Dcw => {
                final_dcw1 = (final_dcw1 + mod_val).clamp(0.0, 1.0);
                final_dcw2 = (final_dcw2 + mod_val).clamp(0.0, 1.0);
            }
            LfoTarget::Dca => {
                final_dca1 = (final_dca1 * (1.0 + mod_val)).max(0.0);
                final_dca2 = (final_dca2 * (1.0 + mod_val)).max(0.0);
            }
            LfoTarget::Filter => {
                // handled at filter stage below
            }
        }
    }

    // -----------------------------------------------------------------------
    // Phase Distortion oscillator computation
    // -----------------------------------------------------------------------
    let pm_freq = base_freq * p.int_pm_ratio;
    let pm_delta = pm_freq / sr;

    let phi1 = wrap01(voice.phi1);
    let phi2 = wrap01(voice.phi2);
    let pm_phi = wrap01(voice.pm_phi);

    let pm_mod = p.int_pm_amount * 10.0 * sinf(TWO_PI * pm_phi);
    let phase_a_input = if p.pm_pre {
        wrap01(phi1 + pm_mod)
    } else {
        phi1
    };
    let phase_b_input = if p.pm_pre {
        wrap01(phi2 + pm_mod)
    } else {
        phi2
    };

    let algo2a = l1.algo2;
    let algo2b = l2.algo2;
    let blend_a = l1.algo_blend;
    let blend_b = l2.algo_blend;

    let warped_a = apply_warp_algo(l1.warp_algo, phase_a_input, final_dcw1, l1.waveform);
    let warped_b = apply_warp_algo(l2.warp_algo, phase_b_input, final_dcw2, l2.waveform);

    let phase_a_post = wrap01(if p.pm_pre {
        warped_a
    } else {
        warped_a + pm_mod
    });
    let phase_b_post = wrap01(if p.pm_pre {
        warped_b
    } else {
        warped_b + pm_mod
    });

    let w1 = apply_window(phi1, l1.window);
    let w2 = apply_window(phi2, l2.window);

    // -----------------------------------------------------------------------
    // Line 1 signal
    //
    // KS sample is computed unconditionally when either algo A or algo B2 is
    // Karpunk, so that the buffer always advances and blending works correctly.
    // -----------------------------------------------------------------------

    // Advance the KS1 buffer and capture the filtered output for this sample.
    // This runs even when algo A is not Karpunk, so that blend-to-Karpunk
    // (algo2 == Karpunk) has a valid, live signal to lerp toward.
    let ks_raw1 = {
        let ks_size1 = (libm::roundf(
            sr / if effective_freq1 > 0.0 {
                effective_freq1
            } else {
                220.0
            },
        ) as usize)
            .clamp(2, KS_BUFFER_SIZE - 1);
        let ks_read1 = (voice.ks_write_pos1 + KS_BUFFER_SIZE - ks_size1) % KS_BUFFER_SIZE;
        let ks_out1 = voice.ks_buffer1[ks_read1];
        let ks_damp1 = 0.4 + final_dcw1 * 0.58;
        let ks_filtered1 = ks_damp1 * ks_out1 + (1.0 - ks_damp1) * voice.ks_last_sample1;
        voice.ks_last_sample1 = ks_filtered1;
        voice.ks_buffer1[voice.ks_write_pos1] = ks_filtered1 * 0.995;
        voice.ks_write_pos1 = (voice.ks_write_pos1 + 1) % KS_BUFFER_SIZE;
        ks_filtered1
    };

    let s1 = if let Some(a2) = algo2a {
        // Dual-algorithm blending — either or both algos may be Karpunk.
        let dcw2a = final_dcw1 * blend_a;
        let dcw1_effective = final_dcw1 * (1.0 - blend_a);

        let sig_a1 = match l1.warp_algo {
            WarpAlgo::Karpunk => ks_raw1,
            WarpAlgo::Cz101 => lerp(
                sinf(TWO_PI * phase_a_post),
                cz_waveform(l1.waveform, phase_a_post),
                dcw1_effective,
            ),
            _ => sinf(TWO_PI * phase_a_post),
        };

        let sig_a2 = match a2 {
            WarpAlgo::Karpunk => ks_raw1, // share the same KS output for the blend target
            WarpAlgo::Cz101 => {
                let warped_a2 = apply_warp_algo(a2, phase_a_input, dcw2a, l1.waveform2);
                let phase_a_post2 = wrap01(if p.pm_pre {
                    warped_a2
                } else {
                    warped_a2 + pm_mod
                });
                lerp(
                    sinf(TWO_PI * phase_a_post2),
                    cz_waveform(l1.waveform2, phase_a_post2),
                    dcw2a,
                )
            }
            _ => {
                let warped_a2 = apply_warp_algo(a2, phase_a_input, dcw2a, l1.waveform2);
                let phase_a_post2 = wrap01(if p.pm_pre {
                    warped_a2
                } else {
                    warped_a2 + pm_mod
                });
                sinf(TWO_PI * phase_a_post2)
            }
        };

        // Karpunk-aware blending (asymmetric):
        // - KS as base (A slot): ring-mod — blend=0 pure KS, blend=1 KS*osc*2 (plucked oscillator)
        // - KS as target (B slot): plain lerp — blend=0 pure osc, blend=1 pure KS (fade into pluck)
        let combined_a = if l1.warp_algo == WarpAlgo::Karpunk {
            // KS is the base; morph it toward a ring-modulated version of the other algo
            let ks = sig_a1;
            let osc = sig_a2;
            lerp(ks, ks * osc * 2.0, blend_a)
        } else if a2 == WarpAlgo::Karpunk {
            // KS is the target; simple crossfade from osc into KS
            lerp(sig_a1, sig_a2, blend_a)
        } else {
            lerp(sig_a1, sig_a2, blend_a)
        };
        combined_a * w1 * final_dca1
    } else if l1.warp_algo == WarpAlgo::Karpunk {
        ks_raw1 * w1 * final_dca1
    } else {
        // Standard single-algo path
        if l1.warp_algo == WarpAlgo::Cz101 {
            lerp(
                sinf(TWO_PI * phase_a_post),
                cz_waveform(l1.waveform, phase_a_post),
                final_dcw1,
            ) * w1
                * final_dca1
        } else {
            sinf(TWO_PI * phase_a_post) * w1 * final_dca1
        }
    };

    // -----------------------------------------------------------------------
    // Line 2 signal
    //
    // Same KS-first extraction pattern as Line 1.
    // -----------------------------------------------------------------------

    let ks_raw2 = {
        let ks_size2 = (libm::roundf(
            sr / if effective_freq2 > 0.0 {
                effective_freq2
            } else {
                220.0
            },
        ) as usize)
            .clamp(2, KS_BUFFER_SIZE - 1);
        let ks_read2 = (voice.ks_write_pos2 + KS_BUFFER_SIZE - ks_size2) % KS_BUFFER_SIZE;
        let ks_out2 = voice.ks_buffer2[ks_read2];
        let ks_damp2 = 0.4 + final_dcw2 * 0.58;
        let ks_filtered2 = ks_damp2 * ks_out2 + (1.0 - ks_damp2) * voice.ks_last_sample2;
        voice.ks_last_sample2 = ks_filtered2;
        voice.ks_buffer2[voice.ks_write_pos2] = ks_filtered2 * 0.995;
        voice.ks_write_pos2 = (voice.ks_write_pos2 + 1) % KS_BUFFER_SIZE;
        ks_filtered2
    };

    let s2 = if let Some(a2) = algo2b {
        // Dual-algorithm blending — either or both algos may be Karpunk.
        let dcw2b = final_dcw2 * blend_b;
        let dcw1_effective_b = final_dcw2 * (1.0 - blend_b);

        let sig_b1 = match l2.warp_algo {
            WarpAlgo::Karpunk => ks_raw2,
            WarpAlgo::Cz101 => lerp(
                sinf(TWO_PI * phase_b_post),
                cz_waveform(l2.waveform, phase_b_post),
                dcw1_effective_b,
            ),
            _ => sinf(TWO_PI * phase_b_post),
        };

        let sig_b2 = match a2 {
            WarpAlgo::Karpunk => ks_raw2,
            WarpAlgo::Cz101 => {
                let warped_b2 = apply_warp_algo(a2, phase_b_input, dcw2b, l2.waveform2);
                let phase_b_post2 = wrap01(if p.pm_pre {
                    warped_b2
                } else {
                    warped_b2 + pm_mod
                });
                lerp(
                    sinf(TWO_PI * phase_b_post2),
                    cz_waveform(l2.waveform2, phase_b_post2),
                    dcw2b,
                )
            }
            _ => {
                let warped_b2 = apply_warp_algo(a2, phase_b_input, dcw2b, l2.waveform2);
                let phase_b_post2 = wrap01(if p.pm_pre {
                    warped_b2
                } else {
                    warped_b2 + pm_mod
                });
                sinf(TWO_PI * phase_b_post2)
            }
        };

        // Karpunk-aware blending (asymmetric):
        // - KS as base (B slot): ring-mod — blend=0 pure KS, blend=1 KS*osc*2 (plucked oscillator)
        // - KS as target (B-target slot): plain lerp — blend=0 pure osc, blend=1 pure KS
        let combined_b = if l2.warp_algo == WarpAlgo::Karpunk {
            // KS is the base; morph it toward a ring-modulated version of the other algo
            let ks = sig_b1;
            let osc = sig_b2;
            lerp(ks, ks * osc * 2.0, blend_b)
        } else if a2 == WarpAlgo::Karpunk {
            // KS is the target; simple crossfade from osc into KS
            lerp(sig_b1, sig_b2, blend_b)
        } else {
            lerp(sig_b1, sig_b2, blend_b)
        };
        combined_b * w2 * final_dca2
    } else if l2.warp_algo == WarpAlgo::Karpunk {
        ks_raw2 * w2 * final_dca2
    } else {
        if l2.warp_algo == WarpAlgo::Cz101 {
            lerp(
                sinf(TWO_PI * phase_b_post),
                cz_waveform(l2.waveform, phase_b_post),
                final_dcw2,
            ) * w2
                * final_dca2
        } else {
            sinf(TWO_PI * phase_b_post) * w2 * final_dca2
        }
    };

    // -----------------------------------------------------------------------
    // Line select + modulation mode mixing
    // -----------------------------------------------------------------------
    let mut mix_a = s1;
    let mut mix_b = s2;

    match p.line_select {
        LineSelect::L1PlusL1Prime => {
            let s1p = cz_waveform(
                if l1.waveform2 != Default::default() {
                    l1.waveform2
                } else {
                    l1.waveform
                },
                phi1,
            ) * final_dca1;
            mix_a = s1;
            mix_b = s1p;
        }
        LineSelect::L1PlusL2Prime => {
            let s2p = cz_waveform(
                if l2.waveform2 != Default::default() {
                    l2.waveform2
                } else {
                    l2.waveform
                },
                phi1,
            ) * final_dca2;
            mix_a = s1;
            mix_b = s2p;
        }
        _ => { /* L1+L2, L1, L2 — keep s1/s2 */ }
    }

    let sample = match p.mod_mode {
        ModMode::Ring => mix_a * mix_b * 4.0,
        ModMode::Noise => {
            // Deterministic pseudo-noise: use a simple bit pattern based on phi
            // In the JS this is Math.random() * 2 - 1; we use a deterministic substitute.
            // This will be replaced with a proper PRNG when available.
            let noise = sinf(phi1 * 12_345.679) * 2.0 - 1.0; // placeholder
            let mixed = match p.line_select {
                LineSelect::L1 => mix_a,
                LineSelect::L2 => mix_b,
                _ => (mix_a + mix_b) * 0.5,
            };
            mixed + mixed * noise * 0.5
        }
        ModMode::Normal => match p.line_select {
            LineSelect::L1 => mix_a,
            LineSelect::L2 => mix_b,
            _ => (mix_a + mix_b) * 0.5,
        },
    };

    // -----------------------------------------------------------------------
    // Biquad filter (Direct Form I)
    // -----------------------------------------------------------------------
    let sample = if p.filter.enabled {
        let f = &p.filter;

        // LFO filter-cutoff modulation
        let lfo_filter_mod = if p.lfo.enabled && p.lfo.target == LfoTarget::Filter {
            lfo_mod_val * p.lfo.depth
        } else {
            0.0
        };

        let fc = (f.cutoff * (1.0 + f.env_amount * dcw1) * (1.0 + lfo_filter_mod))
            .clamp(20.0, sr * 0.49);

        let res = if f.resonance < 0.001 {
            0.001
        } else {
            f.resonance
        };
        let w0 = TWO_PI * fc / sr;
        let cos_w0 = cosf(w0);
        let sin_w0 = sinf(w0);
        let alpha = sin_w0 / (2.0 * res);

        let (b0, b1, b2) = match f.filter_type {
            FilterType::Lp => ((1.0 - cos_w0) / 2.0, 1.0 - cos_w0, (1.0 - cos_w0) / 2.0),
            FilterType::Hp => ((1.0 + cos_w0) / 2.0, -(1.0 + cos_w0), (1.0 + cos_w0) / 2.0),
            FilterType::Bp => (alpha, 0.0, -alpha),
        };
        let a0 = 1.0 + alpha;
        let a1_coef = -2.0 * cos_w0;
        let a2_coef = 1.0 - alpha;
        let norm = 1.0 / a0;

        // Direct Form I:
        // filterState: [x[n-1], x[n-2], y[n-1], y[n-2]]
        let yn = norm
            * (b0 * sample + b1 * voice.filter_state1[0] + b2 * voice.filter_state1[1]
                - a1_coef * voice.filter_state1[2]
                - a2_coef * voice.filter_state1[3]);

        voice.filter_state1[1] = voice.filter_state1[0];
        voice.filter_state1[0] = sample;
        voice.filter_state1[3] = voice.filter_state1[2];
        voice.filter_state1[2] = yn;

        if yn.is_finite() {
            yn
        } else {
            0.0
        }
    } else {
        sample
    };

    // -----------------------------------------------------------------------
    // Phase advance
    // -----------------------------------------------------------------------
    voice.phi1 += effective_freq1 / sr;
    voice.phi2 += effective_freq2 / sr;
    voice.pm_phi += pm_delta;
    if voice.phi1 >= 1.0 {
        voice.phi1 -= 1.0;
    }
    if voice.phi2 >= 1.0 {
        voice.phi2 -= 1.0;
    }
    if voice.pm_phi >= 1.0 {
        voice.pm_phi -= 1.0;
    }

    sample
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

#[inline(always)]
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Simple LCG PRNG — produces a value in [-1.0, 1.0].
///
/// Parameters from Numerical Recipes (Knuth): multiplier 1664525, increment 1013904223.
#[inline(always)]
pub fn lcg_rand(state: &mut u32) -> f32 {
    *state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
    // Map top 16 bits to [-1.0, 1.0]
    let bits = (*state >> 16) as f32;
    bits / 32767.5 - 1.0
}
