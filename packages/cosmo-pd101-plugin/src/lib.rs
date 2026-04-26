//! Cosmo PD-101 Phase Distortion synthesizer — VST3/CLAP plugin via nih-plug.
//!
//! Uses nih-plug for VST3/CLAP plugin hosting and cosmo-synth-engine for the DSP engine.

#![recursion_limit = "256"]

use std::collections::VecDeque;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::{Arc, Mutex, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

use nih_plug::prelude::*;
use cosmo_synth_engine::default_envelopes::{default_dca_env, default_dco_env, default_dcw_env};
use cosmo_synth_engine::params::{
    AlgoControlValueV1, ModMatrix, PolyMode, StepEnvData, SynthParams,
};
use cosmo_synth_engine::processor::{midi_note_to_freq, CosmoProcessor};

pub mod gui;

const PLUGIN_LOG_PATH: &str = "/tmp/cosmo-plugin.log";

fn log_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

pub fn append_log(message: &str) {
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(PLUGIN_LOG_PATH)
    {
        let _ = writeln!(
            file,
            "[rust pid={} ts_ms={}] {}",
            std::process::id(),
            log_timestamp_ms(),
            message
        );
    }
}

pub fn plugin_log_path() -> &'static str {
    PLUGIN_LOG_PATH
}

// =============================================================================
// Scope ring buffer
// =============================================================================

/// Number of PCM samples kept in the scope ring buffer.
/// 4096 samples ≈ 93 ms at 44.1 kHz — enough to cover ≥2 cycles at ~22 Hz.
const SCOPE_CAPACITY: usize = 4096;

/// Rolling PCM buffer written by the audio thread and read by the GUI thread.
struct ScopeFrame {
    /// Circular buffer of mono samples in [-1, 1].
    samples: Vec<f32>,
    /// Write cursor (next position to overwrite once the buffer is full).
    cursor: usize,
    /// Sample rate reported by the audio engine.
    sample_rate: f32,
    /// Fundamental frequency of the currently sounding voice, or 0 if silent.
    hz: f32,
}

impl Default for ScopeFrame {
    fn default() -> Self {
        Self {
            samples: Vec::with_capacity(SCOPE_CAPACITY),
            cursor: 0,
            sample_rate: 44100.0,
            hz: 0.0,
        }
    }
}

impl ScopeFrame {
    /// Append one audio block to the ring buffer (non-allocating once full).
    fn push_block(&mut self, mono: &[f32], sample_rate: f32, hz: f32) {
        self.sample_rate = sample_rate;
        self.hz = hz;
        for &s in mono {
            if self.samples.len() < SCOPE_CAPACITY {
                self.samples.push(s);
            } else {
                self.samples[self.cursor] = s;
                self.cursor = (self.cursor + 1) % SCOPE_CAPACITY;
            }
        }
    }

    /// Return all buffered samples in chronological order (oldest → newest).
    fn to_linear(&self) -> Vec<f32> {
        if self.samples.len() < SCOPE_CAPACITY {
            self.samples.clone()
        } else {
            let mut out = Vec::with_capacity(SCOPE_CAPACITY);
            out.extend_from_slice(&self.samples[self.cursor..]);
            out.extend_from_slice(&self.samples[..self.cursor]);
            out
        }
    }
}

/// Thread-safe scope buffer shared between the audio thread and the GUI thread.
type ScopeBuffer = Arc<Mutex<ScopeFrame>>;
type UiInputQueue = Arc<Mutex<VecDeque<UiInputEvent>>>;

#[derive(Debug, Clone, Copy)]
enum UiInputEvent {
    NoteOn { note: u8, velocity: f32 },
    NoteOff { note: u8 },
    Sustain { on: bool },
    PitchBend { value: f32 },
    ModWheel { value: f32 },
    Aftertouch { value: f32 },
}

// =============================================================================
// =============================================================================
// Enum Types
// =============================================================================

/// Waveform selection (1-8).
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum Waveform {
    #[name = "Saw"]
    Saw,
    #[name = "Square"]
    Square,
    #[name = "Pulse"]
    Pulse,
    #[name = "Null"]
    Null,
    #[name = "Sine Pulse"]
    SinePulse,
    #[name = "Double Sine"]
    DoubleSine,
    #[name = "Saw Pulse"]
    SawPulse,
    #[name = "Multi Sine"]
    MultiSine,
    #[name = "Pulse 2"]
    Pulse2,
}

/// Warp algorithm selector.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum WarpAlgo {
    #[name = "CZ-101"]
    Cz101,
    #[name = "Bend"]
    Bend,
    #[name = "Sync"]
    Sync,
    #[name = "Pinch"]
    Pinch,
    #[name = "Fold"]
    Fold,
    #[name = "Skew"]
    Skew,
    #[name = "Quantize"]
    Quantize,
    #[name = "Twist"]
    Twist,
    #[name = "Clip"]
    Clip,
    #[name = "Ripple"]
    Ripple,
    #[name = "Mirror"]
    Mirror,
    #[name = "Fof"]
    Fof,
    #[name = "Karpunk"]
    Karpunk,
    #[name = "Sine"]
    Sine,
}

/// Line select mode.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum LineSelect {
    #[name = "L1+L2"]
    L1PlusL2,
    #[name = "L1"]
    L1,
    #[name = "L2"]
    L2,
    #[name = "L1+L1'"]
    L1PlusL1Prime,
    #[name = "L1+L2'"]
    L1PlusL2Prime,
}

/// Modulation mode.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum ModMode {
    #[name = "Normal"]
    Normal,
    #[name = "Ring"]
    Ring,
    #[name = "Noise"]
    Noise,
}

/// Polyphony mode.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum PolyModeParam {
    #[name = "Poly 8"]
    Poly8,
    #[name = "Mono"]
    Mono,
}

/// LFO waveform.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum LfoWaveform {
    #[name = "Sine"]
    Sine,
    #[name = "Triangle"]
    Triangle,
    #[name = "Square"]
    Square,
    #[name = "Saw"]
    Saw,
    #[name = "Inverted Saw"]
    InvertedSaw,
    #[name = "Random"]
    Random,
}

/// Filter type.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum FilterType {
    #[name = "Low Pass"]
    Lp,
    #[name = "High Pass"]
    Hp,
    #[name = "Band Pass"]
    Bp,
}

/// Portamento mode.
#[derive(Enum, Debug, Clone, Copy, PartialEq)]
pub enum PortamentoMode {
    #[name = "Rate"]
    Rate,
    #[name = "Time"]
    Time,
}

// =============================================================================
// Parameters
// =============================================================================

/// Parameters for the Cosmo PD-101 Phase Distortion synthesizer.
#[derive(Params)]
pub struct CzParams {
    // Global
    #[id = "volume"]
    pub volume: FloatParam,

    #[id = "octave"]
    pub octave: FloatParam,

    #[id = "line_select"]
    pub line_select: EnumParam<LineSelect>,

    #[id = "mod_mode"]
    pub mod_mode: EnumParam<ModMode>,

