//! Cosmo PD-101 Phase Distortion synthesizer — VST3/AU plugin via Beamer.
//!
//! Uses beamer for VST3/AU plugin hosting and cosmo-synth-engine for the DSP engine.

use std::fs::OpenOptions;
use std::io::Write;
use std::sync::{Arc, Mutex, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

use beamer::prelude::*;
use cosmo_synth_engine::params::{PolyMode, StepEnvData, SynthParams};
use cosmo_synth_engine::processor::{midi_note_to_freq, CosmoProcessor};

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

// =============================================================================
// Enum Types for EnumParameter
// =============================================================================

/// Waveform selection (1-8).
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum Waveform {
    #[name = "Saw"]
    #[default]
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
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum WarpAlgo {
    #[name = "CZ-101"]
    #[default]
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
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum LineSelect {
    #[name = "L1+L2"]
    #[default]
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
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum ModMode {
    #[name = "Normal"]
    #[default]
    Normal,
    #[name = "Ring"]
    Ring,
    #[name = "Noise"]
    Noise,
}

/// Polyphony mode.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum PolyModeParam {
    #[name = "Poly 8"]
    #[default]
    Poly8,
    #[name = "Mono"]
    Mono,
}

/// Velocity routing target.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum VelocityTarget {
    #[name = "Amp"]
    #[default]
    Amp,
    #[name = "DCW"]
    Dcw,
    #[name = "Both"]
    Both,
    #[name = "Off"]
    Off,
}

/// LFO waveform.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum LfoWaveform {
    #[name = "Sine"]
    #[default]
    Sine,
    #[name = "Triangle"]
    Triangle,
    #[name = "Square"]
    Square,
    #[name = "Saw"]
    Saw,
}

/// LFO target.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum LfoTarget {
    #[name = "Pitch"]
    #[default]
    Pitch,
    #[name = "DCW"]
    Dcw,
    #[name = "DCA"]
    Dca,
    #[name = "Filter"]
    Filter,
}

/// Filter type.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum FilterType {
    #[name = "Low Pass"]
    #[default]
    Lp,
    #[name = "High Pass"]
    Hp,
    #[name = "Band Pass"]
    Bp,
}

/// Portamento mode.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum PortamentoMode {
    #[name = "Rate"]
    #[default]
    Rate,
    #[name = "Time"]
    Time,
}

// =============================================================================
// Parameters
// =============================================================================

/// Parameters for the Cosmo PD-101 Phase Distortion synthesizer.
#[derive(Parameters)]
pub struct CzParameters {
    // Global
    #[parameter(id = "volume", name = "Volume", default = 0.4, range = 0.0..=1.0)]
    pub volume: FloatParameter,

    #[parameter(id = "octave", name = "Octave", default = 0.0, range = -2.0..=2.0)]
    pub octave: FloatParameter,

    #[parameter(id = "line_select", name = "Line Select", group = "Global")]
    pub line_select: EnumParameter<LineSelect>,

    #[parameter(id = "mod_mode", name = "Mod Mode", group = "Global")]
    pub mod_mode: EnumParameter<ModMode>,

    #[parameter(id = "poly_mode", name = "Poly Mode", group = "Global")]
    pub poly_mode: EnumParameter<PolyModeParam>,

    #[parameter(id = "legato", name = "Legato", default = 0.0, range = 0.0..=1.0)]
    pub legato: FloatParameter,

    #[parameter(id = "vel_target", name = "Velocity Target", group = "Global")]
    pub vel_target: EnumParameter<VelocityTarget>,

    #[parameter(id = "int_pm_amount", name = "Int PM Amount", default = 0.0, range = 0.0..=1.0)]
    pub int_pm_amount: FloatParameter,

    #[parameter(id = "int_pm_ratio", name = "Int PM Ratio", default = 1.0, range = 0.0..=8.0)]
    pub int_pm_ratio: FloatParameter,

    #[parameter(id = "ext_pm_amount", name = "Ext PM Amount", default = 0.0, range = 0.0..=1.0)]
    pub ext_pm_amount: FloatParameter,

