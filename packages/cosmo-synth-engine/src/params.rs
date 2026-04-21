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

/// Low-level CZ waveform selector.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum CzWaveform {
    #[default]
    Saw,
    Square,
    Pulse,
    Null,
    SinePulse,
    SawPulse,
    MultiSine,
    Pulse2,
}

/// Front-panel CZ algorithm shortcuts.
///
/// These map to a `(CzWaveform, WindowType)` pair.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum CzAlgo {
    #[default]
    Saw,
    Square,
    Pulse,
    DoubleSine,
    SawPulse,
    Reso1,
    Reso2,
    Reso3,
}

impl CzAlgo {
    pub fn waveform(self) -> CzWaveform {
        match self {
            CzAlgo::Saw => CzWaveform::Saw,
            CzAlgo::Square => CzWaveform::Square,
            CzAlgo::Pulse => CzWaveform::Pulse,
            CzAlgo::DoubleSine => CzWaveform::SinePulse,
            CzAlgo::SawPulse => CzWaveform::SawPulse,
            CzAlgo::Reso1 | CzAlgo::Reso2 | CzAlgo::Reso3 => CzWaveform::MultiSine,
        }
    }

    pub fn window(self) -> WindowType {
        match self {
            CzAlgo::Saw
            | CzAlgo::Square
            | CzAlgo::Pulse
            | CzAlgo::DoubleSine
            | CzAlgo::SawPulse => WindowType::Off,
            CzAlgo::Reso1 => WindowType::Saw,
            CzAlgo::Reso2 => WindowType::Triangle,
            CzAlgo::Reso3 => WindowType::Trapezoid,
        }
    }
}

/// Flat algorithm selector — unifies CZ waveforms and warp variants.
/// Serializes as plain camelCase string (e.g., "saw", "bend", "sync").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum Algo {
    // CZ waveforms — phase distortion with piecewise-linear carrier
    #[serde(alias = "czSaw")]
    Saw,
    #[serde(alias = "czSquare")]
    Square,
    #[serde(alias = "czPulse")]
    Pulse,
    Null,
    #[serde(alias = "czDoubleSine")]
    SinePulse,
    #[serde(alias = "czSawPulse")]
    SawPulse,
    #[serde(alias = "czReso1", alias = "czReso2", alias = "czReso3")]
    MultiSine,
    Pulse2,
    // Warp algorithms — phase distortion applied to a sine carrier
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

impl Algo {
    /// Convert a CZ waveform identifier into its corresponding `Algo` variant.
    pub fn from_cz_waveform(waveform: CzWaveform) -> Self {
        match waveform {
            CzWaveform::Saw => Algo::Saw,
            CzWaveform::Square => Algo::Square,
            CzWaveform::Pulse => Algo::Pulse,
            CzWaveform::Null => Algo::Null,
            CzWaveform::SinePulse => Algo::SinePulse,
            CzWaveform::SawPulse => Algo::SawPulse,
            CzWaveform::MultiSine => Algo::MultiSine,
            CzWaveform::Pulse2 => Algo::Pulse2,
        }
    }

    pub fn as_cz_waveform(self) -> Option<CzWaveform> {
        match self {
            Algo::Saw => Some(CzWaveform::Saw),
            Algo::Square => Some(CzWaveform::Square),
            Algo::Pulse => Some(CzWaveform::Pulse),
            Algo::Null => Some(CzWaveform::Null),
            Algo::SinePulse => Some(CzWaveform::SinePulse),
            Algo::SawPulse => Some(CzWaveform::SawPulse),
            Algo::MultiSine => Some(CzWaveform::MultiSine),
            Algo::Pulse2 => Some(CzWaveform::Pulse2),
            _ => None,
        }
    }

