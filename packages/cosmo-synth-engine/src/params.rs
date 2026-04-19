use serde::{Deserialize, Deserializer, Serialize};
#[cfg(feature = "specta-bindings")]
use specta::Type;

pub const NUM_VOICES: usize = 8;
pub const NUM_ENV_STEPS: usize = 8;

/// A single step in a step envelope
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
pub struct EnvStep {
    /// Level [0.0, 1.0]
    pub level: f32,
    /// Rate [0, 99] — JS may send floats; we round to u8.
    #[serde(deserialize_with = "deserialize_rate")]
    pub rate: u8,
}

/// Accept rate as either integer or float, round to u8.
fn deserialize_rate<'de, D: Deserializer<'de>>(d: D) -> Result<u8, D::Error> {
    let v = f64::deserialize(d)?;
    Ok(v.round().clamp(0.0, 99.0) as u8)
}

/// Step envelope data (CZ-style)
///
/// Field names match the JS `StepEnvData` type exactly (camelCase).
/// `steps` is always stored as a fixed [EnvStep; 8] internally; JS may
/// send a shorter array which gets padded with silent steps.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct StepEnvData {
    #[cfg_attr(feature = "specta-bindings", specta(type = Vec<EnvStep>))]
    pub steps: [EnvStep; NUM_ENV_STEPS],
    /// Which step to sustain on (0-based index into steps)
    #[cfg_attr(feature = "specta-bindings", specta(type = u32))]
    pub sustain_step: usize,
    /// Number of active steps (JS `stepCount`)
    #[cfg_attr(feature = "specta-bindings", specta(type = u32))]
    pub step_count: usize,
    /// Whether envelope loops after end
    #[serde(rename = "loop")]
    pub loop_: bool,
}

impl<'de> Deserialize<'de> for StepEnvData {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Raw {
            steps: Vec<EnvStep>,
            sustain_step: usize,
            /// JS `stepCount` — older data may omit it; default to full length
            #[serde(default)]
            step_count: usize,
            #[serde(rename = "loop", default)]
            loop_: bool,
        }
        let mut raw = Raw::deserialize(d)?;
        // If step_count was missing or 0, use the number of provided steps
        if raw.step_count == 0 {
            raw.step_count = raw.steps.len().max(1);
        }
        let mut steps = [EnvStep {
            level: 0.0,
            rate: 0,
        }; NUM_ENV_STEPS];
        for (i, s) in raw.steps.iter().enumerate().take(NUM_ENV_STEPS) {
            steps[i] = *s;
        }
        Ok(StepEnvData {
            steps,
            sustain_step: raw.sustain_step,
            step_count: raw.step_count,
            loop_: raw.loop_,
        })
    }
}

impl Default for StepEnvData {
    fn default() -> Self {
        // mirrors DEFAULT_DCA_ENV in pdAlgorithms.ts
        Self {
            steps: [
                EnvStep {
                    level: 1.0,
                    rate: 75,
                },
                EnvStep {
                    level: 0.8,
                    rate: 80,
                },
                EnvStep {
                    level: 0.8,
                    rate: 75,
                },
                EnvStep {
                    level: 0.0,
                    rate: 40,
                },
                EnvStep {
                    level: 0.0,
                    rate: 50,
                },
                EnvStep {
                    level: 0.0,
                    rate: 50,
                },
                EnvStep {
                    level: 0.0,
                    rate: 50,
                },
                EnvStep {
                    level: 0.0,
                    rate: 50,
                },
            ],
            sustain_step: 2,
            step_count: 4,
            loop_: false,
        }
    }
}

/// Warp algorithm selector (mirrors the JS algo string)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
///
/// JS sends these as integers (1-8), so we deserialize from `u8`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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

impl Serialize for WaveformId {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_u8(*self as u8)
    }
}

impl<'de> Deserialize<'de> for WaveformId {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let v = u8::deserialize(d)?;
        Ok(WaveformId::from_u8(v))
    }
}

/// Window type applied to oscillator output
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum WindowType {
    #[default]
    Off,
    Saw,
    Triangle,
}

/// Line select
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum ModMode {
    #[default]
    Normal,
    Ring,
    Noise,
}

/// Polyphony mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum PolyMode {
    #[default]
    #[serde(rename = "poly8")]
    Poly8,
    Mono,
}

/// Velocity routing target
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum VelocityTarget {
    #[default]
    Amp,
    Dcw,
    Both,
    /// JS "off" means velocity is ignored (worklet passes 0 velocity)
    Off,
}

/// LFO waveform
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum PortamentoMode {
    #[default]
    Rate,
    Time,
}

/// Per-line parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct LineParams {
    #[cfg_attr(feature = "specta-bindings", specta(type = u8))]
    pub waveform: WaveformId,
    #[cfg_attr(feature = "specta-bindings", specta(type = u8))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
pub struct VibratoParams {
    pub enabled: bool,
    /// Waveform as integer 1-4 (JS sends a number: 1=sine 2=tri 3=sq 4=saw)
    pub waveform: u8,
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
            waveform: 1,
            rate: 30.0,
            depth: 30.0,
            delay: 0.0,
        }
    }
}

/// Portamento parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
pub struct LfoParams {
    pub enabled: bool,
    pub waveform: LfoWaveform,
    /// Rate in Hz
    pub rate: f32,
    /// Depth [0, 1]
    pub depth: f32,
    pub target: LfoTarget,
    /// DC offset/bias applied to LFO output [-1, 1]
    #[serde(default)]
    pub offset: f32,
}

impl Default for LfoParams {
    fn default() -> Self {
        Self {
            enabled: false,
            waveform: LfoWaveform::Sine,
            rate: 5.0,
            depth: 0.0,
            target: LfoTarget::Pitch,
            offset: 0.0,
        }
    }
}

/// Filter parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
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
#[cfg_attr(feature = "specta-bindings", derive(Type))]
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
    /// Pitch bend wheel range in semitones (1-24). Default 2.
    #[serde(default = "default_pitch_bend_range")]
    pub pitch_bend_range: f32,
    /// How much the mod wheel adds to vibrato depth (0-99 UI units).
    /// When mod wheel is at max (1.0), vibrato depth is boosted by this amount.
    #[serde(default)]
    pub mod_wheel_vibrato_depth: f32,
}

pub(crate) fn default_pitch_bend_range() -> f32 {
    2.0
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
            pitch_bend_range: 2.0,
            mod_wheel_vibrato_depth: 0.0,
        }
    }
}
