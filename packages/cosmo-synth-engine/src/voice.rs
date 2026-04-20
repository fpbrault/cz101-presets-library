/// Per-voice state and sample rendering for the Cosmo PD-101 engine.
///
/// Ported from `createVoice` / `renderVoice` in `pdVisualizerProcessor.js`
/// (lines 488-1257).
extern crate alloc;

use libm::{cosf, sinf};

use crate::envelope::EnvGen;
use crate::generators;
use crate::generators::karpunk::{self, KarpunkState};
use crate::dsp_utils::{apply_window, lfo_output, wrap01};
use crate::params::{
    FilterType, LfoTarget, LineSelect, ModMode, PortamentoMode, SynthParams, VelocityTarget,
    Algo,
};

// TWO_PI for f32
const TWO_PI: f32 = core::f32::consts::PI * 2.0;

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
    pub cycle_count1: u32,
    pub cycle_count2: u32,
    pub pm_phi: f32,
    pub vibrato_phase: f32,
    pub vibrato_delay_counter: u32,
    pub current_freq: f32,
    pub target_freq: f32,
    pub glide_progress: f32,
    pub glide_start_freq: f32,
    pub is_releasing: bool,
    pub is_silent: bool,
    pub sustained: bool,
    pub gate_was_open: bool,
    pub note: Option<u8>,
    pub env_note: u8, // <-- ADD THIS
    pub frequency: f32,
    pub velocity: f32,

    pub line1_env: LineEnvs,
    pub line2_env: LineEnvs,

    pub filter_state1: [f32; 4],
    pub filter_state2: [f32; 4],

    // Per-line Karplus-Strong engines for Karpunk.
    pub ks_line1: KarpunkState,
    pub ks_line2: KarpunkState,
}

