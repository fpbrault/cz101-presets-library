use serde::{Deserialize, Serialize};

pub const NUM_VOICES: usize = 8;
pub const NUM_ENV_STEPS: usize = 8;

/// A single step in a step envelope
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct EnvStep {
    /// Level [0.0, 1.0]
    pub level: f32,
    /// Rate [0, 99]
    pub rate: u8,
}

/// Step envelope data (CZ-style)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepEnvData {
    pub steps: [EnvStep; NUM_ENV_STEPS],
    /// Which step to sustain on (0-based index into steps)
    pub sustain_step: usize,
    /// Whether envelope loops after end
    pub loop_: bool,
}

impl Default for StepEnvData {
    fn default() -> Self {
        // mirrors DEFAULT_STEP_ENV in the JS
        Self {
            steps: [
                EnvStep {
                    level: 1.0,
                    rate: 90,
                },
                EnvStep {
                    level: 1.0,
                    rate: 99,
                },
                EnvStep {
                    level: 1.0,
                    rate: 99,
                },
                EnvStep {
                    level: 1.0,
                    rate: 99,
                },
                EnvStep {
                    level: 1.0,
                    rate: 99,
                },
                EnvStep {
                    level: 1.0,
                    rate: 99,
                },
                EnvStep {
                    level: 1.0,
                    rate: 99,
                },
                EnvStep {
                    level: 0.0,
                    rate: 60,
                },
            ],
            sustain_step: 1,
            loop_: false,
        }
    }
}

/// Warp algorithm selector (mirrors the JS algo string)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum WarpAlgo {
    #[default]
    Cz101,
    Bend,
    Sync,
    Pinch,
    Fold,
    Skew,
    Quantize,
    Twist,
    Clip,
    Ripple,
    Mirror,
    Fof,
    Karpunk,
    Sine,
}

/// CZ waveform id [1-8]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[repr(u8)]
pub enum WaveformId {
    #[default]
    Saw = 1,
    Square = 2,
    Pulse = 3,
    Null = 4,
    SinePulse = 5,
    SawPulse = 6,
    MultiSine = 7,
    Pulse2 = 8,
}

impl WaveformId {
    pub fn from_u8(v: u8) -> Self {
        match v {
            1 => WaveformId::Saw,
            2 => WaveformId::Square,
            3 => WaveformId::Pulse,
            4 => WaveformId::Null,
            5 => WaveformId::SinePulse,
            6 => WaveformId::SawPulse,
            7 => WaveformId::MultiSine,
            8 => WaveformId::Pulse2,
            _ => WaveformId::Saw,
        }
    }
}

/// Window type applied to oscillator output
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum WindowType {
    #[default]
    Off,
    Saw,
    Triangle,
}

/// Line select
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum LineSelect {
    #[serde(rename = "L1+L2")]
    #[default]
    L1PlusL2,
    #[serde(rename = "L1")]
    L1,
    #[serde(rename = "L2")]
    L2,
    #[serde(rename = "L1+L1'")]
    L1PlusL1Prime,
    #[serde(rename = "L1+L2'")]
    L1PlusL2Prime,
}

/// Modulation mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum ModMode {
    #[default]
    Normal,
    Ring,
    Noise,
}

/// Polyphony mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum PolyMode {
    #[default]
    #[serde(rename = "poly8")]
    Poly8,
    Mono,
}

/// Velocity routing target
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum VelocityTarget {
    #[default]
    Amp,
    Dcw,
    Both,
}

/// LFO waveform
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum LfoWaveform {
    #[default]
    Sine,
    Triangle,
    Square,
    Saw,
}

/// Filter type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum FilterType {
    #[default]
    #[serde(rename = "lp")]
    Lp,
    #[serde(rename = "hp")]
    Hp,
    #[serde(rename = "bp")]
    Bp,
}

/// Portamento mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum PortamentoMode {
    #[default]
    Rate,
    Time,
}

/// Per-line parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineParams {
    pub waveform: WaveformId,
    pub waveform2: WaveformId,
    pub algo2: Option<WarpAlgo>,
    pub algo_blend: f32,
    pub dcw_comp: f32,
    pub window: WindowType,
    pub dca_base: f32,
    pub dcw_base: f32,
    pub dco_depth: f32,
    pub modulation: f32,
    pub warp_algo: WarpAlgo,
    pub detune_cents: f32,
    pub octave: f32,
    pub dco_env: StepEnvData,
    pub dcw_env: StepEnvData,
    pub dca_env: StepEnvData,
    pub key_follow: f32,
}

