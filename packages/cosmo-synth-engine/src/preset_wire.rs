use serde::{Deserialize, Serialize};
#[cfg(feature = "specta-bindings")]
use specta::Type;

use crate::params::{
    default_pitch_bend_range, Algo, ChorusParams, DelayParams, FilterParams, FilterType, LfoParams,
    LfoTarget, LfoWaveform, LineParams, LineSelect, ModMode, PolyMode, PortamentoMode,
    PortamentoParams, ReverbParams, StepEnvData, SynthParams, VelocityTarget, VibratoParams,
    WindowType,
};

pub const SYNTH_SCHEMA_VERSION_V1: u16 = 1;

fn default_schema_version_v1() -> u16 {
    SYNTH_SCHEMA_VERSION_V1
}

/// Canonical, versioned synth preset wire contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct SynthPresetV1 {
    #[serde(default = "default_schema_version_v1")]
    pub schema_version: u16,
    pub params: SynthParams,
}

impl Default for SynthPresetV1 {
    fn default() -> Self {
        Self {
            schema_version: SYNTH_SCHEMA_VERSION_V1,
            params: SynthParams::default(),
        }
    }
}

/// Flat algorithm selection unifying waveforms and warp variants.
/// Serializes as plain camelCase string (e.g., "saw", "bend", "sync").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum AlgoRefV1 {
    // Front-panel CZ algorithms
    CzSaw,
    CzSquare,
    CzPulse,
    CzDoubleSine,
    CzSawPulse,
    CzReso1,
    CzReso2,
    CzReso3,
    // Waveforms
    Saw,
    Square,
    Pulse,
    Null,
    SinePulse,
    SawPulse,
    MultiSine,
    Pulse2,
    // Warp algorithms
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

/// UI catalog entry for algorithm pickers.
///
/// This is exported to TypeScript so frontend option labels/icons are Rust-owned.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoUiEntryV1 {
    pub id: AlgoRefV1,
    pub label: &'static str,
    pub icon_path: &'static str,
    pub visible: bool,
}

pub const ALGO_UI_CATALOG_V1: [AlgoUiEntryV1; 20] = [
    // CZ front-panel algorithms (first-class)
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzSaw,
        label: "CZ Saw",
        icon_path: "M4,4 L20,20",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzSquare,
        label: "CZ Square",
        icon_path: "M4,4 L12,4 L12,20 L20,20",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzPulse,
        label: "CZ Pulse",
        icon_path: "M4,20 L8,20 L8,4 L16,4 L16,20 L20,20",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzDoubleSine,
        label: "CZ DoubleSine",
        icon_path: "M4,12 C6,4 10,4 12,12 C14,20 18,20 20,12",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzSawPulse,
        label: "CZ SawPulse",
        icon_path: "M4,20 L7,4 L9,20 L12,4 L14,20 L17,4 L20,20",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzReso1,
        label: "CZ Reso1",
        icon_path: "M4,18 C7,6 9,6 12,18 C15,6 17,6 20,18",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzReso2,
        label: "CZ Reso2",
        icon_path: "M4,18 C6,4 10,4 12,12 C14,20 18,20 20,6",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::CzReso3,
        label: "CZ Reso3",
        icon_path: "M4,12 L8,4 L12,20 L16,4 L20,12",
        visible: true,
    },
    // Warp algorithms
    AlgoUiEntryV1 {
        id: AlgoRefV1::Bend,
        label: "Bend",
        icon_path: "M4,18 C10,18 14,10 20,4",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Sync,
        label: "Sync",
        icon_path: "M4,20 L8,4 L8,20 L12,4 L12,20 L16,4 L16,20 L20,4",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Pinch,
        label: "Pinch",
        icon_path: "M4,12 C8,4 10,12 12,12 C14,12 16,20 20,12",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Fold,
        label: "Fold",
        icon_path: "M4,20 L8,4 L12,20 L16,4 L20,20",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Skew,
        label: "Skew",
        icon_path: "M4,20 L10,6 L20,4",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Twist,
        label: "Twist",
        icon_path: "M4,12 C8,2 16,22 20,12",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Clip,
        label: "Clip",
        icon_path: "M4,16 L8,16 L8,8 L16,8 L16,16 L20,16",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Ripple,
        label: "Ripple",
        icon_path: "M4,12 C6,8 8,16 10,12 C12,8 14,16 16,12 C18,8 19,13 20,12",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Mirror,
        label: "Mirror",
        icon_path: "M4,20 L12,4 L20,20",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Karpunk,
        label: "Karpunk",
        icon_path: "M4,16 C8,2 12,22 16,8 L20,12",
        visible: true,
    },
    AlgoUiEntryV1 {
        id: AlgoRefV1::Fof,
        label: "FOF",
        icon_path: "M4,16 C8,4 10,4 12,16 C14,4 16,4 20,16",
        visible: true,
    },
    // Hidden compatibility entries for persisted values and sysex-level combos.
    AlgoUiEntryV1 {
        id: AlgoRefV1::Cz101,
        label: "CZ101",
        icon_path: "M4,12 L20,12",
        visible: false,
    },
];