    #[id = "poly_mode"]
    pub poly_mode: EnumParam<PolyModeParam>,

    #[id = "legato"]
    pub legato: FloatParam,

    #[id = "int_pm_enabled"]
    pub int_pm_enabled: FloatParam,

    #[id = "int_pm_amount"]
    pub int_pm_amount: FloatParam,

    #[id = "int_pm_ratio"]
    pub int_pm_ratio: FloatParam,

    #[id = "ext_pm_amount"]
    pub ext_pm_amount: FloatParam,

    #[id = "pm_pre"]
    pub pm_pre: FloatParam,

    // Line 1
    #[id = "l1_waveform"]
    pub l1_waveform: EnumParam<Waveform>,

    #[id = "l1_warp_algo"]
    pub l1_warp_algo: EnumParam<WarpAlgo>,

    #[id = "l1_dcw_base"]
    pub l1_dcw_base: FloatParam,

    #[id = "l1_dca_base"]
    pub l1_dca_base: FloatParam,

    #[id = "l1_octave"]
    pub l1_octave: FloatParam,

    #[id = "l1_detune"]
    pub l1_detune: FloatParam,

    #[id = "l1_key_follow"]
    pub l1_key_follow: FloatParam,

    #[id = "l1_modulation"]
    pub l1_modulation: FloatParam,

    #[id = "l1_algo_blend"]
    pub l1_algo_blend: FloatParam,

    #[id = "l1_warp_algo2"]
    pub l1_warp_algo2: FloatParam,

    // Line 2
    #[id = "l2_waveform"]
    pub l2_waveform: EnumParam<Waveform>,

    #[id = "l2_warp_algo"]
    pub l2_warp_algo: EnumParam<WarpAlgo>,

    #[id = "l2_dcw_base"]
    pub l2_dcw_base: FloatParam,

    #[id = "l2_dca_base"]
    pub l2_dca_base: FloatParam,

    #[id = "l2_octave"]
    pub l2_octave: FloatParam,

    #[id = "l2_detune"]
    pub l2_detune: FloatParam,

    #[id = "l2_key_follow"]
    pub l2_key_follow: FloatParam,

    #[id = "l2_modulation"]
    pub l2_modulation: FloatParam,

    #[id = "l2_algo_blend"]
    pub l2_algo_blend: FloatParam,

    #[id = "l2_warp_algo2"]
    pub l2_warp_algo2: FloatParam,

    // Vibrato
    #[id = "vib_enabled"]
    pub vib_enabled: FloatParam,

    #[id = "vib_waveform"]
    pub vib_waveform: FloatParam,

    #[id = "vib_rate"]
    pub vib_rate: FloatParam,

    #[id = "vib_depth"]
    pub vib_depth: FloatParam,

    #[id = "vib_delay"]
    pub vib_delay: FloatParam,

    // Chorus
    #[id = "cho_enabled"]
    pub cho_enabled: FloatParam,

    #[id = "cho_mix"]
    pub cho_mix: FloatParam,

    #[id = "cho_rate"]
    pub cho_rate: FloatParam,

    #[id = "cho_depth"]
    pub cho_depth: FloatParam,

    // Delay
    #[id = "del_enabled"]
    pub del_enabled: FloatParam,

    #[id = "del_mix"]
    pub del_mix: FloatParam,

    #[id = "del_time"]
    pub del_time: FloatParam,

    #[id = "del_feedback"]
    pub del_feedback: FloatParam,

    // Reverb
    #[id = "rev_enabled"]
    pub rev_enabled: FloatParam,

    #[id = "rev_mix"]
    pub rev_mix: FloatParam,

    #[id = "rev_space"]
    pub rev_space: FloatParam,

    #[id = "rev_predelay"]
    pub rev_predelay: FloatParam,

    #[id = "rev_distance"]
    pub rev_distance: FloatParam,

    #[id = "rev_character"]
    pub rev_character: FloatParam,

    // LFO
    #[id = "lfo_waveform"]
    pub lfo_waveform: EnumParam<LfoWaveform>,

    #[id = "lfo_rate"]
    pub lfo_rate: FloatParam,

    #[id = "lfo_depth"]
    pub lfo_depth: FloatParam,

    // Filter
    #[id = "fil_enabled"]
    pub fil_enabled: FloatParam,

    #[id = "fil_cutoff"]
    pub fil_cutoff: FloatParam,

    #[id = "fil_resonance"]
    pub fil_resonance: FloatParam,

    #[id = "fil_env_amount"]
    pub fil_env_amount: FloatParam,

    #[id = "fil_type"]
    pub fil_type: EnumParam<FilterType>,

    // Portamento
    #[id = "port_enabled"]
    pub port_enabled: FloatParam,

    #[id = "port_mode"]
    pub port_mode: EnumParam<PortamentoMode>,

    #[id = "port_time"]
    pub port_time: FloatParam,
}