    #[parameter(id = "pm_pre", name = "PM Pre", default = 1.0, range = 0.0..=1.0)]
    pub pm_pre: FloatParameter,

    // Line 1
    #[parameter(id = "l1_waveform", name = "Waveform", group = "Line 1")]
    pub l1_waveform: EnumParameter<Waveform>,

    #[parameter(id = "l1_warp_algo", name = "Warp Algo", group = "Line 1")]
    pub l1_warp_algo: EnumParameter<WarpAlgo>,

    #[parameter(id = "l1_dcw_base", name = "DCW Amount", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_dcw_base: FloatParameter,

    #[parameter(id = "l1_dca_base", name = "Level", default = 1.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_dca_base: FloatParameter,

    #[parameter(id = "l1_dco_depth", name = "DCO Depth", default = 0.0, range = 0.0..=24.0, group = "Line 1")]
    pub l1_dco_depth: FloatParameter,

    #[parameter(id = "l1_octave", name = "Octave", default = 0.0, range = -2.0..=2.0, group = "Line 1")]
    pub l1_octave: FloatParameter,

    #[parameter(id = "l1_detune", name = "Detune (cents)", default = 0.0, range = -100.0..=100.0, group = "Line 1")]
    pub l1_detune: FloatParameter,

    #[parameter(id = "l1_dcw_comp", name = "DCW Comp", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_dcw_comp: FloatParameter,

    #[parameter(id = "l1_key_follow", name = "Key Follow", default = 0.0, range = 0.0..=10.0, group = "Line 1")]
    pub l1_key_follow: FloatParameter,

    #[parameter(id = "l1_modulation", name = "Modulation", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_modulation: FloatParameter,

    #[parameter(id = "l1_algo_blend", name = "Algo Blend", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_algo_blend: FloatParameter,

    #[parameter(id = "l1_warp_algo2", name = "Warp Algo 2", default = -1.0, range = -1.0..=13.0, group = "Line 1")]
    pub l1_warp_algo2: FloatParameter,

    // Line 2
    #[parameter(id = "l2_waveform", name = "Waveform", group = "Line 2")]
    pub l2_waveform: EnumParameter<Waveform>,

    #[parameter(id = "l2_warp_algo", name = "Warp Algo", group = "Line 2")]
    pub l2_warp_algo: EnumParameter<WarpAlgo>,

    #[parameter(id = "l2_dcw_base", name = "DCW Amount", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_dcw_base: FloatParameter,

    #[parameter(id = "l2_dca_base", name = "Level", default = 1.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_dca_base: FloatParameter,

    #[parameter(id = "l2_dco_depth", name = "DCO Depth", default = 0.0, range = 0.0..=24.0, group = "Line 2")]
    pub l2_dco_depth: FloatParameter,

    #[parameter(id = "l2_octave", name = "Octave", default = 0.0, range = -2.0..=2.0, group = "Line 2")]
    pub l2_octave: FloatParameter,

    #[parameter(id = "l2_detune", name = "Detune (cents)", default = 0.0, range = -100.0..=100.0, group = "Line 2")]
    pub l2_detune: FloatParameter,

    #[parameter(id = "l2_dcw_comp", name = "DCW Comp", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_dcw_comp: FloatParameter,

    #[parameter(id = "l2_key_follow", name = "Key Follow", default = 0.0, range = 0.0..=10.0, group = "Line 2")]
    pub l2_key_follow: FloatParameter,

    #[parameter(id = "l2_modulation", name = "Modulation", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_modulation: FloatParameter,

    #[parameter(id = "l2_algo_blend", name = "Algo Blend", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_algo_blend: FloatParameter,

    #[parameter(id = "l2_warp_algo2", name = "Warp Algo 2", default = -1.0, range = -1.0..=13.0, group = "Line 2")]
    pub l2_warp_algo2: FloatParameter,

    // Vibrato
    #[parameter(id = "vib_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "Vibrato")]
    pub vib_enabled: FloatParameter,

