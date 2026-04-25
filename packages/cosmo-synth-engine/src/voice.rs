/// Per-voice state and sample rendering for the Cosmo PD-101 engine.
///
/// Ported from `createVoice` / `renderVoice` in `pdVisualizerProcessor.js`
/// (lines 488-1257).
extern crate alloc;

use libm::{cosf, sinf};

use crate::dsp_utils::{lfo_output, wrap01};
use crate::envelope::{EnvGen, EnvelopeKind};
use crate::generators::{self, AlgoRuntimeState, LineRenderConfig};
use crate::params::{
    FilterType, LfoWaveform, LineParams, LineSelect, ModDestination, ModEnvParams, ModMatrix,
    ModMode, ModSource, PortamentoMode, SynthParams, 
};

// TWO_PI for f32
const TWO_PI: f32 = core::f32::consts::PI * 2.0;
const DEFAULT_BASE_FREQ: f32 = 220.0;
const SILENCE_THRESHOLD: f32 = 0.001;

// ---------------------------------------------------------------------------
// ADSR modulation envelope
// ---------------------------------------------------------------------------

/// Phase state for the per-voice ADSR mod envelope.
#[derive(Debug, Clone, Default, PartialEq)]
enum AdsrPhase {
    #[default]
    Idle,
    Attack,
    Decay,
    Sustain,
    Release,
}

/// Simple ADSR envelope used as a modulation source.
#[derive(Debug, Clone, Default)]
pub struct AdsrEnv {
    phase: AdsrPhase,
    pub output: f32,
    release_start: f32,
}

impl AdsrEnv {
    /// Trigger attack — starts or retriggers from the current output level.
    pub fn note_on(&mut self) {
        self.phase = AdsrPhase::Attack;
    }

    /// Begin the release stage from the current output level.
    pub fn note_off(&mut self) {
        self.release_start = self.output;
        self.phase = AdsrPhase::Release;
    }

    /// Reset to idle (silent) state.
    pub fn reset(&mut self) {
        self.phase = AdsrPhase::Idle;
        self.output = 0.0;
        self.release_start = 0.0;
    }

    /// Advance the envelope by one sample and return the current output [0, 1].
    pub fn advance(&mut self, p: &ModEnvParams, sr: f32) -> f32 {
        match self.phase {
            AdsrPhase::Idle => {
                self.output = 0.0;
            }
            AdsrPhase::Attack => {
                let rate = if p.attack > 0.0 {
                    1.0 / (p.attack * sr)
                } else {
                    1.0
                };
                self.output = (self.output + rate).min(1.0);
                if self.output >= 1.0 {
                    self.phase = AdsrPhase::Decay;
                }
            }
            AdsrPhase::Decay => {
                let range = 1.0 - p.sustain;
                let rate = if p.decay > 0.0 && range > 0.0 {
                    range / (p.decay * sr)
                } else {
                    range
                };
                self.output = (self.output - rate).max(p.sustain);
                if self.output <= p.sustain {
                    self.output = p.sustain;
                    self.phase = AdsrPhase::Sustain;
                }
            }
            AdsrPhase::Sustain => {
                self.output = p.sustain;
            }
            AdsrPhase::Release => {
                if self.release_start <= 0.0 {
                    self.output = 0.0;
                    self.phase = AdsrPhase::Idle;
                } else {
                    let rate = if p.release > 0.0 {
                        self.release_start / (p.release * sr)
                    } else {
                        self.release_start
                    };
                    self.output = (self.output - rate).max(0.0);
                    if self.output <= 0.0 {
                        self.output = 0.0;
                        self.phase = AdsrPhase::Idle;
                    }
                }
            }
        }
        self.output
    }
}

// ---------------------------------------------------------------------------
// Modulation helpers
// ---------------------------------------------------------------------------

/// Pre-computed modulation source values for one render call.
#[derive(Debug, Clone, Copy)]
pub(crate) struct ModSources {
    pub lfo1: f32,
    pub lfo2: f32,
    pub random: f32,
    pub mod_env: f32,
    pub velocity: f32,
    pub mod_wheel: f32,
    /// Aftertouch — stub, always 0.0 this phase.
    pub aftertouch: f32,
}