pub fn algo_ui_catalog_v1() -> &'static [AlgoUiEntryV1] {
    &ALGO_UI_CATALOG_V1
}

/// TODO: Remove this compatibility shape after all preset reads/writes migrate to `SynthPresetV1`.
/// Temporary compatibility shape matching current flat TS preset storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct SynthPresetFlatV1 {
    #[serde(default = "default_schema_version_v1")]
    pub schema_version: u16,
    pub warp_a_amount: f32,
    pub warp_b_amount: f32,
    pub warp_a_algo: AlgoRefV1,
    pub warp_b_algo: AlgoRefV1,
    pub algo2_a: Option<AlgoRefV1>,
    pub algo2_b: Option<AlgoRefV1>,
    pub algo_blend_a: f32,
    pub algo_blend_b: f32,
    pub int_pm_amount: f32,
    pub int_pm_ratio: f32,
    #[serde(default)]
    pub phase_mod_enabled: bool,
    pub pm_pre: bool,
    pub window_type: WindowType,
    pub volume: f32,
    pub line1_level: f32,
    pub line2_level: f32,
    pub line1_octave: f32,
    pub line2_octave: f32,
    pub line1_detune: f32,
    pub line2_detune: f32,
    pub line1_dco_depth: f32,
    pub line2_dco_depth: f32,
    pub line1_dcw_comp: f32,
    pub line2_dcw_comp: f32,
    pub line1_dco_env: StepEnvData,
    pub line1_dcw_env: StepEnvData,
    pub line1_dca_env: StepEnvData,
    pub line2_dco_env: StepEnvData,
    pub line2_dcw_env: StepEnvData,
    pub line2_dca_env: StepEnvData,
    pub line_select: LineSelect,
    pub mod_mode: ModMode,
    pub poly_mode: PolyMode,
    pub legato: bool,
    pub velocity_target: VelocityTarget,
    pub chorus_enabled: bool,
    pub chorus_rate: f32,
    pub chorus_depth: f32,
    pub chorus_mix: f32,
    pub delay_enabled: bool,
    pub delay_time: f32,
    pub delay_feedback: f32,
    pub delay_mix: f32,
    pub reverb_enabled: bool,
    pub reverb_size: f32,
    pub reverb_mix: f32,
    pub line1_dcw_key_follow: f32,
    #[serde(default)]
    pub line1_dca_key_follow: f32,
    pub line2_dcw_key_follow: f32,
    #[serde(default)]
    pub line2_dca_key_follow: f32,
    pub vibrato_enabled: bool,
    pub vibrato_wave: u8,
    pub vibrato_rate: f32,
    pub vibrato_depth: f32,
    pub vibrato_delay: f32,
    pub portamento_enabled: bool,
    pub portamento_mode: PortamentoMode,
    pub portamento_rate: f32,
    pub portamento_time: f32,
    pub lfo_enabled: bool,
    pub lfo_waveform: LfoWaveform,
    pub lfo_rate: f32,
    pub lfo_depth: f32,
    pub lfo_offset: f32,
    pub lfo_target: LfoTarget,
    pub filter_enabled: bool,
    pub filter_type: FilterType,
    pub filter_cutoff: f32,
    pub filter_resonance: f32,
    pub filter_env_amount: f32,
    #[serde(default = "default_pitch_bend_range")]
    pub pitch_bend_range: f32,
    #[serde(default)]
    pub mod_wheel_vibrato_depth: f32,
}

impl Default for SynthPresetFlatV1 {
    fn default() -> Self {
        Self::from(SynthPresetV1::default())
    }
}