    #[parameter(id = "vib_waveform", name = "Waveform", default = 1.0, range = 1.0..=4.0, group = "Vibrato")]
    pub vib_waveform: FloatParameter,

    #[parameter(id = "vib_rate", name = "Rate", default = 30.0, range = 0.0..=99.0, group = "Vibrato")]
    pub vib_rate: FloatParameter,

    #[parameter(id = "vib_depth", name = "Depth", default = 30.0, range = 0.0..=99.0, group = "Vibrato")]
    pub vib_depth: FloatParameter,

    #[parameter(id = "vib_delay", name = "Delay (ms)", default = 0.0, range = 0.0..=5000.0, group = "Vibrato")]
    pub vib_delay: FloatParameter,

    // Chorus
    #[parameter(id = "cho_mix", name = "Mix", default = 0.0, range = 0.0..=1.0, group = "Chorus")]
    pub cho_mix: FloatParameter,

    #[parameter(id = "cho_rate", name = "Rate (Hz)", default = 0.8, range = 0.1..=10.0, group = "Chorus")]
    pub cho_rate: FloatParameter,

    #[parameter(id = "cho_depth", name = "Depth", default = 1.0, range = 0.0..=3.0, group = "Chorus")]
    pub cho_depth: FloatParameter,

    // Delay
    #[parameter(id = "del_mix", name = "Mix", default = 0.0, range = 0.0..=1.0, group = "Delay")]
    pub del_mix: FloatParameter,

    #[parameter(id = "del_time", name = "Time (s)", default = 0.3, range = 0.01..=2.0, group = "Delay")]
    pub del_time: FloatParameter,

    #[parameter(id = "del_feedback", name = "Feedback", default = 0.35, range = 0.0..=1.0, group = "Delay")]
    pub del_feedback: FloatParameter,

    // Reverb
    #[parameter(id = "rev_mix", name = "Mix", default = 0.0, range = 0.0..=1.0, group = "Reverb")]
    pub rev_mix: FloatParameter,

    #[parameter(id = "rev_size", name = "Size", default = 0.5, range = 0.0..=1.0, group = "Reverb")]
    pub rev_size: FloatParameter,

    // LFO
    #[parameter(id = "lfo_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "LFO")]
    pub lfo_enabled: FloatParameter,

    #[parameter(id = "lfo_waveform", name = "Waveform", group = "LFO")]
    pub lfo_waveform: EnumParameter<LfoWaveform>,

    #[parameter(id = "lfo_rate", name = "Rate (Hz)", default = 5.0, range = 0.01..=20.0, group = "LFO")]
    pub lfo_rate: FloatParameter,

    #[parameter(id = "lfo_depth", name = "Depth", default = 0.0, range = 0.0..=1.0, group = "LFO")]
    pub lfo_depth: FloatParameter,

    #[parameter(id = "lfo_target", name = "Target", group = "LFO")]
    pub lfo_target: EnumParameter<LfoTarget>,

    // Filter
    #[parameter(id = "fil_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "Filter")]
    pub fil_enabled: FloatParameter,

    #[parameter(id = "fil_cutoff", name = "Cutoff (Hz)", default = 5000.0, range = 20.0..=20000.0, kind = "hz", group = "Filter")]
    pub fil_cutoff: FloatParameter,

    #[parameter(id = "fil_resonance", name = "Resonance", default = 0.0, range = 0.0..=1.0, group = "Filter")]
    pub fil_resonance: FloatParameter,

    #[parameter(id = "fil_env_amount", name = "Env Amount", default = 0.0, range = 0.0..=1.0, group = "Filter")]
    pub fil_env_amount: FloatParameter,

    #[parameter(id = "fil_type", name = "Type", group = "Filter")]
    pub fil_type: EnumParameter<FilterType>,

    // Portamento
    #[parameter(id = "port_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "Portamento")]
    pub port_enabled: FloatParameter,

    #[parameter(id = "port_mode", name = "Mode", group = "Portamento")]
    pub port_mode: EnumParameter<PortamentoMode>,

