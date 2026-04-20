/// Per-voice state and sample rendering for the Cosmo PD-101 engine.
///
/// Ported from `createVoice` / `renderVoice` in `pdVisualizerProcessor.js`
/// (lines 488-1257).
extern crate alloc;

use libm::{cosf, sinf};

use crate::dsp_utils::{apply_window, lfo_output, wrap01};
use crate::envelope::EnvGen;
use crate::generators;
use crate::generators::karpunk::{self, KarpunkState};
use crate::params::{
    Algo, FilterType, LfoTarget, LfoWaveform, LineParams, LineSelect, ModMode, PortamentoMode,
    SynthParams, VelocityTarget,
};

// TWO_PI for f32
const TWO_PI: f32 = core::f32::consts::PI * 2.0;
const DEFAULT_BASE_FREQ: f32 = 220.0;
const SILENCE_THRESHOLD: f32 = 0.001;

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

#[derive(Debug, Clone, Copy)]
struct EnvelopeSnapshot {
    dco1_env: f32,
    dco2_env: f32,
    dcw1_env: f32,
    dcw2_env: f32,
    dca1: f32,
    dca2: f32,
    dcw1: f32,
    dcw2: f32,
}

#[derive(Debug, Clone, Copy)]
struct SignalState {
    effective_freq1: f32,
    effective_freq2: f32,
    final_dcw1: f32,
    final_dcw2: f32,
    final_dca1: f32,
    final_dca2: f32,
}

#[derive(Debug, Clone, Copy)]
struct PhaseFrame {
    phi1: f32,
    phi2: f32,
    pm_delta: f32,
    phase_a_post: f32,
    phase_b_post: f32,
}

#[derive(Debug, Clone, Copy)]
struct LineRenderConfig {
    primary_algo: Algo,
    secondary_algo: Option<Algo>,
    blend: f32,
    phase: f32,
    window_gain: f32,
    final_dcw: f32,
    final_dca: f32,
    effective_freq: f32,
    sample_rate: f32,
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
    let base_freq = base_voice_frequency(voice);
    let env = advance_envelopes(voice, p, sr);

    if voice.is_silent {
        advance_silent_voice(voice, p, sr, base_freq);
        return 0.0;
    }

    if release_has_faded_out(voice, env) {
        return 0.0;
    }

    let mut signal = build_signal_state(voice, p, &env, base_freq);
    apply_pitch_and_lfo_modulation(
        voice,
        p,
        sr,
        base_freq,
        lfo_mod_val,
        pitch_bend_semitones,
        mod_wheel,
        &mut signal,
    );

    let phase = build_phase_frame(voice, p, sr, base_freq);
    let line1_primary_algo = resolve_primary_algo(l1, voice.cycle_count1);
    let line2_primary_algo = resolve_primary_algo(l2, voice.cycle_count2);
    let window1 = apply_window(phase.phi1, line_window(l1));
    let window2 = apply_window(phase.phi2, line_window(l2));

    let (s1, ks_raw1) = render_line_sample(
        &mut voice.ks_line1,
        LineRenderConfig {
            primary_algo: line1_primary_algo,
            secondary_algo: l1.algo2,
            blend: l1.algo_blend,
            phase: phase.phase_a_post,
            window_gain: window1,
            final_dcw: signal.final_dcw1,
            final_dca: signal.final_dca1,
            effective_freq: signal.effective_freq1,
            sample_rate: sr,
        },
    );
    let (s2, ks_raw2) = render_line_sample(
        &mut voice.ks_line2,
        LineRenderConfig {
            primary_algo: line2_primary_algo,
            secondary_algo: l2.algo2,
            blend: l2.algo_blend,
            phase: phase.phase_b_post,
            window_gain: window2,
            final_dcw: signal.final_dcw2,
            final_dca: signal.final_dca2,
            effective_freq: signal.effective_freq2,
            sample_rate: sr,
        },
    );

    let sample = mix_line_outputs(
        p,
        phase.phi1,
        s1,
        s2,
        l1,
        l2,
        ks_raw1,
        ks_raw2,
        signal.final_dca1,
        signal.final_dca2,
    );
    let sample = apply_filter(sample, voice, p, lfo_mod_val, sr, env.dcw1);

    advance_voice_phase(
        voice,
        sr,
        signal.effective_freq1,
        signal.effective_freq2,
        phase.pm_delta,
    );