fn algo_ref_window_override(algo: AlgoRefV1) -> Option<WindowType> {
    match algo {
        AlgoRefV1::CzSaw
        | AlgoRefV1::CzSquare
        | AlgoRefV1::CzPulse
        | AlgoRefV1::CzDoubleSine
        | AlgoRefV1::CzSawPulse => Some(WindowType::Off),
        AlgoRefV1::CzReso1 => Some(WindowType::Saw),
        AlgoRefV1::CzReso2 => Some(WindowType::Triangle),
        AlgoRefV1::CzReso3 => Some(WindowType::Trapezoid),
        _ => None,
    }
}

fn algo_ref_to_line(algo: AlgoRefV1) -> Algo {
    match algo {
        AlgoRefV1::CzSaw => Algo::Saw,
        AlgoRefV1::CzSquare => Algo::Square,
        AlgoRefV1::CzPulse => Algo::Pulse,
        AlgoRefV1::CzDoubleSine => Algo::SinePulse,
        AlgoRefV1::CzSawPulse => Algo::SawPulse,
        AlgoRefV1::CzReso1 | AlgoRefV1::CzReso2 | AlgoRefV1::CzReso3 => Algo::MultiSine,
        AlgoRefV1::Saw => Algo::Saw,
        AlgoRefV1::Square => Algo::Square,
        AlgoRefV1::Pulse => Algo::Pulse,
        AlgoRefV1::Null => Algo::Null,
        AlgoRefV1::SinePulse => Algo::SinePulse,
        AlgoRefV1::SawPulse => Algo::SawPulse,
        AlgoRefV1::MultiSine => Algo::MultiSine,
        AlgoRefV1::Pulse2 => Algo::Pulse2,
        AlgoRefV1::Cz101 => Algo::Cz101,
        AlgoRefV1::Bend => Algo::Bend,
        AlgoRefV1::Sync => Algo::Sync,
        AlgoRefV1::Pinch => Algo::Pinch,
        AlgoRefV1::Fold => Algo::Fold,
        AlgoRefV1::Skew => Algo::Skew,
        AlgoRefV1::Quantize => Algo::Quantize,
        AlgoRefV1::Twist => Algo::Twist,
        AlgoRefV1::Clip => Algo::Clip,
        AlgoRefV1::Ripple => Algo::Ripple,
        AlgoRefV1::Mirror => Algo::Mirror,
        AlgoRefV1::Fof => Algo::Fof,
        AlgoRefV1::Karpunk => Algo::Karpunk,
        AlgoRefV1::Sine => Algo::Sine,
    }
}

fn line_to_algo_ref(algo: Algo, window: WindowType) -> AlgoRefV1 {
    match algo {
        Algo::Saw => AlgoRefV1::CzSaw,
        Algo::Square => AlgoRefV1::CzSquare,
        Algo::Pulse => AlgoRefV1::CzPulse,
        Algo::Null => AlgoRefV1::Null,
        Algo::SinePulse => AlgoRefV1::CzDoubleSine,
        Algo::SawPulse => AlgoRefV1::CzSawPulse,
        Algo::MultiSine => match window {
            WindowType::Saw => AlgoRefV1::CzReso1,
            WindowType::Triangle => AlgoRefV1::CzReso2,
            WindowType::Trapezoid => AlgoRefV1::CzReso3,
            _ => AlgoRefV1::MultiSine,
        },
        Algo::Pulse2 => AlgoRefV1::Pulse2,
        Algo::Cz101 => AlgoRefV1::Cz101,
        Algo::Bend => AlgoRefV1::Bend,
        Algo::Sync => AlgoRefV1::Sync,
        Algo::Pinch => AlgoRefV1::Pinch,
        Algo::Fold => AlgoRefV1::Fold,
        Algo::Skew => AlgoRefV1::Skew,
        Algo::Quantize => AlgoRefV1::Quantize,
        Algo::Twist => AlgoRefV1::Twist,
        Algo::Clip => AlgoRefV1::Clip,
        Algo::Ripple => AlgoRefV1::Ripple,
        Algo::Mirror => AlgoRefV1::Mirror,
        Algo::Fof => AlgoRefV1::Fof,
        Algo::Karpunk => AlgoRefV1::Karpunk,
        Algo::Sine => AlgoRefV1::Sine,
    }
}