impl Default for LineParams {
    fn default() -> Self {
        Self {
            waveform: WaveformId::Saw,
            waveform2: WaveformId::Saw,
            algo2: None,
            algo_blend: 0.0,
            dcw_comp: 0.0,
            window: WindowType::Off,
            dca_base: 1.0,
            dcw_base: 0.0,
            dco_depth: 0.0,
            modulation: 0.0,
            warp_algo: WarpAlgo::Cz101,
            detune_cents: 0.0,
            octave: 0.0,
            dco_env: StepEnvData::default(),
            dcw_env: StepEnvData::default(),
            dca_env: StepEnvData::default(),
            key_follow: 0.0,
        }
    }
}

/// Chorus parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChorusParams {
    pub rate: f32,
    pub depth: f32,
    pub mix: f32,
}

impl Default for ChorusParams {
    fn default() -> Self {
        Self {
            rate: 0.8,
            depth: 0.003,
            mix: 0.0,
        }
    }
}

/// Delay parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelayParams {
    pub time: f32,
    pub feedback: f32,
    pub mix: f32,
}

impl Default for DelayParams {
    fn default() -> Self {
        Self {
            time: 0.3,
            feedback: 0.35,
            mix: 0.0,
        }
    }
}

/// Reverb parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReverbParams {
    pub size: f32,
    pub mix: f32,
}

impl Default for ReverbParams {
    fn default() -> Self {
        Self {
            size: 0.5,
            mix: 0.0,
        }
    }
}

/// Vibrato parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VibratoParams {
    pub enabled: bool,
    pub waveform: LfoWaveform,
    /// Rate in Hz
    pub rate: f32,
    /// Depth in "per mille" (divide by 1000 for pitch multiplier)
    pub depth: f32,
    /// Delay in milliseconds
    pub delay: f32,
}

impl Default for VibratoParams {
    fn default() -> Self {
        Self {
            enabled: false,
            waveform: LfoWaveform::Sine,
            rate: 30.0,
            depth: 30.0,
            delay: 0.0,
        }
    }
}

/// Portamento parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortamentoParams {
    pub enabled: bool,
    pub mode: PortamentoMode,
    pub rate: f32,
    pub time: f32,
}

impl Default for PortamentoParams {
    fn default() -> Self {
        Self {
            enabled: false,
            mode: PortamentoMode::Rate,
            rate: 50.0,
            time: 0.5,
        }
    }
}

/// LFO target
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum LfoTarget {
    #[default]
    Pitch,
    Dcw,
    Dca,
    Filter,
}

/// LFO parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LfoParams {
    pub enabled: bool,
    pub waveform: LfoWaveform,
    /// Rate in Hz
    pub rate: f32,
    /// Depth [0, 1]
    pub depth: f32,
    pub target: LfoTarget,
}

impl Default for LfoParams {
    fn default() -> Self {
        Self {
            enabled: false,
            waveform: LfoWaveform::Sine,
            rate: 5.0,
            depth: 0.0,
            target: LfoTarget::Pitch,
        }
    }
}

/// Filter parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterParams {
    pub enabled: bool,
    #[serde(rename = "type")]
    pub filter_type: FilterType,
    pub cutoff: f32,
    pub resonance: f32,
    pub env_amount: f32,
}

impl Default for FilterParams {
    fn default() -> Self {
        Self {
            enabled: false,
            filter_type: FilterType::Lp,
            cutoff: 5000.0,
            resonance: 0.0,
            env_amount: 0.0,
        }
    }
}

/// Top-level synth parameters (mirrors this.params in the JS)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthParams {
    pub line_select: LineSelect,
    pub mod_mode: ModMode,
    pub octave: f32,
    pub line1: LineParams,
    pub line2: LineParams,
    pub int_pm_amount: f32,
    pub int_pm_ratio: f32,
    pub ext_pm_amount: f32,
    pub pm_pre: bool,
    pub frequency: f32,
    pub volume: f32,
    pub poly_mode: PolyMode,
    pub legato: bool,
    pub velocity_target: VelocityTarget,
    pub chorus: ChorusParams,
    pub delay: DelayParams,
    pub reverb: ReverbParams,
    pub vibrato: VibratoParams,
    pub portamento: PortamentoParams,
    pub lfo: LfoParams,
    pub filter: FilterParams,
}

impl Default for SynthParams {
    fn default() -> Self {
        Self {
            line_select: LineSelect::default(),
            mod_mode: ModMode::default(),
            octave: 0.0,
            line1: LineParams::default(),
            line2: LineParams::default(),
            int_pm_amount: 0.0,
            int_pm_ratio: 1.0,
            ext_pm_amount: 0.0,
            pm_pre: true,
            frequency: 220.0,
            volume: 0.4,
            poly_mode: PolyMode::default(),
            legato: false,
            velocity_target: VelocityTarget::default(),
            chorus: ChorusParams::default(),
            delay: DelayParams::default(),
            reverb: ReverbParams::default(),
            vibrato: VibratoParams::default(),
            portamento: PortamentoParams::default(),
            lfo: LfoParams::default(),
            filter: FilterParams::default(),
        }
    }
}