    pub fn is_cz_waveform(self) -> bool {
        self.as_cz_waveform().is_some()
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
    Trapezoid,
    Pulse,
    DoubleSaw,
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

/// Per-line CZ slot controls.
///
/// Slot A/Slot B alternate per cycle in CZ mode. Setting both slots to the
/// same waveform effectively yields single-wave behavior.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct CzLineParams {
    pub slot_a_waveform: CzWaveform,
    pub slot_b_waveform: CzWaveform,
    pub window: WindowType,
}

impl Default for CzLineParams {
    fn default() -> Self {
        Self {
            slot_a_waveform: CzWaveform::Saw,
            slot_b_waveform: CzWaveform::Saw,
            window: WindowType::Off,
        }
    }
}

/// One algorithm-specific control value persisted on a line.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoControlValueV1 {
    pub id: String,
    pub value: f32,
}

/// Per-line parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct LineParams {
    pub algo: Algo,
    pub algo2: Option<Algo>,
    pub algo_blend: f32,
    pub dcw_comp: f32,
    pub window: WindowType,
    pub dca_base: f32,
    pub dcw_base: f32,
    pub dco_depth: f32,
    pub modulation: f32,
    pub detune_cents: f32,
    pub octave: f32,
    pub dco_env: StepEnvData,
    pub dcw_env: StepEnvData,
    pub dca_env: StepEnvData,
    pub key_follow: f32,
	#[serde(default)]
	pub cz: CzLineParams,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub algo_controls: Option<Vec<AlgoControlValueV1>>,
}

impl Default for LineParams {
    fn default() -> Self {
        Self {
            algo: Algo::Saw,
            algo2: None,
            algo_blend: 0.0,
            dcw_comp: 0.0,
            window: WindowType::Off,
            dca_base: 1.0,
            dcw_base: 0.0,
            dco_depth: 0.0,
            modulation: 0.0,
            detune_cents: 0.0,
            octave: 0.0,
            dco_env: StepEnvData::default(),
            dcw_env: StepEnvData::default(),
            dca_env: StepEnvData::default(),
            key_follow: 0.0,
			cz: CzLineParams::default(),
            algo_controls: None,
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
    /// Modulation matrix – routes from sources to destinations with amounts.
    #[serde(default)]
    pub mod_matrix: ModMatrix,
}

pub(crate) fn default_pitch_bend_range() -> f32 {
    2.0
}

/// Modulation source identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum ModSource {
    Lfo1,
    /// LFO2 – UI/types stub only; DSP contribution is always 0.0 this phase
    Lfo2,
    Velocity,
    ModWheel,
    Aftertouch,
}

/// Modulation destination – covers the full synth parameter surface
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum ModDestination {
    // Global
    Volume,
    Pitch,
    IntPmAmount,
    // Line 1
    Line1DcwBase,
    Line1DcaBase,
    Line1DcoDepth,
    Line1AlgoBlend,
    Line1DcwComp,
    Line1Detune,
    Line1Octave,
    // Line 1 algo control slots (DSP stub – amount = 0.0)
    Line1AlgoParam1,
    Line1AlgoParam2,
    Line1AlgoParam3,
    Line1AlgoParam4,
    Line1AlgoParam5,
    Line1AlgoParam6,
    Line1AlgoParam7,
    Line1AlgoParam8,
    // Line 2
    Line2DcwBase,
    Line2DcaBase,
    Line2DcoDepth,
    Line2AlgoBlend,
    Line2DcwComp,
    Line2Detune,
    Line2Octave,
    // Line 2 algo control slots (DSP stub – amount = 0.0)
    Line2AlgoParam1,
    Line2AlgoParam2,
    Line2AlgoParam3,
    Line2AlgoParam4,
    Line2AlgoParam5,
    Line2AlgoParam6,
    Line2AlgoParam7,
    Line2AlgoParam8,
    // Filter
    FilterCutoff,
    FilterResonance,
    FilterEnvAmount,
    // FX
    ChorusMix,
    DelayMix,
    ReverbMix,
    // Vibrato / LFO
    VibratoDepth,
    LfoDepth,
    LfoRate,
}

/// A single modulation routing assignment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct ModRoute {
    pub source: ModSource,
    pub destination: ModDestination,
    /// Modulation amount in range [-2.0, 2.0]
    pub amount: f32,
    pub enabled: bool,
}

/// The full modulation matrix (list of routes)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct ModMatrix {
    pub routes: Vec<ModRoute>,
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
            mod_matrix: ModMatrix::default(),
        }
    }
}