pub fn flat_to_params(flat: &SynthPresetFlatV1) -> SynthParams {
    let line1_algo = algo_ref_to_line(flat.warp_a_algo);
    let line2_algo = algo_ref_to_line(flat.warp_b_algo);
    let line1_secondary = flat.algo2_a.map(algo_ref_to_line);
    let line2_secondary = flat.algo2_b.map(algo_ref_to_line);
    let line1_window = algo_ref_window_override(flat.warp_a_algo).unwrap_or(flat.window_type);
    let line2_window = algo_ref_window_override(flat.warp_b_algo).unwrap_or(flat.window_type);

    // TODO: Remove bridge defaults (`octave`, `ext_pm_amount`, `frequency`) once
    // legacy flat payloads are fully replaced by canonical `SynthPresetV1` payloads.
    SynthParams {
        line_select: flat.line_select,
        mod_mode: flat.mod_mode,
        octave: 0.0,
        line1: LineParams {
            algo: line1_algo,
            algo2: line1_secondary,
            algo_blend: flat.algo_blend_a,
            dcw_comp: flat.line1_dcw_comp,
            window: line1_window,
            dca_base: flat.line1_level,
            dcw_base: flat.warp_a_amount,
            dco_depth: flat.line1_dco_depth,
            modulation: 0.0,
            detune_cents: flat.line1_detune,
            octave: flat.line1_octave,
            dco_env: flat.line1_dco_env.clone(),
            dcw_env: flat.line1_dcw_env.clone(),
            dca_env: flat.line1_dca_env.clone(),
            key_follow: flat.line1_dcw_key_follow,
        },
        line2: LineParams {
            algo: line2_algo,
            algo2: line2_secondary,
            algo_blend: flat.algo_blend_b,
            dcw_comp: flat.line2_dcw_comp,
            window: line2_window,
            dca_base: flat.line2_level,
            dcw_base: flat.warp_b_amount,
            dco_depth: flat.line2_dco_depth,
            modulation: 0.0,
            detune_cents: flat.line2_detune,
            octave: flat.line2_octave,
            dco_env: flat.line2_dco_env.clone(),
            dcw_env: flat.line2_dcw_env.clone(),
            dca_env: flat.line2_dca_env.clone(),
            key_follow: flat.line2_dcw_key_follow,
        },
        int_pm_amount: if flat.phase_mod_enabled {
            flat.int_pm_amount
        } else {
            0.0
        },
        int_pm_ratio: flat.int_pm_ratio,
        ext_pm_amount: 0.0,
        pm_pre: flat.pm_pre,
        frequency: 220.0,
        volume: flat.volume,
        poly_mode: flat.poly_mode,
        legato: flat.legato,
        velocity_target: flat.velocity_target,
        chorus: ChorusParams {
            rate: flat.chorus_rate,
            depth: flat.chorus_depth,
            mix: flat.chorus_mix,
        },
        delay: DelayParams {
            time: flat.delay_time,
            feedback: flat.delay_feedback,
            mix: flat.delay_mix,
        },
        reverb: ReverbParams {
            size: flat.reverb_size,
            mix: flat.reverb_mix,
        },
        vibrato: VibratoParams {
            enabled: flat.vibrato_enabled,
            waveform: flat.vibrato_wave,
            rate: flat.vibrato_rate,
            depth: flat.vibrato_depth,
            delay: flat.vibrato_delay,
        },
        portamento: PortamentoParams {
            enabled: flat.portamento_enabled,
            mode: flat.portamento_mode,
            rate: flat.portamento_rate,
            time: flat.portamento_time,
        },
        lfo: LfoParams {
            enabled: flat.lfo_enabled,
            waveform: flat.lfo_waveform,
            rate: flat.lfo_rate,
            depth: flat.lfo_depth,
            target: flat.lfo_target,
            offset: flat.lfo_offset,
        },
        filter: FilterParams {
            enabled: flat.filter_enabled,
            filter_type: flat.filter_type,
            cutoff: flat.filter_cutoff,
            resonance: flat.filter_resonance,
            env_amount: flat.filter_env_amount,
        },
        pitch_bend_range: flat.pitch_bend_range,
        mod_wheel_vibrato_depth: flat.mod_wheel_vibrato_depth,
    }
}