impl Voice {
    pub fn new() -> Self {
        Self {
            phi1: 0.0,
            phi2: 0.0,
            cycle_count1: 0,
            cycle_count2: 0,
            pm_phi: 0.0,
            vibrato_phase: 0.0,
            vibrato_delay_counter: 0,
            current_freq: 0.0,
            target_freq: 0.0,
            glide_progress: 0.0,
            glide_start_freq: 0.0,
            is_releasing: false,
            is_silent: true,
            sustained: false,
            gate_was_open: false,
            env_note: 60,
            note: None,
            frequency: 0.0,
            velocity: 1.0,
            line1_env: LineEnvs::default(),
            line2_env: LineEnvs::default(),
            filter_state1: [0.0; 4],
            filter_state2: [0.0; 4],
            ks_line1: KarpunkState::default(),
            ks_line2: KarpunkState::new(karpunk::DEFAULT_PRNG_SEED ^ 0x9e37_79b9),
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
    let note_u8 = voice.env_note;

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
        while voice.phi1 >= 1.0 {
            voice.phi1 -= 1.0;
            voice.cycle_count1 = voice.cycle_count1.wrapping_add(1);
        }
        while voice.phi2 >= 1.0 {
            voice.phi2 -= 1.0;
            voice.cycle_count2 = voice.cycle_count2.wrapping_add(1);
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
        voice.env_note = 60;
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
    let port = &p.portamento;
    if port.enabled && (voice.target_freq - voice.current_freq).abs() > 1e-6 {
        match port.mode {
            PortamentoMode::Rate => {
                let t = (port.rate / 99.0).clamp(0.0, 1.0);
                let time_const = 3.0 * (1.0 - t) * (1.0 - t) + 0.001;
                let alpha = 1.0 - libm::expf(-1.0 / (time_const * sr));
                voice.current_freq += (voice.target_freq - voice.current_freq) * alpha;
            }
            PortamentoMode::Time => {
                voice.glide_progress += 1.0 / (port.time * sr);
                if voice.glide_progress >= 1.0 {
                    voice.current_freq = voice.target_freq;
                } else {
                    let t = voice.glide_progress;
                    voice.current_freq =
                        voice.glide_start_freq + (voice.target_freq - voice.glide_start_freq) * t;
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
            voice.vibrato_phase += (vibrato.rate * 0.1) / sr;
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
    let lfo_offset = p.lfo.offset;
    if lfo_mod_val != 0.0 || lfo_offset != 0.0 {
        let lfo = &p.lfo;
        let mod_val = lfo_mod_val * lfo.depth + lfo_offset;
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

    let phase_a_post = wrap01(if p.pm_pre {
        phase_a_input
    } else {
        phase_a_input + pm_mod
    });
    let phase_b_post = wrap01(if p.pm_pre {
        phase_b_input
    } else {
        phase_b_input + pm_mod
    });

    let line1_primary_algo = if l1.algo.is_cz_waveform() {
        let slot = if voice.cycle_count1 & 1 == 0 {
            l1.cz.slot_a_waveform
        } else {
            l1.cz.slot_b_waveform
        };
        Algo::from_cz_waveform(slot)
    } else {
        l1.algo
    };
    let line2_primary_algo = if l2.algo.is_cz_waveform() {
        let slot = if voice.cycle_count2 & 1 == 0 {
            l2.cz.slot_a_waveform
        } else {
            l2.cz.slot_b_waveform
        };
        Algo::from_cz_waveform(slot)
    } else {
        l2.algo
    };

    let w1 = apply_window(phi1, if l1.algo.is_cz_waveform() { l1.cz.window } else { l1.window });
    let w2 = apply_window(phi2, if l2.algo.is_cz_waveform() { l2.cz.window } else { l2.window });

    // -----------------------------------------------------------------------
    // Line 1 signal
    // -----------------------------------------------------------------------

    let ks_raw1 = if karpunk::requires_state_tick(line1_primary_algo, algo2a) {
        Some(voice.ks_line1.advance(effective_freq1, sr, final_dcw1))
    } else {
        None
    };

    let s1 = if let Some(a2) = algo2a {
        // Dual-algorithm blending — either or both algos may be Karpunk.
        let dcw2a = final_dcw1 * blend_a;
        let dcw1_effective = final_dcw1 * (1.0 - blend_a);

        let sig_a1 = generators::render_algo_sample(line1_primary_algo, phase_a_post, dcw1_effective, ks_raw1);

        let sig_a2 = generators::render_algo_sample(a2, phase_a_post, dcw2a, ks_raw1);

        let combined_a = karpunk::blend(line1_primary_algo, sig_a1, sig_a2, blend_a);
        combined_a * w1 * final_dca1
    } else {
        generators::render_algo_sample(line1_primary_algo, phase_a_post, final_dcw1, ks_raw1)
            * w1
            * final_dca1
    };

    // -----------------------------------------------------------------------
    // Line 2 signal
    // -----------------------------------------------------------------------

    let ks_raw2 = if karpunk::requires_state_tick(line2_primary_algo, algo2b) {
        Some(voice.ks_line2.advance(effective_freq2, sr, final_dcw2))
    } else {
        None
    };

    let s2 = if let Some(a2) = algo2b {
        // Dual-algorithm blending — either or both algos may be Karpunk.
        let dcw2b = final_dcw2 * blend_b;
        let dcw1_effective_b = final_dcw2 * (1.0 - blend_b);

        let sig_b1 = generators::render_algo_sample(line2_primary_algo, phase_b_post, dcw1_effective_b, ks_raw2);

        let sig_b2 = generators::render_algo_sample(a2, phase_b_post, dcw2b, ks_raw2);

        let combined_b = karpunk::blend(line2_primary_algo, sig_b1, sig_b2, blend_b);
        combined_b * w2 * final_dca2
    } else {
        generators::render_algo_sample(line2_primary_algo, phase_b_post, final_dcw2, ks_raw2)
            * w2
            * final_dca2
    };

    // -----------------------------------------------------------------------
    // Line select + modulation mode mixing
    // -----------------------------------------------------------------------
    let mut mix_a = s1;
    let mut mix_b = s2;

    match p.line_select {
        LineSelect::L1PlusL1Prime => {
            let algo_prime = l1.algo2.unwrap_or(l1.algo);
            let s1p = generators::render_algo_sample(algo_prime, phi1, 0.0, ks_raw1) * final_dca1;
            mix_a = s1;
            mix_b = s1p;
        }
        LineSelect::L1PlusL2Prime => {
            let algo_prime = l2.algo2.unwrap_or(l2.algo);
            let s2p = generators::render_algo_sample(algo_prime, phi1, 0.0, ks_raw2) * final_dca2;
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
    while voice.phi1 >= 1.0 {
        voice.phi1 -= 1.0;
        voice.cycle_count1 = voice.cycle_count1.wrapping_add(1);
    }
    while voice.phi2 >= 1.0 {
        voice.phi2 -= 1.0;
        voice.cycle_count2 = voice.cycle_count2.wrapping_add(1);
    }
    if voice.pm_phi >= 1.0 {
        voice.pm_phi -= 1.0;
    }

    sample
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