    #[parameter(id = "port_time", name = "Time (s)", default = 0.5, range = 0.0..=2.0, group = "Portamento")]
    pub port_time: FloatParameter,
}

impl CzParameters {
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
        }
    }

    fn map_lfo_target(value: LfoTarget) -> cosmo_synth_engine::params::LfoTarget {
        match value {
            LfoTarget::Pitch => cosmo_synth_engine::params::LfoTarget::Pitch,
            LfoTarget::Dcw => cosmo_synth_engine::params::LfoTarget::Dcw,
            LfoTarget::Dca => cosmo_synth_engine::params::LfoTarget::Dca,
            LfoTarget::Filter => cosmo_synth_engine::params::LfoTarget::Filter,
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

    fn to_synth_params(&self) -> SynthParams {
        let mut params = SynthParams {
            volume: self.volume.get() as f32,
            octave: self.octave.get() as f32,
            line_select: match self.line_select.get() {
                LineSelect::L1PlusL2 => cosmo_synth_engine::params::LineSelect::L1PlusL2,
                LineSelect::L1 => cosmo_synth_engine::params::LineSelect::L1,
                LineSelect::L2 => cosmo_synth_engine::params::LineSelect::L2,
                LineSelect::L1PlusL1Prime => cosmo_synth_engine::params::LineSelect::L1PlusL1Prime,
                LineSelect::L1PlusL2Prime => cosmo_synth_engine::params::LineSelect::L1PlusL2Prime,
            },
            mod_mode: match self.mod_mode.get() {
                ModMode::Normal => cosmo_synth_engine::params::ModMode::Normal,
                ModMode::Ring => cosmo_synth_engine::params::ModMode::Ring,
                ModMode::Noise => cosmo_synth_engine::params::ModMode::Noise,
            },
            poly_mode: match self.poly_mode.get() {
                PolyModeParam::Poly8 => PolyMode::Poly8,
                PolyModeParam::Mono => PolyMode::Mono,
            },
            legato: self.legato.get() >= 0.5,
            velocity_target: match self.vel_target.get() {
                VelocityTarget::Amp => cosmo_synth_engine::params::VelocityTarget::Amp,
                VelocityTarget::Dcw => cosmo_synth_engine::params::VelocityTarget::Dcw,
                VelocityTarget::Both => cosmo_synth_engine::params::VelocityTarget::Both,
                VelocityTarget::Off => cosmo_synth_engine::params::VelocityTarget::Off,
            },
            int_pm_amount: self.int_pm_amount.get() as f32,
            int_pm_ratio: self.int_pm_ratio.get() as f32,
            ext_pm_amount: self.ext_pm_amount.get() as f32,
            pm_pre: self.pm_pre.get() >= 0.5,
            ..Default::default()
        };

        params.line1.cz.slot_a_waveform = Self::map_waveform(self.l1_waveform.get());
        params.line1.cz.slot_b_waveform = Self::map_waveform(self.l1_waveform.get());
        params.line1.algo = Self::map_warp_algo(self.l1_warp_algo.get());
        params.line1.dcw_base = self.l1_dcw_base.get() as f32;
        params.line1.dca_base = self.l1_dca_base.get() as f32;
        params.line1.dco_depth = self.l1_dco_depth.get() as f32;
        params.line1.octave = self.l1_octave.get() as f32;
        params.line1.detune_cents = self.l1_detune.get() as f32;
        params.line1.dcw_comp = self.l1_dcw_comp.get() as f32;
        params.line1.key_follow = self.l1_key_follow.get() as f32;
        params.line1.modulation = self.l1_modulation.get() as f32;
        params.line1.algo_blend = self.l1_algo_blend.get() as f32;
        params.line1.algo2 = Self::map_optional_warp(self.l1_warp_algo2.get() as f32);

        params.line2.cz.slot_a_waveform = Self::map_waveform(self.l2_waveform.get());
        params.line2.cz.slot_b_waveform = Self::map_waveform(self.l2_waveform.get());
        params.line2.algo = Self::map_warp_algo(self.l2_warp_algo.get());
        params.line2.dcw_base = self.l2_dcw_base.get() as f32;
        params.line2.dca_base = self.l2_dca_base.get() as f32;
        params.line2.dco_depth = self.l2_dco_depth.get() as f32;
        params.line2.octave = self.l2_octave.get() as f32;
        params.line2.detune_cents = self.l2_detune.get() as f32;
        params.line2.dcw_comp = self.l2_dcw_comp.get() as f32;
        params.line2.key_follow = self.l2_key_follow.get() as f32;
        params.line2.modulation = self.l2_modulation.get() as f32;
        params.line2.algo_blend = self.l2_algo_blend.get() as f32;
        params.line2.algo2 = Self::map_optional_warp(self.l2_warp_algo2.get() as f32);

        params.vibrato.enabled = self.vib_enabled.get() >= 0.5;
        params.vibrato.waveform = (self.vib_waveform.get().round() as i32).clamp(1, 4) as u8;
        params.vibrato.rate = self.vib_rate.get() as f32;
        params.vibrato.depth = self.vib_depth.get() as f32;
        params.vibrato.delay = self.vib_delay.get() as f32;

        params.chorus.mix = self.cho_mix.get() as f32;
        params.chorus.rate = self.cho_rate.get() as f32;
        params.chorus.depth = self.cho_depth.get() as f32;

        params.delay.mix = self.del_mix.get() as f32;
        params.delay.time = self.del_time.get() as f32;
        params.delay.feedback = self.del_feedback.get() as f32;

        params.reverb.mix = self.rev_mix.get() as f32;
        params.reverb.size = self.rev_size.get() as f32;

        params.lfo.enabled = self.lfo_enabled.get() >= 0.5;
        params.lfo.waveform = Self::map_lfo_waveform(self.lfo_waveform.get());
        params.lfo.rate = self.lfo_rate.get() as f32;
        params.lfo.depth = self.lfo_depth.get() as f32;
        params.lfo.target = Self::map_lfo_target(self.lfo_target.get());

        params.filter.enabled = self.fil_enabled.get() >= 0.5;
        params.filter.filter_type = Self::map_filter_type(self.fil_type.get());
        params.filter.cutoff = self.fil_cutoff.get() as f32;
        params.filter.resonance = self.fil_resonance.get() as f32;
        params.filter.env_amount = self.fil_env_amount.get() as f32;

        params.portamento.enabled = self.port_enabled.get() >= 0.5;
        params.portamento.mode = Self::map_portamento_mode(self.port_mode.get());
        params.portamento.time = self.port_time.get() as f32;

        params
    }
}

// =============================================================================
// Compile-time coverage guard
// =============================================================================
//
// This function is NEVER called. It exists solely to force a compile error
// whenever a new field is added to SynthParams (or any nested param struct) in
// cosmo-synth-engine/src/params.rs without updating `to_synth_params` above.
//
// Rules:
//   - Every struct destructure here must name ALL fields — no `..` allowed.
//   - If params.rs adds a field, rustc will report "missing field `foo`" here.
//   - Deliberately unmapped fields (e.g. `frequency`, `ring_gain`,
//     `algo_controls`) must still be listed — use a `_`-prefixed binding to
//     make the intentional omission visible.
#[allow(dead_code, unused_variables, clippy::items_after_statements)]
fn _assert_synth_params_coverage(p: SynthParams) {
    use cosmo_synth_engine::params::{
        ChorusParams, CzLineParams, DelayParams, FilterParams, LineParams, LfoParams,
        PortamentoParams, ReverbParams, VibratoParams,
    };

    let SynthParams {
        line_select,
        mod_mode,
        ring_gain: _ring_gain,             // intentionally not a VST param
        octave,
        line1,
        line2,
        int_pm_amount,
        int_pm_ratio,
        ext_pm_amount,
        pm_pre,
        frequency: _frequency,             // set by the MIDI layer, not a VST param
        volume,
        poly_mode,
        legato,
        velocity_target,
        chorus,
        delay,
        reverb,
        vibrato,
        portamento,
        lfo,
        filter,
        pitch_bend_range: _pitch_bend_range,               // not yet a VST param
        mod_wheel_vibrato_depth: _mod_wheel_vibrato_depth, // not yet a VST param
        mod_matrix: _mod_matrix,                           // not yet a VST param
    } = p;

    let ChorusParams { rate: _cho_rate, depth: _cho_depth, mix: _cho_mix } = chorus;
    let DelayParams { time: _del_time, feedback: _del_fb, mix: _del_mix } = delay;
    let ReverbParams { size: _rev_size, mix: _rev_mix } = reverb;
    let VibratoParams {
        enabled: _vib_enabled,
        waveform: _vib_waveform,
        rate: _vib_rate,
        depth: _vib_depth,
        delay: _vib_delay,
    } = vibrato;
    let PortamentoParams {
        enabled: _port_enabled,
        mode: _port_mode,
        rate: _port_rate,
        time: _port_time,
    } = portamento;
    let LfoParams {
        enabled: _lfo_enabled,
        waveform: _lfo_waveform,
        rate: _lfo_rate,
        depth: _lfo_depth,
        target: _lfo_target,
        offset: _lfo_offset,
    } = lfo;
    let FilterParams {
        enabled: _fil_enabled,
        filter_type: _fil_type,
        cutoff: _fil_cutoff,
        resonance: _fil_res,
        env_amount: _fil_env,
    } = filter;

    // Both lines must be destructured exhaustively.
    let LineParams {
        algo: _l1_algo,
        algo2: _l1_algo2,
        algo_blend: _l1_blend,
        dcw_comp: _l1_dcw_comp,
        window: _l1_window,
        dca_base: _l1_dca,
        dcw_base: _l1_dcw,
        dco_depth: _l1_dco,
        modulation: _l1_mod,
        detune_cents: _l1_detune,
        octave: _l1_octave,
        dco_env: _,
        dcw_env: _,
        dca_env: _,
        key_follow: _l1_kf,
        cz: _l1_cz,
        algo_controls: _l1_algo_controls, // not yet a VST param — routed via IPC
    } = line1;
    let CzLineParams {
        slot_a_waveform: _l1_slot_a,
        slot_b_waveform: _l1_slot_b,
        window: _l1_cz_window,
    } = _l1_cz;

    let LineParams {
        algo: _l2_algo,
        algo2: _l2_algo2,
        algo_blend: _l2_blend,
        dcw_comp: _l2_dcw_comp,
        window: _l2_window,
        dca_base: _l2_dca,
        dcw_base: _l2_dcw,
        dco_depth: _l2_dco,
        modulation: _l2_mod,
        detune_cents: _l2_detune,
        octave: _l2_octave,
        dco_env: _,
        dcw_env: _,
        dca_env: _,
        key_follow: _l2_kf,
        cz: _l2_cz,
        algo_controls: _l2_algo_controls, // not yet a VST param — routed via IPC
    } = line2;
    let CzLineParams {
        slot_a_waveform: _l2_slot_a,
        slot_b_waveform: _l2_slot_b,
        window: _l2_cz_window,
    } = _l2_cz;

    // Suppress unused-variable warnings for fields that ARE mapped to VST params.
    let _ = (
        line_select, mod_mode, octave, int_pm_amount, int_pm_ratio, ext_pm_amount,
        pm_pre, volume, poly_mode, legato, velocity_target,
    );
}

#[derive(Clone, Default)]
struct EnvelopeState {
    l1_dco: StepEnvData,
    l1_dcw: StepEnvData,
    l1_dca: StepEnvData,
    l2_dco: StepEnvData,
    l2_dcw: StepEnvData,
    l2_dca: StepEnvData,
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

struct CzWebViewHandler {
    envelopes: Arc<RwLock<EnvelopeState>>,
    scope_buffer: ScopeBuffer,
}

impl CzWebViewHandler {
    fn parse_set_envelope_args(
        args: &[serde_json::Value],
    ) -> Result<(&str, StepEnvData), String> {
        if args.len() == 2 {
            let envelope_id = args[0]
                .as_str()
                .ok_or_else(|| "setEnvelope expects envelope id as first argument".to_string())?;
            let data: StepEnvData = serde_json::from_value(args[1].clone())
                .map_err(|error| format!("invalid envelope payload: {error}"))?;
            return Ok((envelope_id, data));
        }

        let payload = args
            .first()
            .ok_or_else(|| "setEnvelope expects at least one argument".to_string())?;
        let envelope_id = payload
            .get("envelope_id")
            .or_else(|| payload.get("envelopeId"))
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| "setEnvelope payload is missing envelope_id".to_string())?;
        let data_value = payload
            .get("data")
            .cloned()
            .ok_or_else(|| "setEnvelope payload is missing data".to_string())?;
        let data: StepEnvData = serde_json::from_value(data_value)
            .map_err(|error| format!("invalid envelope payload: {error}"))?;
        Ok((envelope_id, data))
    }
}

impl WebViewHandler for CzWebViewHandler {
    fn on_invoke(
        &self,
        method: &str,
        args: &[serde_json::Value],
    ) -> Result<serde_json::Value, String> {
        append_log(&format!("webview invoke method={method} args={}", args.len()));

        match method {
            "setEnvelope" => {
                let (envelope_id, data) = Self::parse_set_envelope_args(args)?;
                let mut envelopes = self
                    .envelopes
                    .write()
                    .map_err(|_| "envelope store is poisoned".to_string())?;
                envelopes.set(envelope_id, data)?;
                append_log(&format!("setEnvelope envelope_id={envelope_id}"));
                Ok(serde_json::Value::Null)
            }
            "getEnvelopes" => {
                let envelopes = self
                    .envelopes
                    .read()
                    .map_err(|_| "envelope store is poisoned".to_string())?;
                append_log("getEnvelopes");
                Ok(envelopes.to_json())
            }
            "getScopeData" => {
                let scope = self
                    .scope_buffer
                    .lock()
                    .map_err(|_| "scope buffer is poisoned".to_string())?;
                if scope.samples.is_empty() {
                    return Ok(serde_json::json!({
                        "samples": serde_json::Value::Array(vec![]),
                        "sampleRate": scope.sample_rate,
                        "hz": 0.0_f64,
                    }));
                }
                let linear = scope.to_linear();
                // Quantise to i8 (–127..127) for a compact JSON payload.
                // The JS side rescales by dividing by 127.0.
                let int_samples: Vec<i8> = linear
                    .iter()
                    .map(|&s| (s.clamp(-1.0, 1.0) * 127.0) as i8)
                    .collect();
                Ok(serde_json::json!({
                    "samples": int_samples,
                    "sampleRate": scope.sample_rate,
                    "hz": scope.hz,
                }))
            }
            _ => {
                append_log(&format!("unknown webview method={method}"));
                Err(format!("unknown method: {method}"))
            }
        }
    }
}

// =============================================================================
// Descriptor (unprepared state)
// =============================================================================

#[beamer::export]
#[derive(Default, HasParameters)]
pub struct CzDescriptor {
    #[parameters]
    pub parameters: CzParameters,
    envelopes: Arc<RwLock<EnvelopeState>>,
    scope_buffer: ScopeBuffer,
}

impl Descriptor for CzDescriptor {
    type Setup = SampleRate;
    type Processor = CzProcessor;

    fn input_bus_count(&self) -> usize {
        0
    }

    fn input_bus_info(&self, _index: usize) -> Option<BusInfo> {
        None
    }

    fn output_bus_info(&self, index: usize) -> Option<BusInfo> {
        if index == 0 {
            Some(BusInfo::stereo("Output"))
        } else {
            None
        }
    }

    fn wants_midi(&self) -> bool {
        true
    }

    fn webview_handler(&self) -> Option<Arc<dyn WebViewHandler>> {
        append_log("descriptor created webview handler");
        Some(Arc::new(CzWebViewHandler {
            envelopes: self.envelopes.clone(),
            scope_buffer: self.scope_buffer.clone(),
        }))
    }

    fn prepare(self, setup: SampleRate) -> CzProcessor {
        append_log(&format!(
            "prepare sample_rate_hz={} log_path={}",
            setup.hz(),
            plugin_log_path()
        ));
        let mut processor = CosmoProcessor::new(setup.hz() as f32);
        let mut synth_params = self.parameters.to_synth_params();
        let cached_envelopes = self
            .envelopes
            .read()
            .map(|envelopes| envelopes.clone())
            .unwrap_or_default();
        cached_envelopes.apply_to(&mut synth_params);
        processor.set_params(synth_params);
        CzProcessor {
            parameters: self.parameters,
            processor,
            envelopes: self.envelopes,
            cached_envelopes,
            scope_buffer: self.scope_buffer,
        }
    }
}

// =============================================================================
// Processor (prepared state)
// =============================================================================

#[derive(HasParameters)]
pub struct CzProcessor {
    #[parameters]
    pub parameters: CzParameters,
    processor: CosmoProcessor,
    envelopes: Arc<RwLock<EnvelopeState>>,
    cached_envelopes: EnvelopeState,
    scope_buffer: ScopeBuffer,
}

impl Processor for CzProcessor {
    type Descriptor = CzDescriptor;

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &ProcessContext,
    ) {
        // Pull the host-automated parameter snapshot each block and mirror it into DSP state.
        if let Ok(envelopes) = self.envelopes.try_read() {
            self.cached_envelopes = envelopes.clone();
        }

        let mut synth_params = self.parameters.to_synth_params();
        self.cached_envelopes.apply_to(&mut synth_params);
        self.processor.set_params(synth_params);

        let num_samples = buffer.num_samples();
        let num_channels = buffer.num_output_channels();

        // Process mono output from synth
        let mut mono_output = vec![0.0f32; num_samples];
        self.processor.process(&mut mono_output);

        // Feed scope buffer (non-blocking try_lock; skip if GUI is reading).
        let hz = self
            .processor
            .voices
            .iter()
            .filter(|v| !v.is_silent && !v.is_releasing && v.note.is_some())
            .map(|v| v.current_freq)
            .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .unwrap_or(0.0);
        if let Ok(mut scope) = self.scope_buffer.try_lock() {
            scope.push_block(&mono_output, self.processor.sample_rate, hz);
        }

        // Write to all output channels
        for ch in 0..num_channels {
            let out = buffer.output(ch);
            for sample_idx in 0..num_samples {
                out[sample_idx] = mono_output[sample_idx];
            }
        }
    }

    fn process_midi(&mut self, input: &[MidiEvent], _output: &mut MidiBuffer) {
        for event in input {
            match &event.event {
                MidiEventKind::NoteOn(note) if note.velocity > 0.0 => {
                    let freq = midi_note_to_freq(note.pitch);
                    self.processor.note_on(note.pitch, freq, note.velocity);
                }
                MidiEventKind::NoteOff(note) => {
                    self.processor.note_off(note.pitch);
                }
                MidiEventKind::ControlChange(cc) => {
                    match cc.controller {
                        1 => {
                            // Mod wheel (already 0.0-1.0)
                            self.processor.set_mod_wheel(cc.value);
                        }
                        64 => {
                            // Sustain pedal (already 0.0-1.0)
                            self.processor.set_sustain(cc.value >= 0.5);
                        }
                        _ => {}
                    }
                }
                MidiEventKind::PitchBend(pb) => {
                    // Pitch bend is already -1.0 to 1.0
                    self.processor.set_pitch_bend(pb.value);
                }
                _ => {}
            }
        }
    }

    fn wants_midi(&self) -> bool {
        true
    }

    fn tail_samples(&self) -> u32 {
        0
    }
}