pub fn params_to_flat(params: &SynthParams) -> SynthPresetFlatV1 {
    // TODO: Drop this adapter once UI/storage use `SynthPresetV1` directly.
    SynthPresetFlatV1 {
        schema_version: SYNTH_SCHEMA_VERSION_V1,
        warp_a_amount: params.line1.dcw_base,
        warp_b_amount: params.line2.dcw_base,
        warp_a_algo: line_to_algo_ref(params.line1.algo, params.line1.window),
        warp_b_algo: line_to_algo_ref(params.line2.algo, params.line2.window),
        algo2_a: params
            .line1
            .algo2
            .map(|algo| line_to_algo_ref(algo, params.line1.window)),
        algo2_b: params
            .line2
            .algo2
            .map(|algo| line_to_algo_ref(algo, params.line2.window)),
        algo_blend_a: params.line1.algo_blend,
        algo_blend_b: params.line2.algo_blend,
        int_pm_amount: params.int_pm_amount,
        int_pm_ratio: params.int_pm_ratio,
        phase_mod_enabled: params.int_pm_amount > 0.0,
        pm_pre: params.pm_pre,
        window_type: params.line1.window,
        volume: params.volume,
        line1_level: params.line1.dca_base,
        line2_level: params.line2.dca_base,
        line1_octave: params.line1.octave,
        line2_octave: params.line2.octave,
        line1_detune: params.line1.detune_cents,
        line2_detune: params.line2.detune_cents,
        line1_dco_depth: params.line1.dco_depth,
        line2_dco_depth: params.line2.dco_depth,
        line1_dcw_comp: params.line1.dcw_comp,
        line2_dcw_comp: params.line2.dcw_comp,
        line1_dco_env: params.line1.dco_env.clone(),
        line1_dcw_env: params.line1.dcw_env.clone(),
        line1_dca_env: params.line1.dca_env.clone(),
        line2_dco_env: params.line2.dco_env.clone(),
        line2_dcw_env: params.line2.dcw_env.clone(),
        line2_dca_env: params.line2.dca_env.clone(),
        line_select: params.line_select,
        mod_mode: params.mod_mode,
        poly_mode: params.poly_mode,
        legato: params.legato,
        velocity_target: params.velocity_target,
        chorus_enabled: params.chorus.mix > 0.0,
        chorus_rate: params.chorus.rate,
        chorus_depth: params.chorus.depth,
        chorus_mix: params.chorus.mix,
        delay_enabled: params.delay.mix > 0.0,
        delay_time: params.delay.time,
        delay_feedback: params.delay.feedback,
        delay_mix: params.delay.mix,
        reverb_enabled: params.reverb.mix > 0.0,
        reverb_size: params.reverb.size,
        reverb_mix: params.reverb.mix,
        line1_dcw_key_follow: params.line1.key_follow,
        // TODO: Preserve real DCA key-follow when flat shape is retired.
        line1_dca_key_follow: 0.0,
        line2_dcw_key_follow: params.line2.key_follow,
        // TODO: Preserve real DCA key-follow when flat shape is retired.
        line2_dca_key_follow: 0.0,
        vibrato_enabled: params.vibrato.enabled,
        vibrato_wave: params.vibrato.waveform,
        vibrato_rate: params.vibrato.rate,
        vibrato_depth: params.vibrato.depth,
        vibrato_delay: params.vibrato.delay,
        portamento_enabled: params.portamento.enabled,
        portamento_mode: params.portamento.mode,
        portamento_rate: params.portamento.rate,
        portamento_time: params.portamento.time,
        lfo_enabled: params.lfo.enabled,
        lfo_waveform: params.lfo.waveform,
        lfo_rate: params.lfo.rate,
        lfo_depth: params.lfo.depth,
        lfo_offset: params.lfo.offset,
        lfo_target: params.lfo.target,
        filter_enabled: params.filter.enabled,
        filter_type: params.filter.filter_type,
        filter_cutoff: params.filter.cutoff,
        filter_resonance: params.filter.resonance,
        filter_env_amount: params.filter.env_amount,
        pitch_bend_range: params.pitch_bend_range,
        mod_wheel_vibrato_depth: params.mod_wheel_vibrato_depth,
    }
}

impl TryFrom<SynthPresetFlatV1> for SynthPresetV1 {
    type Error = core::convert::Infallible;

    fn try_from(value: SynthPresetFlatV1) -> Result<Self, Self::Error> {
        Ok(Self {
            schema_version: value.schema_version,
            params: flat_to_params(&value),
        })
    }
}

impl From<SynthPresetV1> for SynthPresetFlatV1 {
    fn from(value: SynthPresetV1) -> Self {
        let mut flat = params_to_flat(&value.params);
        flat.schema_version = value.schema_version;
        flat
    }
}