impl Default for CzParams {
    fn default() -> Self {
        Self {
            volume: FloatParam::new("Volume", 0.4, FloatRange::Linear { min: 0.0, max: 1.0 }),
            octave: FloatParam::new("Octave", 0.0, FloatRange::Linear { min: -2.0, max: 2.0 }),
            line_select: EnumParam::new("Line Select", LineSelect::L1PlusL2),
            mod_mode: EnumParam::new("Mod Mode", ModMode::Normal),
            poly_mode: EnumParam::new("Poly Mode", PolyModeParam::Poly8),
            legato: FloatParam::new("Legato", 0.0, FloatRange::Linear { min: 0.0, max: 1.0 }),
            int_pm_enabled: FloatParam::new(
                "Int PM Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            int_pm_amount: FloatParam::new(
                "Int PM Amount",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            int_pm_ratio: FloatParam::new(
                "Int PM Ratio",
                1.0,
                FloatRange::Linear { min: 0.0, max: 8.0 },
            ),
            ext_pm_amount: FloatParam::new(
                "Ext PM Amount",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            pm_pre: FloatParam::new("PM Pre", 1.0, FloatRange::Linear { min: 0.0, max: 1.0 }),

            l1_waveform: EnumParam::new("L1 Waveform", Waveform::Saw),
            l1_warp_algo: EnumParam::new("L1 Warp Algo", WarpAlgo::Cz101),
            l1_dcw_base: FloatParam::new(
                "L1 DCW Amount",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l1_dca_base: FloatParam::new(
                "L1 Level",
                1.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l1_octave: FloatParam::new(
                "L1 Octave",
                0.0,
                FloatRange::Linear { min: -2.0, max: 2.0 },
            ),
            l1_detune: FloatParam::new(
                "L1 Detune (cents)",
                0.0,
                FloatRange::Linear { min: -100.0, max: 100.0 },
            ),
            l1_key_follow: FloatParam::new(
                "L1 Key Follow",
                0.0,
                FloatRange::Linear { min: 0.0, max: 10.0 },
            ),
            l1_modulation: FloatParam::new(
                "L1 Modulation",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l1_algo_blend: FloatParam::new(
                "L1 Algo Blend",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l1_warp_algo2: FloatParam::new(
                "L1 Warp Algo 2",
                -1.0,
                FloatRange::Linear { min: -1.0, max: 13.0 },
            ),

            l2_waveform: EnumParam::new("L2 Waveform", Waveform::Saw),
            l2_warp_algo: EnumParam::new("L2 Warp Algo", WarpAlgo::Cz101),
            l2_dcw_base: FloatParam::new(
                "L2 DCW Amount",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l2_dca_base: FloatParam::new(
                "L2 Level",
                1.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l2_octave: FloatParam::new(
                "L2 Octave",
                0.0,
                FloatRange::Linear { min: -2.0, max: 2.0 },
            ),
            l2_detune: FloatParam::new(
                "L2 Detune (cents)",
                0.0,
                FloatRange::Linear { min: -100.0, max: 100.0 },
            ),
            l2_key_follow: FloatParam::new(
                "L2 Key Follow",
                0.0,
                FloatRange::Linear { min: 0.0, max: 10.0 },
            ),
            l2_modulation: FloatParam::new(
                "L2 Modulation",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l2_algo_blend: FloatParam::new(
                "L2 Algo Blend",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            l2_warp_algo2: FloatParam::new(
                "L2 Warp Algo 2",
                -1.0,
                FloatRange::Linear { min: -1.0, max: 13.0 },
            ),

            vib_enabled: FloatParam::new(
                "Vib Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            vib_waveform: FloatParam::new(
                "Vib Waveform",
                1.0,
                FloatRange::Linear { min: 1.0, max: 4.0 },
            ),
            vib_rate: FloatParam::new(
                "Vib Rate",
                55.0,
                FloatRange::Linear { min: 0.0, max: 99.0 },
            ),
            vib_depth: FloatParam::new(
                "Vib Depth",
                8.0,
                FloatRange::Linear { min: 0.0, max: 99.0 },
            ),
            vib_delay: FloatParam::new(
                "Vib Delay (ms)",
                120.0,
                FloatRange::Linear { min: 0.0, max: 5000.0 },
            ),

            cho_enabled: FloatParam::new(
                "Cho Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            cho_mix: FloatParam::new("Cho Mix", 0.0, FloatRange::Linear { min: 0.0, max: 1.0 }),
            cho_rate: FloatParam::new(
                "Cho Rate (Hz)",
                0.8,
                FloatRange::Linear { min: 0.1, max: 10.0 },
            ),
            cho_depth: FloatParam::new(
                "Cho Depth",
                1.0,
                FloatRange::Linear { min: 0.0, max: 3.0 },
            ),

            del_enabled: FloatParam::new(
                "Del Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            del_mix: FloatParam::new("Del Mix", 0.0, FloatRange::Linear { min: 0.0, max: 1.0 }),
            del_time: FloatParam::new(
                "Del Time (s)",
                0.3,
                FloatRange::Linear { min: 0.01, max: 2.0 },
            ),
            del_feedback: FloatParam::new(
                "Del Feedback",
                0.35,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),

            rev_enabled: FloatParam::new(
                "Rev Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            rev_mix: FloatParam::new("Rev Mix", 0.0, FloatRange::Linear { min: 0.0, max: 1.0 }),
            rev_space: FloatParam::new(
                "Rev Space",
                0.5,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            rev_predelay: FloatParam::new(
                "Rev Pre-Delay (s)",
                0.0,
                FloatRange::Linear { min: 0.0, max: 0.1 },
            ),
            rev_distance: FloatParam::new(
                "Rev Distance",
                0.3,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            rev_character: FloatParam::new(
                "Rev Character",
                0.65,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),

            lfo_waveform: EnumParam::new("LFO Waveform", LfoWaveform::Sine),
            lfo_rate: FloatParam::new(
                "LFO Rate (Hz)",
                5.0,
                FloatRange::Linear { min: 0.01, max: 20.0 },
            ),
            lfo_depth: FloatParam::new(
                "LFO Depth",
                0.2,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),

            fil_enabled: FloatParam::new(
                "Fil Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            fil_cutoff: FloatParam::new(
                "Fil Cutoff (Hz)",
                5000.0,
                FloatRange::Linear { min: 20.0, max: 20000.0 },
            ),
            fil_resonance: FloatParam::new(
                "Fil Resonance",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            fil_env_amount: FloatParam::new(
                "Fil Env Amount",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            fil_type: EnumParam::new("Fil Type", FilterType::Lp),

            port_enabled: FloatParam::new(
                "Port Enabled",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            port_mode: EnumParam::new("Port Mode", PortamentoMode::Time),
            port_time: FloatParam::new(
                "Port Time (s)",
                0.1,
                FloatRange::Linear { min: 0.0, max: 2.0 },
            ),
        }
    }
}

impl CzParams {
    fn map_waveform(value: Waveform) -> cosmo_synth_engine::params::CzWaveform {
        match value {
            Waveform::Saw => cosmo_synth_engine::params::CzWaveform::Saw,
            Waveform::Square => cosmo_synth_engine::params::CzWaveform::Square,
            Waveform::Pulse => cosmo_synth_engine::params::CzWaveform::Pulse,
            Waveform::Null => cosmo_synth_engine::params::CzWaveform::Null,
            Waveform::SinePulse => cosmo_synth_engine::params::CzWaveform::SinePulse,
            Waveform::SawPulse => cosmo_synth_engine::params::CzWaveform::SawPulse,
            Waveform::DoubleSine | Waveform::MultiSine => {
                cosmo_synth_engine::params::CzWaveform::MultiSine
            }
            Waveform::Pulse2 => cosmo_synth_engine::params::CzWaveform::Pulse2,
        }
    }

    fn map_warp_algo(value: WarpAlgo) -> cosmo_synth_engine::params::Algo {
        match value {
            WarpAlgo::Cz101 => cosmo_synth_engine::params::Algo::Cz101,
            WarpAlgo::Bend => cosmo_synth_engine::params::Algo::Bend,
            WarpAlgo::Sync => cosmo_synth_engine::params::Algo::Sync,
            WarpAlgo::Pinch => cosmo_synth_engine::params::Algo::Pinch,
            WarpAlgo::Fold => cosmo_synth_engine::params::Algo::Fold,
            WarpAlgo::Skew => cosmo_synth_engine::params::Algo::Skew,
            WarpAlgo::Quantize => cosmo_synth_engine::params::Algo::Quantize,
            WarpAlgo::Twist => cosmo_synth_engine::params::Algo::Twist,
            WarpAlgo::Clip => cosmo_synth_engine::params::Algo::Clip,
            WarpAlgo::Ripple => cosmo_synth_engine::params::Algo::Ripple,
            WarpAlgo::Mirror => cosmo_synth_engine::params::Algo::Mirror,
            WarpAlgo::Fof => cosmo_synth_engine::params::Algo::Fof,
            WarpAlgo::Karpunk => cosmo_synth_engine::params::Algo::Karpunk,
            WarpAlgo::Sine => cosmo_synth_engine::params::Algo::Sine,
        }
    }

    fn map_lfo_waveform(value: LfoWaveform) -> cosmo_synth_engine::params::LfoWaveform {
        match value {
            LfoWaveform::Sine => cosmo_synth_engine::params::LfoWaveform::Sine,
            LfoWaveform::Triangle => cosmo_synth_engine::params::LfoWaveform::Triangle,
            LfoWaveform::Square => cosmo_synth_engine::params::LfoWaveform::Square,
            LfoWaveform::Saw => cosmo_synth_engine::params::LfoWaveform::Saw,
            LfoWaveform::InvertedSaw => cosmo_synth_engine::params::LfoWaveform::InvertedSaw,
            LfoWaveform::Random => cosmo_synth_engine::params::LfoWaveform::Random,
        }
    }

    fn map_filter_type(value: FilterType) -> cosmo_synth_engine::params::FilterType {
        match value {
            FilterType::Lp => cosmo_synth_engine::params::FilterType::Lp,
            FilterType::Hp => cosmo_synth_engine::params::FilterType::Hp,
            FilterType::Bp => cosmo_synth_engine::params::FilterType::Bp,
        }
    }

    fn map_portamento_mode(value: PortamentoMode) -> cosmo_synth_engine::params::PortamentoMode {
        match value {
            PortamentoMode::Rate => cosmo_synth_engine::params::PortamentoMode::Rate,
            PortamentoMode::Time => cosmo_synth_engine::params::PortamentoMode::Time,
        }
    }

    fn map_optional_warp(value: f32) -> Option<cosmo_synth_engine::params::Algo> {
        let id = value.round() as i32;
        match id {
            -1 => None,
            0 => Some(cosmo_synth_engine::params::Algo::Cz101),
            1 => Some(cosmo_synth_engine::params::Algo::Bend),
            2 => Some(cosmo_synth_engine::params::Algo::Sync),
            3 => Some(cosmo_synth_engine::params::Algo::Pinch),
            4 => Some(cosmo_synth_engine::params::Algo::Fold),
            5 => Some(cosmo_synth_engine::params::Algo::Skew),
            6 => Some(cosmo_synth_engine::params::Algo::Quantize),
            7 => Some(cosmo_synth_engine::params::Algo::Twist),
            8 => Some(cosmo_synth_engine::params::Algo::Clip),
            9 => Some(cosmo_synth_engine::params::Algo::Ripple),
            10 => Some(cosmo_synth_engine::params::Algo::Mirror),
            11 => Some(cosmo_synth_engine::params::Algo::Fof),
            12 => Some(cosmo_synth_engine::params::Algo::Karpunk),
            13 => Some(cosmo_synth_engine::params::Algo::Sine),
            _ => None,
        }
    }

    pub fn to_synth_params(&self) -> SynthParams {
        let mut params = SynthParams {
            volume: self.volume.value(),
            octave: self.octave.value(),
            line_select: match self.line_select.value() {
                LineSelect::L1PlusL2 => cosmo_synth_engine::params::LineSelect::L1PlusL2,
                LineSelect::L1 => cosmo_synth_engine::params::LineSelect::L1,
                LineSelect::L2 => cosmo_synth_engine::params::LineSelect::L2,
                LineSelect::L1PlusL1Prime => cosmo_synth_engine::params::LineSelect::L1PlusL1Prime,
                LineSelect::L1PlusL2Prime => cosmo_synth_engine::params::LineSelect::L1PlusL2Prime,
            },
            mod_mode: match self.mod_mode.value() {
                ModMode::Normal => cosmo_synth_engine::params::ModMode::Normal,
                ModMode::Ring => cosmo_synth_engine::params::ModMode::Ring,
                ModMode::Noise => cosmo_synth_engine::params::ModMode::Noise,
            },
            poly_mode: match self.poly_mode.value() {
                PolyModeParam::Poly8 => PolyMode::Poly8,
                PolyModeParam::Mono => PolyMode::Mono,
            },
            legato: self.legato.value() >= 0.5,
            int_pm_enabled: self.int_pm_enabled.value() >= 0.5,
            int_pm_amount: self.int_pm_amount.value(),
            int_pm_ratio: self.int_pm_ratio.value(),
            ext_pm_amount: self.ext_pm_amount.value(),
            pm_pre: self.pm_pre.value() >= 0.5,
            ..Default::default()
        };

        params.line1.cz.slot_a_waveform = Self::map_waveform(self.l1_waveform.value());
        params.line1.cz.slot_b_waveform = Self::map_waveform(self.l1_waveform.value());
        params.line1.algo = Self::map_warp_algo(self.l1_warp_algo.value());
        params.line1.dcw_base = self.l1_dcw_base.value();
        params.line1.dca_base = self.l1_dca_base.value();
        params.line1.octave = self.l1_octave.value();
        params.line1.detune_cents = self.l1_detune.value();
        params.line1.key_follow = self.l1_key_follow.value();
        params.line1.modulation = self.l1_modulation.value();
        params.line1.algo_blend = self.l1_algo_blend.value();
        params.line1.algo2 = Self::map_optional_warp(self.l1_warp_algo2.value());

        params.line2.cz.slot_a_waveform = Self::map_waveform(self.l2_waveform.value());
        params.line2.cz.slot_b_waveform = Self::map_waveform(self.l2_waveform.value());
        params.line2.algo = Self::map_warp_algo(self.l2_warp_algo.value());
        params.line2.dcw_base = self.l2_dcw_base.value();
        params.line2.dca_base = self.l2_dca_base.value();
        params.line2.octave = self.l2_octave.value();
        params.line2.detune_cents = self.l2_detune.value();
        params.line2.key_follow = self.l2_key_follow.value();
        params.line2.modulation = self.l2_modulation.value();
        params.line2.algo_blend = self.l2_algo_blend.value();
        params.line2.algo2 = Self::map_optional_warp(self.l2_warp_algo2.value());

        params.vibrato.enabled = self.vib_enabled.value() >= 0.5;
        params.vibrato.waveform = (self.vib_waveform.value().round() as i32).clamp(1, 4) as u8;
        params.vibrato.rate = self.vib_rate.value();
        params.vibrato.depth = self.vib_depth.value();
        params.vibrato.delay = self.vib_delay.value();

        params.chorus.enabled = self.cho_enabled.value() >= 0.5;
        params.chorus.mix = self.cho_mix.value();
        params.chorus.rate = self.cho_rate.value();
        params.chorus.depth = self.cho_depth.value();

        params.delay.enabled = self.del_enabled.value() >= 0.5;
        params.delay.mix = self.del_mix.value();
        params.delay.time = self.del_time.value();
        params.delay.feedback = self.del_feedback.value();

        params.reverb.enabled = self.rev_enabled.value() >= 0.5;
        params.reverb.mix = self.rev_mix.value();
        params.reverb.space = self.rev_space.value();
        params.reverb.predelay = self.rev_predelay.value();
        params.reverb.distance = self.rev_distance.value();
        params.reverb.character = self.rev_character.value();

        params.lfo.waveform = Self::map_lfo_waveform(self.lfo_waveform.value());
        params.lfo.rate = self.lfo_rate.value();
        params.lfo.depth = self.lfo_depth.value();

        params.filter.enabled = self.fil_enabled.value() >= 0.5;
        params.filter.filter_type = Self::map_filter_type(self.fil_type.value());
        params.filter.cutoff = self.fil_cutoff.value();
        params.filter.resonance = self.fil_resonance.value();
        params.filter.env_amount = self.fil_env_amount.value();

        params.portamento.enabled = self.port_enabled.value() >= 0.5;
        params.portamento.mode = Self::map_portamento_mode(self.port_mode.value());
        params.portamento.time = self.port_time.value();

        params
    }

    /// Build a JSON object of all plain param values for pushing to the WebView.
    /// Enum params are encoded as their variant index (0-based).
    pub fn to_params_json(&self) -> serde_json::Value {
        serde_json::json!({
            "volume": self.volume.value(),
            "octave": self.octave.value(),
            "line_select": self.line_select.value().to_index(),
            "mod_mode": self.mod_mode.value().to_index(),
            "poly_mode": self.poly_mode.value().to_index(),
            "legato": self.legato.value(),
            "int_pm_enabled": self.int_pm_enabled.value(),
            "int_pm_amount": self.int_pm_amount.value(),
            "int_pm_ratio": self.int_pm_ratio.value(),
            "ext_pm_amount": self.ext_pm_amount.value(),
            "pm_pre": self.pm_pre.value(),
            "l1_waveform": self.l1_waveform.value().to_index(),
            "l1_warp_algo": self.l1_warp_algo.value().to_index(),
            "l1_dcw_base": self.l1_dcw_base.value(),
            "l1_dca_base": self.l1_dca_base.value(),
            "l1_octave": self.l1_octave.value(),
            "l1_detune": self.l1_detune.value(),
            "l1_key_follow": self.l1_key_follow.value(),
            "l1_modulation": self.l1_modulation.value(),
            "l1_algo_blend": self.l1_algo_blend.value(),
            "l1_warp_algo2": self.l1_warp_algo2.value(),
            "l2_waveform": self.l2_waveform.value().to_index(),
            "l2_warp_algo": self.l2_warp_algo.value().to_index(),
            "l2_dcw_base": self.l2_dcw_base.value(),
            "l2_dca_base": self.l2_dca_base.value(),
            "l2_octave": self.l2_octave.value(),
            "l2_detune": self.l2_detune.value(),
            "l2_key_follow": self.l2_key_follow.value(),
            "l2_modulation": self.l2_modulation.value(),
            "l2_algo_blend": self.l2_algo_blend.value(),
            "l2_warp_algo2": self.l2_warp_algo2.value(),
            "vib_enabled": self.vib_enabled.value(),
            "vib_waveform": self.vib_waveform.value(),
            "vib_rate": self.vib_rate.value(),
            "vib_depth": self.vib_depth.value(),
            "vib_delay": self.vib_delay.value(),
            "cho_enabled": self.cho_enabled.value(),
            "cho_mix": self.cho_mix.value(),
            "cho_rate": self.cho_rate.value(),
            "cho_depth": self.cho_depth.value(),
            "del_enabled": self.del_enabled.value(),
            "del_mix": self.del_mix.value(),
            "del_time": self.del_time.value(),
            "del_feedback": self.del_feedback.value(),
            "rev_enabled": self.rev_enabled.value(),
            "rev_mix": self.rev_mix.value(),
            "rev_space": self.rev_space.value(),
            "rev_predelay": self.rev_predelay.value(),
            "rev_distance": self.rev_distance.value(),
            "rev_character": self.rev_character.value(),
            "lfo_waveform": self.lfo_waveform.value().to_index(),
            "lfo_rate": self.lfo_rate.value(),
            "lfo_depth": self.lfo_depth.value(),
            "fil_enabled": self.fil_enabled.value(),
            "fil_cutoff": self.fil_cutoff.value(),
            "fil_resonance": self.fil_resonance.value(),
            "fil_env_amount": self.fil_env_amount.value(),
            "fil_type": self.fil_type.value().to_index(),
            "port_enabled": self.port_enabled.value(),
            "port_mode": self.port_mode.value().to_index(),
            "port_time": self.port_time.value(),
        })
    }
}

// =============================================================================
// Compile-time coverage guard
// =============================================================================
#[allow(dead_code, unused_variables, clippy::items_after_statements)]
fn _assert_synth_params_coverage(p: SynthParams) {
    use cosmo_synth_engine::params::{
        ChorusParams, CzLineParams, DelayParams, FilterParams, LfoParams, LineParams,
        PortamentoParams, ReverbParams, VibratoParams,
    };

    let SynthParams {
        line_select,
        mod_mode,
        ring_gain: _ring_gain,
        octave,
        line1,
        line2,
        int_pm_enabled,
        int_pm_amount,
        int_pm_ratio,
        ext_pm_amount,
        pm_pre,
        frequency: _frequency,
        volume,
        poly_mode,
        legato,
        chorus,
        delay,
        phaser,
        reverb,
        vibrato,
        portamento,
        lfo,
        lfo2,
        mod_env,
        random,
        filter,
        pitch_bend_range: _pitch_bend_range,
        mod_wheel_vibrato_depth: _mod_wheel_vibrato_depth,
        mod_matrix: _mod_matrix,
    } = p;

    let ChorusParams { enabled: _, rate: _, depth: _, mix: _ } = chorus;
    let DelayParams { enabled: _, tape_mode: _, warmth: _, time: _, feedback: _, mix: _ } = delay;
    let ReverbParams { enabled: _, mix: _, space: _, predelay: _, distance: _, character: _ } = reverb;
    let VibratoParams { enabled: _, waveform: _, rate: _, depth: _, delay: _ } = vibrato;
    let PortamentoParams { enabled: _, mode: _, rate: _, time: _ } = portamento;
    let LfoParams { waveform: _, rate: _, depth: _, symmetry: _, retrigger: _, offset: _ } = lfo;
    let LfoParams { waveform: _, rate: _, depth: _, symmetry: _, retrigger: _, offset: _ } = lfo2;
    let FilterParams { enabled: _, filter_type: _, cutoff: _, resonance: _, env_amount: _ } = filter;

    let LineParams {
        algo: _, algo2: _, algo_blend: _, window: _, dca_base: _, dcw_base: _,
        modulation: _, detune_cents: _, octave: _, dco_env: _, dcw_env: _, dca_env: _,
        key_follow: _, cz: _l1_cz, algo_controls_a: _, algo_controls_b: _,
    } = line1;
    let CzLineParams { slot_a_waveform: _, slot_b_waveform: _, window: _ } = _l1_cz;

    let LineParams {
        algo: _, algo2: _, algo_blend: _, window: _, dca_base: _, dcw_base: _,
        modulation: _, detune_cents: _, octave: _, dco_env: _, dcw_env: _, dca_env: _,
        key_follow: _, cz: _l2_cz, algo_controls_a: _, algo_controls_b: _,
    } = line2;
    let CzLineParams { slot_a_waveform: _, slot_b_waveform: _, window: _ } = _l2_cz;

    let _ = (
        line_select, mod_mode, octave, int_pm_enabled, int_pm_amount, int_pm_ratio,
        ext_pm_amount, pm_pre, volume, poly_mode, legato, phaser, mod_env, random,
    );
}

// =============================================================================
// Non-param state (envelopes, algo controls, mod matrix)
// =============================================================================

#[derive(Clone)]
struct EnvelopeState {
    l1_dco: StepEnvData,
    l1_dcw: StepEnvData,
    l1_dca: StepEnvData,
    l2_dco: StepEnvData,
    l2_dcw: StepEnvData,
    l2_dca: StepEnvData,
}

impl Default for EnvelopeState {
    fn default() -> Self {
        Self {
            l1_dco: default_dco_env(),
            l1_dcw: default_dcw_env(),
            l1_dca: default_dca_env(),
            l2_dco: default_dco_env(),
            l2_dcw: default_dcw_env(),
            l2_dca: default_dca_env(),
        }
    }
}

impl EnvelopeState {
    fn apply_to(&self, params: &mut SynthParams) {
        params.line1.dco_env = self.l1_dco.clone();
        params.line1.dcw_env = self.l1_dcw.clone();
        params.line1.dca_env = self.l1_dca.clone();
        params.line2.dco_env = self.l2_dco.clone();
        params.line2.dcw_env = self.l2_dcw.clone();
        params.line2.dca_env = self.l2_dca.clone();
    }

    fn set(&mut self, envelope_id: &str, data: StepEnvData) -> Result<(), String> {
        match envelope_id {
            "l1_dco" => self.l1_dco = data,
            "l1_dcw" => self.l1_dcw = data,
            "l1_dca" => self.l1_dca = data,
            "l2_dco" => self.l2_dco = data,
            "l2_dcw" => self.l2_dcw = data,
            "l2_dca" => self.l2_dca = data,
            _ => return Err(format!("unknown envelope id: {envelope_id}")),
        }
        Ok(())
    }

    fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "l1_dco": self.l1_dco,
            "l1_dcw": self.l1_dcw,
            "l1_dca": self.l1_dca,
            "l2_dco": self.l2_dco,
            "l2_dcw": self.l2_dcw,
            "l2_dca": self.l2_dca,
        })
    }
}

#[derive(Clone, Default)]
struct AlgoControlsState {
    line1_a: Vec<AlgoControlValueV1>,
    line1_b: Vec<AlgoControlValueV1>,
    line2_a: Vec<AlgoControlValueV1>,
    line2_b: Vec<AlgoControlValueV1>,
}

impl AlgoControlsState {
    fn apply_to(&self, params: &mut SynthParams) {
        params.line1.algo_controls_a = Some(self.line1_a.clone());
        params.line1.algo_controls_b = Some(self.line1_b.clone());
        params.line2.algo_controls_a = Some(self.line2_a.clone());
        params.line2.algo_controls_b = Some(self.line2_b.clone());
    }

    fn set(&mut self, line: u8, bank: &str, controls: Vec<AlgoControlValueV1>) -> Result<(), String> {
        match (line, bank) {
            (1, "a") => self.line1_a = controls,
            (1, "b") => self.line1_b = controls,
            (2, "a") => self.line2_a = controls,
            (2, "b") => self.line2_b = controls,
            _ => return Err(format!("unknown algo controls line: {line}")),
        }
        Ok(())
    }

    fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "line1": { "a": self.line1_a, "b": self.line1_b },
            "line2": { "a": self.line2_a, "b": self.line2_b },
        })
    }
}

#[derive(Clone, Default)]
struct ModMatrixState {
    matrix: ModMatrix,
}

impl ModMatrixState {
    fn apply_to(&self, params: &mut SynthParams) {
        params.mod_matrix = self.matrix.clone();
    }

    fn set(&mut self, matrix: ModMatrix) {
        self.matrix = matrix;
    }

    fn to_json(&self) -> serde_json::Value {
        serde_json::to_value(&self.matrix).unwrap_or_else(|_| serde_json::json!({ "routes": [] }))
    }
}

// =============================================================================
// IPC dispatch
// =============================================================================

fn handle_ipc_invoke(
    method: &str,
    args: &[serde_json::Value],
    envelopes: &Arc<RwLock<EnvelopeState>>,
    algo_controls: &Arc<RwLock<AlgoControlsState>>,
    mod_matrix: &Arc<RwLock<ModMatrixState>>,
    scope_buffer: &ScopeBuffer,
) -> Result<serde_json::Value, String> {
    append_log(&format!("ipc invoke method={method} args={}", args.len()));

    match method {
        "setEnvelope" => {
            let (envelope_id, data) = parse_set_envelope_args(args)?;
            let mut env = envelopes.write().map_err(|_| "envelope store is poisoned".to_string())?;
            env.set(envelope_id, data)?;
            Ok(serde_json::Value::Null)
        }
        "setAlgoControls" => {
            let (line, bank, controls) = parse_set_algo_controls_args(args)?;
            let mut ac = algo_controls.write().map_err(|_| "algo controls store is poisoned".to_string())?;
            ac.set(line, &bank, controls)?;
            Ok(serde_json::Value::Null)
        }
        "setModMatrix" => {
            let matrix = parse_set_mod_matrix_args(args)?;
            let mut mm = mod_matrix.write().map_err(|_| "mod matrix store is poisoned".to_string())?;
            mm.set(matrix);
            Ok(serde_json::Value::Null)
        }
        "getEnvelopes" => {
            let env = envelopes.read().map_err(|_| "envelope store is poisoned".to_string())?;
            Ok(env.to_json())
        }
        "getAlgoControls" => {
            let ac = algo_controls.read().map_err(|_| "algo controls store is poisoned".to_string())?;
            Ok(ac.to_json())
        }
        "getModMatrix" => {
            let mm = mod_matrix.read().map_err(|_| "mod matrix store is poisoned".to_string())?;
            Ok(mm.to_json())
        }
        "getScopeData" => {
            let scope = scope_buffer.lock().map_err(|_| "scope buffer is poisoned".to_string())?;
            if scope.samples.is_empty() {
                return Ok(serde_json::json!({ "samples": [], "sampleRate": scope.sample_rate, "hz": 0.0_f64 }));
            }
            let linear = scope.to_linear();
            let int_samples: Vec<i8> = linear.iter().map(|&s| (s.clamp(-1.0, 1.0) * 127.0) as i8).collect();
            Ok(serde_json::json!({ "samples": int_samples, "sampleRate": scope.sample_rate, "hz": scope.hz }))
        }
        _ => Err(format!("unknown method: {method}")),
    }
}

fn parse_set_envelope_args(args: &[serde_json::Value]) -> Result<(&str, StepEnvData), String> {
    if args.len() == 2 {
        let envelope_id = args[0].as_str().ok_or_else(|| "setEnvelope expects envelope id as first argument".to_string())?;
        let data: StepEnvData = serde_json::from_value(args[1].clone()).map_err(|e| format!("invalid envelope payload: {e}"))?;
        return Ok((envelope_id, data));
    }
    let payload = args.first().ok_or_else(|| "setEnvelope expects at least one argument".to_string())?;
    let envelope_id = payload.get("envelope_id").or_else(|| payload.get("envelopeId")).and_then(serde_json::Value::as_str).ok_or_else(|| "setEnvelope payload is missing envelope_id".to_string())?;
    let data_value = payload.get("data").cloned().ok_or_else(|| "setEnvelope payload is missing data".to_string())?;
    let data: StepEnvData = serde_json::from_value(data_value).map_err(|e| format!("invalid envelope payload: {e}"))?;
    Ok((envelope_id, data))
}

fn parse_set_algo_controls_args(args: &[serde_json::Value]) -> Result<(u8, String, Vec<AlgoControlValueV1>), String> {
    if args.len() == 2 {
        let line = args[0].as_u64().ok_or_else(|| "setAlgoControls expects line as first argument".to_string())? as u8;
        let controls: Vec<AlgoControlValueV1> = serde_json::from_value(args[1].clone()).map_err(|e| format!("invalid algo controls payload: {e}"))?;
        return Ok((line, "a".to_string(), controls));
    }
    if args.len() == 3 {
        let line = args[0].as_u64().ok_or_else(|| "setAlgoControls expects line as first argument".to_string())? as u8;
        let bank = args[1].as_str().ok_or_else(|| "setAlgoControls expects bank as second argument".to_string())?.to_string();
        let controls: Vec<AlgoControlValueV1> = serde_json::from_value(args[2].clone()).map_err(|e| format!("invalid algo controls payload: {e}"))?;
        return Ok((line, bank, controls));
    }
    let payload = args.first().ok_or_else(|| "setAlgoControls expects at least one argument".to_string())?;
    let line = payload.get("line").or_else(|| payload.get("line_id")).or_else(|| payload.get("lineId")).and_then(serde_json::Value::as_u64).ok_or_else(|| "setAlgoControls payload is missing line".to_string())? as u8;
    let controls_value = payload.get("controls").or_else(|| payload.get("algo_controls")).cloned().ok_or_else(|| "setAlgoControls payload is missing controls".to_string())?;
    let bank = payload.get("bank").and_then(serde_json::Value::as_str).unwrap_or("a").to_string();
    let controls: Vec<AlgoControlValueV1> = serde_json::from_value(controls_value).map_err(|e| format!("invalid algo controls payload: {e}"))?;
    Ok((line, bank, controls))
}

fn parse_set_mod_matrix_args(args: &[serde_json::Value]) -> Result<ModMatrix, String> {
    let payload = args.first().ok_or_else(|| "setModMatrix expects at least one argument".to_string())?;
    let matrix_value = payload.get("mod_matrix").or_else(|| payload.get("modMatrix")).cloned().unwrap_or_else(|| payload.clone());
    serde_json::from_value(matrix_value).map_err(|e| format!("invalid mod matrix payload: {e}"))
}

// =============================================================================
// Plugin struct
// =============================================================================

pub struct CzPlugin {
    params: Arc<CzParams>,
    /// DSP engine, present after `initialize()`.
    processor: Option<CosmoProcessor>,

    envelopes: Arc<RwLock<EnvelopeState>>,
    cached_envelopes: EnvelopeState,
    algo_controls: Arc<RwLock<AlgoControlsState>>,
    cached_algo_controls: AlgoControlsState,
    mod_matrix: Arc<RwLock<ModMatrixState>>,
    cached_mod_matrix: ModMatrixState,

    scope_buffer: ScopeBuffer,
    ui_input_queue: UiInputQueue,
}

impl Default for CzPlugin {
    fn default() -> Self {
        Self {
            params: Arc::new(CzParams::default()),
            processor: None,
            envelopes: Arc::new(RwLock::new(EnvelopeState::default())),
            cached_envelopes: EnvelopeState::default(),
            algo_controls: Arc::new(RwLock::new(AlgoControlsState::default())),
            cached_algo_controls: AlgoControlsState::default(),
            mod_matrix: Arc::new(RwLock::new(ModMatrixState::default())),
            cached_mod_matrix: ModMatrixState::default(),
            scope_buffer: Arc::new(Mutex::new(ScopeFrame::default())),
            ui_input_queue: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
}

impl CzPlugin {
    fn drain_ui_input_events(&mut self) {
        let Ok(mut queue) = self.ui_input_queue.lock() else { return; };
        while let Some(event) = queue.pop_front() {
            if let Some(proc) = &mut self.processor {
                match event {
                    UiInputEvent::NoteOn { note, velocity } => proc.note_on(note, midi_note_to_freq(note), velocity),
                    UiInputEvent::NoteOff { note } => proc.note_off(note),
                    UiInputEvent::Sustain { on } => proc.set_sustain(on),
                    UiInputEvent::PitchBend { value } => proc.set_pitch_bend(value),
                    UiInputEvent::ModWheel { value } => proc.set_mod_wheel(value),
                    UiInputEvent::Aftertouch { value } => proc.set_aftertouch(value),
                }
            }
        }
    }
}

impl Plugin for CzPlugin {
    const NAME: &'static str = "Cosmo PD-101";
    const VENDOR: &'static str = "Cosmo";
    const URL: &'static str = "https://github.com/fpbrault/cosmo-pd";
    const EMAIL: &'static str = "";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[AudioIOLayout {
        main_input_channels: None,
        main_output_channels: NonZeroU32::new(2),
        aux_input_ports: &[],
        aux_output_ports: &[],
        names: PortNames::const_default(),
    }];

    const MIDI_INPUT: MidiConfig = MidiConfig::Basic;
    const MIDI_OUTPUT: MidiConfig = MidiConfig::None;
    const SAMPLE_ACCURATE_AUTOMATION: bool = false;

    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        Some(Box::new(crate::gui::CzEditor::new(
            self.params.clone(),
            self.envelopes.clone(),
            self.algo_controls.clone(),
            self.mod_matrix.clone(),
            self.scope_buffer.clone(),
            self.ui_input_queue.clone(),
        )))
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        append_log(&format!(
            "initialize sample_rate={} log_path={}",
            buffer_config.sample_rate,
            plugin_log_path()
        ));
        let mut processor = CosmoProcessor::new(buffer_config.sample_rate);
        let mut synth_params = self.params.to_synth_params();
        if let Ok(env) = self.envelopes.read() {
            self.cached_envelopes = env.clone();
        }
        if let Ok(ac) = self.algo_controls.read() {
            self.cached_algo_controls = ac.clone();
        }
        if let Ok(mm) = self.mod_matrix.read() {
            self.cached_mod_matrix = mm.clone();
        }
        self.cached_envelopes.apply_to(&mut synth_params);
        self.cached_algo_controls.apply_to(&mut synth_params);
        self.cached_mod_matrix.apply_to(&mut synth_params);
        processor.set_params(synth_params);
        self.processor = Some(processor);
        true
    }

    fn reset(&mut self) {}

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        // Handle MIDI events
        while let Some(event) = context.next_event() {
            match event {
                NoteEvent::NoteOn { note, velocity, .. } => {
                    if let Some(proc) = &mut self.processor {
                        proc.note_on(note, midi_note_to_freq(note), velocity);
                    }
                }
                NoteEvent::NoteOff { note, .. } => {
                    if let Some(proc) = &mut self.processor {
                        proc.note_off(note);
                    }
                }
                NoteEvent::MidiCC { cc, value, .. } => {
                    if let Some(proc) = &mut self.processor {
                        match cc {
                            1 => proc.set_mod_wheel(value),
                            64 => proc.set_sustain(value >= 0.5),
                            _ => {}
                        }
                    }
                }
                NoteEvent::MidiPitchBend { value, .. } => {
                    if let Some(proc) = &mut self.processor {
                        proc.set_pitch_bend(value);
                    }
                }
                _ => {}
            }
        }

        self.drain_ui_input_events();

        if let Ok(env) = self.envelopes.try_read() {
            self.cached_envelopes = env.clone();
        }
        if let Ok(ac) = self.algo_controls.try_read() {
            self.cached_algo_controls = ac.clone();
        }
        if let Ok(mm) = self.mod_matrix.try_read() {
            self.cached_mod_matrix = mm.clone();
        }

        let mut synth_params = self.params.to_synth_params();
        self.cached_envelopes.apply_to(&mut synth_params);
        self.cached_algo_controls.apply_to(&mut synth_params);
        self.cached_mod_matrix.apply_to(&mut synth_params);

        if let Some(proc) = &mut self.processor {
            proc.set_params(synth_params);

            let num_samples = buffer.samples();
            let mut mono_output = vec![0.0f32; num_samples];
            proc.process(&mut mono_output);

            let hz = proc
                .voices
                .iter()
                .filter(|v| !v.is_silent && !v.is_releasing && v.note.is_some())
                .map(|v| v.current_freq)
                .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                .unwrap_or(0.0);
            if let Ok(mut scope) = self.scope_buffer.try_lock() {
                scope.push_block(&mono_output, proc.sample_rate, hz);
            }

            for channel_slice in buffer.as_slice() {
                channel_slice.copy_from_slice(&mono_output);
            }
        }

        ProcessStatus::Normal
    }
}

impl ClapPlugin for CzPlugin {
    const CLAP_ID: &'static str = "jp.cosmo.pd101";
    const CLAP_DESCRIPTION: Option<&'static str> = Some("Cosmo PD-101 Phase Distortion Synthesizer");
    const CLAP_MANUAL_URL: Option<&'static str> = None;
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::Instrument,
        ClapFeature::Synthesizer,
        ClapFeature::Stereo,
    ];
}

impl Vst3Plugin for CzPlugin {
    const VST3_CLASS_ID: [u8; 16] = *b"CosmoPD101Synth!";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[
        Vst3SubCategory::Instrument,
        Vst3SubCategory::Synth,
        Vst3SubCategory::Stereo,
    ];
}

nih_export_clap!(CzPlugin);
nih_export_vst3!(CzPlugin);

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use cosmo_synth_engine::params::EnvStep;
    use serde_json::json;

    fn make_env(level: u8, rate: u8, step_count: usize, sustain_step: usize, loop_: bool) -> StepEnvData {
        let mut env = StepEnvData::default();
        env.steps[0] = EnvStep { level, rate };
        env.step_count = step_count;
        env.sustain_step = sustain_step;
        env.loop_ = loop_;
        env
    }

    #[test]
    fn scope_frame_keeps_samples_in_chronological_order_after_wrap() {
        let mut frame = ScopeFrame::default();
        let initial: Vec<f32> = (0..SCOPE_CAPACITY).map(|sample| sample as f32).collect();
        frame.push_block(&initial, 48_000.0, 110.0);
        frame.push_block(&[4096.0, 4097.0, 4098.0], 48_000.0, 220.0);

        let linear = frame.to_linear();
        assert_eq!(linear.len(), SCOPE_CAPACITY);
        assert_eq!(&linear[..3], &[3.0, 4.0, 5.0]);
        assert_eq!(&linear[linear.len() - 3..], &[4096.0, 4097.0, 4098.0]);
        assert_eq!(frame.sample_rate, 48_000.0);
        assert_eq!(frame.hz, 220.0);
    }

    #[test]
    fn envelope_state_applies_updates_and_serializes_expected_keys() {
        let mut state = EnvelopeState {
            l1_dco: StepEnvData::default(),
            l1_dcw: StepEnvData::default(),
            l1_dca: StepEnvData::default(),
            l2_dco: StepEnvData::default(),
            l2_dcw: StepEnvData::default(),
            l2_dca: StepEnvData::default(),
        };
        let updated = make_env(25, 33, 6, 4, true);
        state.set("l1_dco", updated.clone()).unwrap();

        let mut params = SynthParams::default();
        state.apply_to(&mut params);

        assert_eq!(params.line1.dco_env.step_count, 6);
        assert_eq!(params.line1.dco_env.sustain_step, 4);
        assert!(params.line1.dco_env.loop_);
        assert_eq!(params.line1.dco_env.steps[0].level, 25);
        assert_eq!(params.line1.dco_env.steps[0].rate, 33);
        assert_eq!(state.to_json()["l1_dco"]["stepCount"], json!(6));
        assert_eq!(state.to_json()["l1_dco"]["sustainStep"], json!(4));
        assert_eq!(state.to_json()["l1_dco"]["loop"], json!(true));
        assert!(state.set("missing", StepEnvData::default()).is_err());
    }

    #[test]
    fn algo_controls_state_applies_per_line_values_and_rejects_unknown_lines() {
        let mut state = AlgoControlsState::default();
        let line1 = vec![AlgoControlValueV1 { id: "warp".to_string(), value: 0.25 }];
        let line2 = vec![AlgoControlValueV1 { id: "bias".to_string(), value: 0.75 }];

        state.set(1, "a", line1).unwrap();
        state.set(2, "b", line2).unwrap();

        let mut params = SynthParams::default();
        state.apply_to(&mut params);

        let applied_line1 = params.line1.algo_controls_a.as_ref().unwrap();
        let applied_line2 = params.line2.algo_controls_b.as_ref().unwrap();
        assert_eq!(applied_line1.len(), 1);
        assert_eq!(applied_line1[0].id, "warp");
        assert_eq!(applied_line1[0].value, 0.25);
        assert_eq!(applied_line2.len(), 1);
        assert_eq!(applied_line2[0].id, "bias");
        assert_eq!(applied_line2[0].value, 0.75);
        assert_eq!(state.to_json()["line1"]["a"][0]["id"], json!("warp"));
        assert_eq!(state.to_json()["line2"]["b"][0]["value"], json!(0.75));
        assert!(state.set(3, "a", Vec::new()).is_err());
    }
}