    sample
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn base_voice_frequency(voice: &Voice) -> f32 {
    if voice.frequency > 0.0 {
        voice.frequency
    } else {
        DEFAULT_BASE_FREQ
    }
}

fn advance_envelopes(voice: &mut Voice, p: &SynthParams, sr: f32) -> EnvelopeSnapshot {
    let note = voice.env_note;
    let l1 = &p.line1;
    let l2 = &p.line2;

    voice
        .line1_env
        .dco
        .advance(&l1.dco_env, sr, l1.key_follow, note);
    voice
        .line1_env
        .dcw
        .advance(&l1.dcw_env, sr, l1.key_follow, note);
    voice
        .line1_env
        .dca
        .advance(&l1.dca_env, sr, l1.key_follow, note);
    voice
        .line2_env
        .dco
        .advance(&l2.dco_env, sr, l2.key_follow, note);
    voice
        .line2_env
        .dcw
        .advance(&l2.dcw_env, sr, l2.key_follow, note);
    voice
        .line2_env
        .dca
        .advance(&l2.dca_env, sr, l2.key_follow, note);

    EnvelopeSnapshot {
        dco1_env: voice.line1_env.dco.output,
        dco2_env: voice.line2_env.dco.output,
        dcw1_env: voice.line1_env.dcw.output,
        dcw2_env: voice.line2_env.dcw.output,
        dca1: voice.line1_env.dca.output,
        dca2: voice.line2_env.dca.output,
        dcw1: l1.dcw_base * voice.line1_env.dcw.output,
        dcw2: l2.dcw_base * voice.line2_env.dcw.output,
    }
}

fn advance_silent_voice(voice: &mut Voice, p: &SynthParams, sr: f32, base_freq: f32) {
    let freq1 = line_frequency(base_freq, &p.line1, 0.0);
    let freq2 = line_frequency(base_freq, &p.line2, 0.0);
    let pm_delta = (base_freq * p.int_pm_ratio) / sr;

    advance_voice_phase(voice, sr, freq1, freq2, pm_delta);
}

fn release_has_faded_out(voice: &mut Voice, env: EnvelopeSnapshot) -> bool {
    if !voice.is_releasing
        || libm::fabsf(env.dca1) >= SILENCE_THRESHOLD
        || libm::fabsf(env.dca2) >= SILENCE_THRESHOLD
    {
        return false;
    }

    voice.is_silent = true;
    voice.note = None;
    voice.env_note = 60;
    voice.line1_env.dca.output = 0.0;
    voice.line2_env.dca.output = 0.0;
    true
}

fn build_signal_state(
    voice: &Voice,
    p: &SynthParams,
    env: &EnvelopeSnapshot,
    base_freq: f32,
) -> SignalState {
    let l1 = &p.line1;
    let l2 = &p.line2;
    let compensated_dca1 = compensated_dca_level(l1, env.dca1, env.dcw1_env);
    let compensated_dca2 = compensated_dca_level(l2, env.dca2, env.dcw2_env);
    let vel = voice.velocity;
    let vel_amp = match p.velocity_target {
        VelocityTarget::Amp | VelocityTarget::Both => vel,
        _ => 1.0,
    };
    let vel_dcw = match p.velocity_target {
        VelocityTarget::Dcw | VelocityTarget::Both => vel,
        _ => 1.0,
    };

    SignalState {
        effective_freq1: line_frequency(base_freq, l1, env.dco1_env),
        effective_freq2: line_frequency(base_freq, l2, env.dco2_env),
        final_dcw1: env.dcw1 * vel_dcw,
        final_dcw2: env.dcw2 * vel_dcw,
        final_dca1: compensated_dca1 * vel_amp,
        final_dca2: compensated_dca2 * vel_amp,
    }
}

fn compensated_dca_level(line: &LineParams, dca_env: f32, dcw_env: f32) -> f32 {
    let dca_level = line.dca_base * dca_env;
    dca_level * (1.0 - line.dcw_comp + line.dcw_comp * dcw_env)
}

fn line_frequency(base_freq: f32, line: &LineParams, dco_env: f32) -> f32 {
    base_freq
        * libm::powf(2.0, line.octave + line.detune_cents / 1200.0)
        * libm::powf(2.0, (line.dco_depth * dco_env) / 12.0)
}

fn apply_pitch_and_lfo_modulation(
    voice: &mut Voice,
    p: &SynthParams,
    sr: f32,
    base_freq: f32,
    lfo_mod_val: f32,
    pitch_bend_semitones: f32,
    mod_wheel: f32,
    signal: &mut SignalState,
) {
    apply_portamento(voice, &p.portamento, sr, base_freq, signal);
    apply_pitch_bend(pitch_bend_semitones, signal);
    apply_vibrato(voice, p, sr, mod_wheel, signal);
    apply_global_lfo(p, lfo_mod_val, signal);
}

fn apply_portamento(
    voice: &mut Voice,
    port: &crate::params::PortamentoParams,
    sr: f32,
    base_freq: f32,
    signal: &mut SignalState,
) {
    if !port.enabled || (voice.target_freq - voice.current_freq).abs() <= 1e-6 {
        return;
    }

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
    signal.effective_freq1 *= ratio;
    signal.effective_freq2 *= ratio;
}

fn apply_pitch_bend(pitch_bend_semitones: f32, signal: &mut SignalState) {
    if pitch_bend_semitones == 0.0 {
        return;
    }

    let bend_ratio = libm::powf(2.0, pitch_bend_semitones / 12.0);
    signal.effective_freq1 *= bend_ratio;
    signal.effective_freq2 *= bend_ratio;
}

fn apply_vibrato(
    voice: &mut Voice,
    p: &SynthParams,
    sr: f32,
    mod_wheel: f32,
    signal: &mut SignalState,
) {
    let vibrato = &p.vibrato;
    if !vibrato.enabled {
        return;
    }

    if voice.vibrato_delay_counter > 0 {
        voice.vibrato_delay_counter -= 1;
        return;
    }

    voice.vibrato_phase += (vibrato.rate * 0.1) / sr;
    if voice.vibrato_phase >= 1.0 {
        voice.vibrato_phase -= 1.0;
    }

    let vib_waveform = vibrato_waveform(vibrato.waveform);
    let lfo_val = lfo_output(voice.vibrato_phase, vib_waveform);
    let effective_depth = vibrato.depth + mod_wheel * p.mod_wheel_vibrato_depth;
    let pitch_mod = 1.0 + lfo_val * (effective_depth / 1000.0);
    signal.effective_freq1 *= pitch_mod;
    signal.effective_freq2 *= pitch_mod;
}

fn vibrato_waveform(waveform: u8) -> LfoWaveform {
    match waveform {
        2 => LfoWaveform::Triangle,
        3 => LfoWaveform::Square,
        4 => LfoWaveform::Saw,
        _ => LfoWaveform::Sine,
    }
}

fn apply_global_lfo(p: &SynthParams, lfo_mod_val: f32, signal: &mut SignalState) {
    let lfo_offset = p.lfo.offset;
    if lfo_mod_val == 0.0 && lfo_offset == 0.0 {
        return;
    }

    let mod_val = lfo_mod_val * p.lfo.depth + lfo_offset;
    match p.lfo.target {
        LfoTarget::Pitch => {
            signal.effective_freq1 *= 1.0 + mod_val;
            signal.effective_freq2 *= 1.0 + mod_val;
        }
        LfoTarget::Dcw => {
            signal.final_dcw1 = (signal.final_dcw1 + mod_val).clamp(0.0, 1.0);
            signal.final_dcw2 = (signal.final_dcw2 + mod_val).clamp(0.0, 1.0);
        }
        LfoTarget::Dca => {
            signal.final_dca1 = (signal.final_dca1 * (1.0 + mod_val)).max(0.0);
            signal.final_dca2 = (signal.final_dca2 * (1.0 + mod_val)).max(0.0);
        }
        LfoTarget::Filter => {}
    }
}

fn build_phase_frame(voice: &Voice, p: &SynthParams, sr: f32, base_freq: f32) -> PhaseFrame {
    let pm_delta = (base_freq * p.int_pm_ratio) / sr;
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

    PhaseFrame {
        phi1,
        phi2,
        pm_delta,
        phase_a_post: wrap01(if p.pm_pre {
            phase_a_input
        } else {
            phase_a_input + pm_mod
        }),
        phase_b_post: wrap01(if p.pm_pre {
            phase_b_input
        } else {
            phase_b_input + pm_mod
        }),
    }
}

fn resolve_primary_algo(line: &LineParams, cycle_count: u32) -> Algo {
    if !line.algo.is_cz_waveform() {
        return line.algo;
    }

    let slot = if cycle_count & 1 == 0 {
        line.cz.slot_a_waveform
    } else {
        line.cz.slot_b_waveform
    };
    Algo::from_cz_waveform(slot)
}

fn line_window(line: &LineParams) -> crate::params::WindowType {
    if line.algo.is_cz_waveform() {
        line.cz.window
    } else {
        line.window
    }
}

fn render_line_sample(ks_state: &mut KarpunkState, config: LineRenderConfig) -> (f32, Option<f32>) {
    let ks_raw = if karpunk::requires_state_tick(config.primary_algo, config.secondary_algo) {
        Some(ks_state.advance(config.effective_freq, config.sample_rate, config.final_dcw))
    } else {
        None
    };

    let sample = if let Some(secondary_algo) = config.secondary_algo {
        let secondary_dcw = config.final_dcw * config.blend;
        let primary_dcw = config.final_dcw * (1.0 - config.blend);
        let primary =
            generators::render_algo_sample(config.primary_algo, config.phase, primary_dcw, ks_raw);
        let secondary =
            generators::render_algo_sample(secondary_algo, config.phase, secondary_dcw, ks_raw);
        karpunk::blend(config.primary_algo, primary, secondary, config.blend)
    } else {
        generators::render_algo_sample(config.primary_algo, config.phase, config.final_dcw, ks_raw)
    };

    (sample * config.window_gain * config.final_dca, ks_raw)
}

fn mix_line_outputs(
    p: &SynthParams,
    phi1: f32,
    s1: f32,
    s2: f32,
    l1: &LineParams,
    l2: &LineParams,
    ks_raw1: Option<f32>,
    ks_raw2: Option<f32>,
    final_dca1: f32,
    final_dca2: f32,
) -> f32 {
    let (mix_a, mix_b) = select_line_sources(
        p, phi1, s1, s2, l1, l2, ks_raw1, ks_raw2, final_dca1, final_dca2,
    );

    match p.mod_mode {
        ModMode::Ring => mix_a * mix_b * 4.0,
        ModMode::Noise => {
            // Placeholder noise remains deterministic so renders stay repeatable.
            let noise = sinf(phi1 * 12_345.679) * 2.0 - 1.0;
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
    }
}

fn select_line_sources(
    p: &SynthParams,
    phi1: f32,
    s1: f32,
    s2: f32,
    l1: &LineParams,
    l2: &LineParams,
    ks_raw1: Option<f32>,
    ks_raw2: Option<f32>,
    final_dca1: f32,
    final_dca2: f32,
) -> (f32, f32) {
    match p.line_select {
        LineSelect::L1PlusL1Prime => {
            let algo_prime = l1.algo2.unwrap_or(l1.algo);
            let s1_prime =
                generators::render_algo_sample(algo_prime, phi1, 0.0, ks_raw1) * final_dca1;
            (s1, s1_prime)
        }
        LineSelect::L1PlusL2Prime => {
            let algo_prime = l2.algo2.unwrap_or(l2.algo);
            let s2_prime =
                generators::render_algo_sample(algo_prime, phi1, 0.0, ks_raw2) * final_dca2;
            (s1, s2_prime)
        }
        _ => (s1, s2),
    }
}

fn apply_filter(
    sample: f32,
    voice: &mut Voice,
    p: &SynthParams,
    lfo_mod_val: f32,
    sr: f32,
    dcw1: f32,
) -> f32 {
    if !p.filter.enabled {
        return sample;
    }

    let filter = &p.filter;
    let lfo_filter_mod = if p.lfo.enabled && p.lfo.target == LfoTarget::Filter {
        lfo_mod_val * p.lfo.depth
    } else {
        0.0
    };
    let cutoff = (filter.cutoff * (1.0 + filter.env_amount * dcw1) * (1.0 + lfo_filter_mod))
        .clamp(20.0, sr * 0.49);
    let resonance = filter.resonance.max(0.001);
    let w0 = TWO_PI * cutoff / sr;
    let cos_w0 = cosf(w0);
    let sin_w0 = sinf(w0);
    let alpha = sin_w0 / (2.0 * resonance);

    let (b0, b1, b2) = match filter.filter_type {
        FilterType::Lp => ((1.0 - cos_w0) / 2.0, 1.0 - cos_w0, (1.0 - cos_w0) / 2.0),
        FilterType::Hp => ((1.0 + cos_w0) / 2.0, -(1.0 + cos_w0), (1.0 + cos_w0) / 2.0),
        FilterType::Bp => (alpha, 0.0, -alpha),
    };
    let norm = 1.0 / (1.0 + alpha);
    let a1_coef = -2.0 * cos_w0;
    let a2_coef = 1.0 - alpha;

    // Direct Form I history layout: [x[n-1], x[n-2], y[n-1], y[n-2]].
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
}

fn advance_voice_phase(
    voice: &mut Voice,
    sr: f32,
    effective_freq1: f32,
    effective_freq2: f32,
    pm_delta: f32,
) {
    voice.phi1 += effective_freq1 / sr;
    voice.phi2 += effective_freq2 / sr;
    voice.pm_phi += pm_delta;
    wrap_voice_phase(&mut voice.phi1, &mut voice.cycle_count1);
    wrap_voice_phase(&mut voice.phi2, &mut voice.cycle_count2);
    if voice.pm_phi >= 1.0 {
        voice.pm_phi -= 1.0;
    }
}

fn wrap_voice_phase(phase: &mut f32, cycle_count: &mut u32) {
    while *phase >= 1.0 {
        *phase -= 1.0;
        *cycle_count = cycle_count.wrapping_add(1);
    }
}