impl ModSources {
    fn new(
        lfo1: f32,
        lfo2: f32,
        random: f32,
        mod_env: f32,
        velocity: f32,
        mod_wheel: f32,
        aftertouch: f32,
    ) -> Self {
        Self {
            lfo1,
            lfo2,
            random,
            mod_env,
            velocity,
            mod_wheel,
            aftertouch,
        }
    }

    fn source_value(&self, source: ModSource) -> f32 {
        match source {
            ModSource::Lfo1 => self.lfo1,
            ModSource::Lfo2 => self.lfo2,
            ModSource::Random => self.random,
            ModSource::ModEnv => self.mod_env,
            ModSource::Velocity => self.velocity,
            ModSource::ModWheel => self.mod_wheel,
            ModSource::Aftertouch => self.aftertouch,
        }
    }
}

/// Sum all enabled routes targeting `dest`, clamping the total to [-1, 1].
fn mod_value_for(dest: ModDestination, matrix: &ModMatrix, sources: &ModSources) -> f32 {
    let mut total = 0.0_f32;
    for route in &matrix.routes {
        if route.enabled && route.destination == dest {
            total += route.amount * sources.source_value(route.source);
        }
    }
    total.clamp(-1.0, 1.0)
}

fn algo_param_slot_mods_for_line(
    line_index: u8,
    matrix: &ModMatrix,
    sources: &ModSources,
) -> [f32; 8] {
    let destinations = if line_index == 2 {
        [
            ModDestination::Line2AlgoParam1,
            ModDestination::Line2AlgoParam2,
            ModDestination::Line2AlgoParam3,
            ModDestination::Line2AlgoParam4,
            ModDestination::Line2AlgoParam5,
            ModDestination::Line2AlgoParam6,
            ModDestination::Line2AlgoParam7,
            ModDestination::Line2AlgoParam8,
        ]
    } else {
        [
            ModDestination::Line1AlgoParam1,
            ModDestination::Line1AlgoParam2,
            ModDestination::Line1AlgoParam3,
            ModDestination::Line1AlgoParam4,
            ModDestination::Line1AlgoParam5,
            ModDestination::Line1AlgoParam6,
            ModDestination::Line1AlgoParam7,
            ModDestination::Line1AlgoParam8,
        ]
    };

    let mut out = [0.0_f32; 8];
    for (idx, dest) in destinations.iter().enumerate() {
        out[idx] = mod_value_for(*dest, matrix, sources);
    }
    out
}
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
    pub env_note: u8,
    pub frequency: f32,
    pub velocity: f32,

    pub line1_env: LineEnvs,
    pub line2_env: LineEnvs,

    pub filter_state1: [f32; 4],
    pub filter_state2: [f32; 4],

    /// ADSR mod envelope used as a modulation source.
    pub mod_env: AdsrEnv,

    /// Per-voice runtime state owned by generator algorithms.
    pub algo_runtime: AlgoRuntimeState,
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
            mod_env: AdsrEnv::default(),
            algo_runtime: AlgoRuntimeState::default(),
        }
    }

    /// Reset all envelope generators to their initial state.
    pub fn reset_envs(&mut self) {
        self.line1_env.dco.reset();
        self.line1_env.dcw.reset();
        self.line1_env.dca.reset();
        self.line2_env.dco.reset();
        self.line2_env.dcw.reset();
        self.line2_env.dca.reset();
        self.mod_env.reset();
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
/// * `lfo2_mod_val` – pre-computed LFO2 output value for this sample
/// * `sr`          – sample rate in Hz
pub fn render_voice(
    voice: &mut Voice,
    p: &SynthParams,
    lfo_mod_val: f32,
    lfo2_mod_val: f32,
    random_mod_val: f32,
    sr: f32,
    pitch_bend_semitones: f32,
    mod_wheel: f32,
    aftertouch: f32,
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

    // Advance per-voice ADSR mod envelope.
    let mod_env_val = voice.mod_env.advance(&p.mod_env, sr);

    let mod_sources = ModSources::new(
        lfo_mod_val,
        lfo2_mod_val,
        random_mod_val,
        mod_env_val,
        voice.velocity,
        mod_wheel,
        aftertouch,
    );
    let line1_algo_param_mods = algo_param_slot_mods_for_line(1, &p.mod_matrix, &mod_sources);
    let line2_algo_param_mods = algo_param_slot_mods_for_line(2, &p.mod_matrix, &mod_sources);
    let mut signal = build_signal_state(p, &env, base_freq, &mod_sources);
    apply_pitch_and_lfo_modulation(
        voice,
        p,
        sr,
        base_freq,
        pitch_bend_semitones,
        mod_wheel,
        &mod_sources,
        &mut signal,
    );

    let phase = build_phase_frame(voice, p, sr, base_freq, &mod_sources);
    let (s1, ks_raw1) = voice.algo_runtime.render_line1(LineRenderConfig::from_line(
        l1,
        voice.cycle_count1,
        phase.phi1,
        phase.phase_a_post,
        signal.final_dcw1,
        signal.final_dca1,
        signal.effective_freq1,
        sr,
        line1_algo_param_mods,
    ));
    let (s2, ks_raw2) = voice.algo_runtime.render_line2(LineRenderConfig::from_line(
        l2,
        voice.cycle_count2,
        phase.phi2,
        phase.phase_b_post,
        signal.final_dcw2,
        signal.final_dca2,
        signal.effective_freq2,
        sr,
        line2_algo_param_mods,
    ));

    let sample = mix_line_outputs(
        p,
        phase.phi1,
        s1,
        s2,
        l1,
        l2,
        voice.cycle_count1,
        voice.cycle_count2,
        ks_raw1,
        ks_raw2,
        signal.final_dca1,
        signal.final_dca2,
        line1_algo_param_mods,
        line2_algo_param_mods,
    );
    let sample = apply_filter(sample, voice, p, sr, env.dcw1, &mod_sources);

    // Apply volume modulation from mod matrix
    let volume_mod = mod_value_for(ModDestination::Volume, &p.mod_matrix, &mod_sources);
    let sample = sample * (1.0 + volume_mod);

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
        .advance(EnvelopeKind::Dco, &l1.dco_env, sr, l1.key_follow, note);
    voice
        .line1_env
        .dcw
        .advance(EnvelopeKind::Dcw, &l1.dcw_env, sr, l1.key_follow, note);
    voice
        .line1_env
        .dca
        .advance(EnvelopeKind::Dca, &l1.dca_env, sr, l1.key_follow, note);
    voice
        .line2_env
        .dco
        .advance(EnvelopeKind::Dco, &l2.dco_env, sr, l2.key_follow, note);
    voice
        .line2_env
        .dcw
        .advance(EnvelopeKind::Dcw, &l2.dcw_env, sr, l2.key_follow, note);
    voice
        .line2_env
        .dca
        .advance(EnvelopeKind::Dca, &l2.dca_env, sr, l2.key_follow, note);

    EnvelopeSnapshot {
        dco1_env: voice.line1_env.dco.output,
        dco2_env: voice.line2_env.dco.output,
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
    voice.mod_env.reset();
    true
}

fn build_signal_state(
    p: &SynthParams,
    env: &EnvelopeSnapshot,
    base_freq: f32,
    sources: &ModSources,
) -> SignalState {
    let l1 = &p.line1;
    let l2 = &p.line2;
    let matrix = &p.mod_matrix;
    let dca1_level = l1.dca_base * env.dca1;
    let dca2_level = l2.dca_base * env.dca2;


    // Mod matrix offsets for DCW/DCA
    let dcw1_mod = mod_value_for(ModDestination::Line1DcwBase, matrix, sources);
    let dcw2_mod = mod_value_for(ModDestination::Line2DcwBase, matrix, sources);
    let dca1_mod = mod_value_for(ModDestination::Line1DcaBase, matrix, sources);
    let dca2_mod = mod_value_for(ModDestination::Line2DcaBase, matrix, sources);

    SignalState {
        effective_freq1: line_frequency(base_freq, l1, env.dco1_env),
        effective_freq2: line_frequency(base_freq, l2, env.dco2_env),
        final_dcw1: (env.dcw1 + dcw1_mod).clamp(0.0, 1.0),
        final_dcw2: (env.dcw2 + dcw2_mod).clamp(0.0, 1.0),
        final_dca1: (dca1_level + dca1_mod).max(0.0),
        final_dca2: (dca2_level + dca2_mod).max(0.0),
    }
}

/// Maps a normalized DCO envelope output (0.0–1.0) to a 0.0–1.0 normalized pitch
/// position using the CZ-101 piecewise non-linear pitch curve, then scales by
/// a fixed 36-semitone range to produce the final semitone offset.
///
/// The CZ-101 display levels 0–99 map to pitch as follows:
///   - Levels  0–64: linear, 1 semitone per 8 levels  (max 8 st)
///   - Levels >64: each increment raises pitch by a whole tone (+2 semitones)
///                 (max 8 + 35*2 = 78 st at level 99)
///
/// This function returns a value in [0.0, 1.0] (normalized to the 78-semitone max).
/// The input is clamped to [0.0, 1.0] before conversion.
fn cz_dco_env_normalized(dco_env: f32) -> f32 {
    const MAX_SEMITONES: f32 = 78.0; // 8 + (99 - 64) * 2
    let level = dco_env.clamp(0.0, 1.0) * 99.0;
    let semitones = if level <= 64.0 {
        level / 8.0
    } else {
        8.0 + (level - 64.0) * 2.0
    };
    semitones / MAX_SEMITONES
}

fn line_frequency(base_freq: f32, line: &LineParams, dco_env: f32) -> f32 {
    const DCO_RANGE_SEMITONES: f32 = 36.0;
    let dco_semitones = cz_dco_env_normalized(dco_env) * DCO_RANGE_SEMITONES;
    base_freq
        * libm::powf(2.0, line.octave + line.detune_cents / 1200.0)
        * libm::powf(2.0, dco_semitones / 12.0)
}

fn apply_pitch_and_lfo_modulation(
    voice: &mut Voice,
    p: &SynthParams,
    sr: f32,
    base_freq: f32,
    pitch_bend_semitones: f32,
    mod_wheel: f32,
    sources: &ModSources,
    signal: &mut SignalState,
) {
    apply_portamento(voice, &p.portamento, sr, base_freq, signal);
    apply_pitch_bend(pitch_bend_semitones, signal);
    apply_vibrato(voice, p, sr, mod_wheel, signal);
    // Pitch modulation from mod matrix (additive semitone offset via ratio)
    let pitch_mod = mod_value_for(ModDestination::Pitch, &p.mod_matrix, sources);
    if pitch_mod != 0.0 {
        let ratio = libm::powf(2.0, pitch_mod * 2.0 / 12.0); // ±2 semitones max
        signal.effective_freq1 *= ratio;
        signal.effective_freq2 *= ratio;
    }
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

fn build_phase_frame(
    voice: &Voice,
    p: &SynthParams,
    sr: f32,
    base_freq: f32,
    sources: &ModSources,
) -> PhaseFrame {
    let int_pm_mod = mod_value_for(ModDestination::IntPmAmount, &p.mod_matrix, sources);
    let int_pm_amount = if p.int_pm_enabled {
        (p.int_pm_amount + int_pm_mod).clamp(-1.0, 1.0)
    } else {
        0.0
    };
    let pm_delta = (base_freq * p.int_pm_ratio) / sr;
    let phi1 = wrap01(voice.phi1);
    let phi2 = wrap01(voice.phi2);
    let pm_phi = wrap01(voice.pm_phi);
    let pm_mod = int_pm_amount * 10.0 * sinf(TWO_PI * pm_phi);

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

fn mix_line_outputs(
    p: &SynthParams,
    phi1: f32,
    s1: f32,
    s2: f32,
    l1: &LineParams,
    l2: &LineParams,
    cycle_count1: u32,
    cycle_count2: u32,
    ks_raw1: Option<f32>,
    ks_raw2: Option<f32>,
    final_dca1: f32,
    final_dca2: f32,
    line1_algo_param_mods: [f32; 8],
    line2_algo_param_mods: [f32; 8],
) -> f32 {
    let (mix_a, mix_b) = select_line_sources(
        p,
        phi1,
        s1,
        s2,
        l1,
        l2,
        cycle_count1,
        cycle_count2,
        ks_raw1,
        ks_raw2,
        final_dca1,
        final_dca2,
        line1_algo_param_mods,
        line2_algo_param_mods,
    );

    match p.mod_mode {
        ModMode::Ring => mix_a * mix_b * p.ring_gain.max(0.0),
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
    cycle_count1: u32,
    cycle_count2: u32,
    ks_raw1: Option<f32>,
    ks_raw2: Option<f32>,
    final_dca1: f32,
    final_dca2: f32,
    line1_algo_param_mods: [f32; 8],
    line2_algo_param_mods: [f32; 8],
) -> (f32, f32) {
    match p.line_select {
        LineSelect::L1PlusL1Prime => {
            let cfg = LineRenderConfig::from_line(
                l1,
                cycle_count1,
                phi1,
                phi1,
                0.0,
                final_dca1,
                0.0,
                1.0,
                line1_algo_param_mods,
            );
            let algo_prime = cfg.secondary_algo.unwrap_or(cfg.primary_algo);
            let algo_prime_controls = if cfg.secondary_algo.is_some() {
                cfg.secondary_algo_controls
            } else {
                cfg.primary_algo_controls
            };
            let s1_prime = generators::render_algo_sample(
                algo_prime,
                phi1,
                0.0,
                algo_prime_controls,
                cfg.algo_param_mods,
                ks_raw1,
            ) * final_dca1;
            (s1, s1_prime)
        }
        LineSelect::L1PlusL2Prime => {
            let cfg = LineRenderConfig::from_line(
                l2,
                cycle_count2,
                phi1,
                phi1,
                0.0,
                final_dca2,
                0.0,
                1.0,
                line2_algo_param_mods,
            );
            let algo_prime = cfg.secondary_algo.unwrap_or(cfg.primary_algo);
            let algo_prime_controls = if cfg.secondary_algo.is_some() {
                cfg.secondary_algo_controls
            } else {
                cfg.primary_algo_controls
            };
            let s2_prime = generators::render_algo_sample(
                algo_prime,
                phi1,
                0.0,
                algo_prime_controls,
                cfg.algo_param_mods,
                ks_raw2,
            ) * final_dca2;
            (s1, s2_prime)
        }
        _ => (s1, s2),
    }
}

fn apply_filter(
    sample: f32,
    voice: &mut Voice,
    p: &SynthParams,
    sr: f32,
    dcw1: f32,
    sources: &ModSources,
) -> f32 {
    if !p.filter.enabled {
        return sample;
    }

    let filter = &p.filter;
    let cutoff_mod = mod_value_for(ModDestination::FilterCutoff, &p.mod_matrix, sources);
    let resonance_mod = mod_value_for(ModDestination::FilterResonance, &p.mod_matrix, sources);
    let env_amount_mod = mod_value_for(ModDestination::FilterEnvAmount, &p.mod_matrix, sources);
    let effective_env_amount = (filter.env_amount + env_amount_mod).clamp(-1.0, 1.0);
    let cutoff = (filter.cutoff
        * libm::powf(2.0, cutoff_mod * 4.0) // ±4 octaves max for cutoff mod
        * (1.0 + effective_env_amount * dcw1))
        .clamp(20.0, sr * 0.49);
    let resonance = (filter.resonance + resonance_mod).max(0.001);
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

#[cfg(test)]
mod tests {
    use super::{mod_value_for, ModSources};
    use crate::params::{ModDestination, ModMatrix, ModRoute, ModSource};

    fn all_sources() -> [ModSource; 5] {
        [
            ModSource::Lfo1,
            ModSource::Lfo2,
            ModSource::Velocity,
            ModSource::ModWheel,
            ModSource::Aftertouch,
        ]
    }

    fn all_destinations() -> [ModDestination; 38] {
        [
            ModDestination::Volume,
            ModDestination::Pitch,
            ModDestination::IntPmAmount,
            ModDestination::Line1DcwBase,
            ModDestination::Line1DcaBase,
            ModDestination::Line1AlgoBlend,
            ModDestination::Line1Detune,
            ModDestination::Line1Octave,
            ModDestination::Line1AlgoParam1,
            ModDestination::Line1AlgoParam2,
            ModDestination::Line1AlgoParam3,
            ModDestination::Line1AlgoParam4,
            ModDestination::Line1AlgoParam5,
            ModDestination::Line1AlgoParam6,
            ModDestination::Line1AlgoParam7,
            ModDestination::Line1AlgoParam8,
            ModDestination::Line2DcwBase,
            ModDestination::Line2DcaBase,
            ModDestination::Line2AlgoBlend,
            ModDestination::Line2Detune,
            ModDestination::Line2Octave,
            ModDestination::Line2AlgoParam1,
            ModDestination::Line2AlgoParam2,
            ModDestination::Line2AlgoParam3,
            ModDestination::Line2AlgoParam4,
            ModDestination::Line2AlgoParam5,
            ModDestination::Line2AlgoParam6,
            ModDestination::Line2AlgoParam7,
            ModDestination::Line2AlgoParam8,
            ModDestination::FilterCutoff,
            ModDestination::FilterResonance,
            ModDestination::FilterEnvAmount,
            ModDestination::ChorusMix,
            ModDestination::DelayMix,
            ModDestination::ReverbMix,
            ModDestination::VibratoDepth,
            ModDestination::LfoDepth,
            ModDestination::LfoRate,
        ]
    }

    fn source_value(sources: &ModSources, source: ModSource) -> f32 {
        match source {
            ModSource::Lfo1 => sources.lfo1,
            ModSource::Lfo2 => sources.lfo2,
            ModSource::Velocity => sources.velocity,
            ModSource::ModWheel => sources.mod_wheel,
            ModSource::Aftertouch => sources.aftertouch,
            ModSource::ModEnv => sources.mod_env,
            ModSource::Random => sources.random,
        }
    }

    #[test]
    fn every_source_can_drive_every_destination() {
        let sources = ModSources {
            lfo1: 0.25,
            lfo2: -0.4,
            velocity: 0.8,
            mod_wheel: 0.6,
            aftertouch: 0.3,
            mod_env: 0.5,
            random: -0.2,
        };

        let amount = 0.5;

        for destination in all_destinations() {
            for source in all_sources() {
                let matrix = ModMatrix {
                    routes: vec![ModRoute {
                        source,
                        destination,
                        amount,
                        enabled: true,
                    }],
                };

                let got = mod_value_for(destination, &matrix, &sources);
                let expected = (amount * source_value(&sources, source)).clamp(-1.0, 1.0);
                assert!(
                    (got - expected).abs() < 1e-6,
                    "unexpected route value for source={:?} destination={:?}: got {}, expected {}",
                    source,
                    destination,
                    got,
                    expected
                );
            }
        }
    }

    #[test]
    fn disabled_routes_do_not_contribute() {
        let sources = ModSources {
            lfo1: 0.9,
            lfo2: 0.0,
            velocity: 0.0,
            mod_wheel: 0.0,
            aftertouch: 0.0,
            mod_env: 0.0,
            random: 0.0,
        };
        let destination = ModDestination::Volume;
        let matrix = ModMatrix {
            routes: vec![ModRoute {
                source: ModSource::Lfo1,
                destination,
                amount: 1.0,
                enabled: false,
            }],
        };

        let got = mod_value_for(destination, &matrix, &sources);
        assert_eq!(got, 0.0);
    }

    #[test]
    fn route_sum_is_clamped_to_unit_range() {
        let sources = ModSources {
            lfo1: 1.0,
            lfo2: 1.0,
            velocity: 0.0,
            mod_wheel: 0.0,
            aftertouch: 0.0,
            mod_env: 0.0,
            random: 0.0,
        };
        let destination = ModDestination::Pitch;
        let matrix = ModMatrix {
            routes: vec![
                ModRoute {
                    source: ModSource::Lfo1,
                    destination,
                    amount: 0.9,
                    enabled: true,
                },
                ModRoute {
                    source: ModSource::Lfo2,
                    destination,
                    amount: 0.9,
                    enabled: true,
                },
            ],
        };

        let got = mod_value_for(destination, &matrix, &sources);
        assert_eq!(got, 1.0);
    }
}
