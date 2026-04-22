use crate::params::{Algo, AlgoControlValueV1, LineParams};
use crate::dsp_utils::apply_window;
use serde::Serialize;
#[cfg(feature = "specta-bindings")]
use specta::Type;

const TWO_PI: f32 = core::f32::consts::TAU;
pub const PER_LINE_HEADROOM: f32 = 0.25;

pub mod bend;
pub mod clip;
pub mod cz101;
pub use cz101::{CzPresetV1, CZ_PRESETS};
pub mod fold;
pub mod fof;
pub mod karpunk;
pub mod mirror;
pub mod pinch;
pub mod quantize;
pub mod ripple;
pub mod sine;
pub mod skew;
pub mod sync;
pub mod twist;

/// Per-line render inputs passed to a voice's generator for one sample.
#[derive(Debug, Clone, Copy)]
pub struct LineRenderConfig<'a> {
	pub primary_algo: Algo,
	pub secondary_algo: Option<Algo>,
	pub blend: f32,
	pub phase: f32,
	pub window_gain: f32,
	pub final_dcw: f32,
	pub final_dca: f32,
	pub effective_freq: f32,
	pub sample_rate: f32,
	pub algo_controls: Option<&'a [AlgoControlValueV1]>,
}

impl<'a> LineRenderConfig<'a> {
	/// Build a `LineRenderConfig` from line parameters, resolving algorithm and window
	/// choices internally without exposing CZ-specific details to the caller.
	pub fn from_line(
		line: &'a LineParams,
		cycle_count: u32,
		window_phi: f32,
		phase: f32,
		final_dcw: f32,
		final_dca: f32,
		effective_freq: f32,
		sample_rate: f32,
	) -> Self {
		let primary_algo = cz101::resolve_line_primary_algo(line, cycle_count);
		let secondary_algo = cz101::resolve_line_secondary_algo(line, cycle_count);
		let window_gain = apply_window(window_phi, cz101::resolve_line_window(line));
		Self {
			primary_algo,
			secondary_algo,
			blend: line.algo_blend,
			phase,
			window_gain,
			final_dcw,
			final_dca,
			effective_freq,
			sample_rate,
			algo_controls: line.algo_controls.as_deref(),
		}
	}
}

/// Per-voice state for any generator algorithms that need note-lifetime memory.
///
/// Today this wraps Karpunk state only. Keeping the API here avoids leaking
/// individual stateful algorithm details into the processor or voice layers.
#[derive(Debug, Clone, Default)]
pub struct AlgoRuntimeState {
	karpunk: karpunk::KarpunkPair,
}

impl AlgoRuntimeState {
	/// Create empty state for all state-aware algorithms used by one voice.
	pub fn new() -> Self {
		Self::default()
	}

	/// Reset note-scoped state when a voice starts a new note.
	pub fn note_on(&mut self, note: u8) {
		self.karpunk.reseed_for_note(note);
	}

	/// Render line 1, applying any stateful algorithm behavior as needed.
	pub fn render_line1(&mut self, config: LineRenderConfig<'_>) -> (f32, Option<f32>) {
		if karpunk::requires_state_tick(config.primary_algo, config.secondary_algo) {
			self.karpunk.render_line1(config)
		} else {
			render_line_stateless(config)
		}
	}

	/// Render line 2, applying any stateful algorithm behavior as needed.
	pub fn render_line2(&mut self, config: LineRenderConfig<'_>) -> (f32, Option<f32>) {
		if karpunk::requires_state_tick(config.primary_algo, config.secondary_algo) {
			self.karpunk.render_line2(config)
		} else {
			render_line_stateless(config)
		}
	}
}

#[inline(always)]
fn render_line_stateless(config: LineRenderConfig<'_>) -> (f32, Option<f32>) {
	let sample = if let Some(secondary_algo) = config.secondary_algo {
		let secondary_dcw = config.final_dcw * config.blend;
		let primary_dcw = config.final_dcw * (1.0 - config.blend);
		let primary = render_algo_sample(
			config.primary_algo,
			config.phase,
			primary_dcw,
			config.algo_controls,
			None,
		);
		let secondary = render_algo_sample(
			secondary_algo,
			config.phase,
			secondary_dcw,
			config.algo_controls,
			None,
		);
		blend_line_samples(config.primary_algo, primary, secondary, config.blend)
	} else {
		render_algo_sample(
			config.primary_algo,
			config.phase,
			config.final_dcw,
			config.algo_controls,
			None,
		)
	};

	(
		sample * config.window_gain * config.final_dca * PER_LINE_HEADROOM,
		None,
	)
}

#[inline(always)]
fn blend_line_samples(primary_algo: Algo, primary: f32, secondary: f32, blend: f32) -> f32 {
	if primary_algo == Algo::Karpunk {
		primary + (primary * secondary * 2.0 - primary) * blend
	} else {
		primary + (secondary - primary) * blend
	}
}


/// Describes one control surfaced by an algorithm package.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub enum AlgoControlKindV1 {
	Number,
	Select,
	Toggle,
}

/// Assignment emitted by a select option to update one or more numeric controls.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoControlAssignmentV1 {
	pub control_id: &'static str,
	pub value: f32,
}

/// One selectable option for list-based controls.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoControlOptionV1 {
	pub value: &'static str,
	pub label: &'static str,
	pub set: &'static [AlgoControlAssignmentV1],
}

/// Describes one control surfaced by an algorithm package.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoControlV1 {
	pub id: &'static str,
	pub label: &'static str,
	pub description: &'static str,
	pub kind: AlgoControlKindV1,
	pub min: Option<f32>,
	pub max: Option<f32>,
	pub default: Option<f32>,
	pub default_toggle: Option<bool>,
	pub options: &'static [AlgoControlOptionV1],
}

/// Complete algorithm package definition.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoDefinitionV1 {
	pub id: Algo,
	pub name: &'static str,
	pub icon_path: &'static str,
	pub visible: bool,
	pub controls: &'static [AlgoControlV1],
}

/// UI catalog entry for algorithm pickers.
///
/// This is exported to TypeScript so frontend option labels/icons are Rust-owned.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoUiEntryV1 {
	pub id: Algo,
	pub label: &'static str,
	pub icon_path: &'static str,
	pub visible: bool,
}

pub const NO_CONTROLS: [AlgoControlV1; 0] = [];
pub const NO_CONTROL_OPTIONS: [AlgoControlOptionV1; 0] = [];
pub const WARP_AMOUNT_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "warpAmount",
	label: "Warp Amount",
	description: "Sets the overall phase distortion amount for the current algorithm.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(1.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const DCW_COMP_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "dcwComp",
	label: "DCW Comp",
	description: "Compensates output level as the distortion envelope opens and closes.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(1.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const LEVEL_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "level",
	label: "Level",
	description: "Sets the base output level for this line.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(1.0),
	default: Some(1.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const OCTAVE_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "octave",
	label: "Octave",
	description: "Offsets oscillator pitch by whole octaves.",
	kind: AlgoControlKindV1::Number,
	min: Some(-2.0),
	max: Some(2.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const FINE_DETUNE_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "fineDetune",
	label: "Fine",
	description: "Applies a fine pitch offset in cents.",
	kind: AlgoControlKindV1::Number,
	min: Some(-50.0),
	max: Some(50.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const DCO_DEPTH_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "dcoDepth",
	label: "DCO Range",
	description: "Sets the pitch-envelope range or oscillator excursion in semitones.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(24.0),
	default: Some(12.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const KEY_FOLLOW_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "keyFollow",
	label: "Key Follow",
	description: "Adjusts how strongly keyboard pitch affects this parameter.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(9.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const ALGO_BLEND_NUMBER_CONTROL: AlgoControlV1 = AlgoControlV1 {
	id: "algoBlend",
	label: "Algo Blend",
	description: "Blends between the primary and secondary algorithm outputs.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(1.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
};
pub const WARP_AMOUNT_CONTROL: [AlgoControlV1; 1] = [WARP_AMOUNT_NUMBER_CONTROL];
pub const DCW_CONTROL: [AlgoControlV1; 1] = [AlgoControlV1 {
	id: "dcw",
	label: "DCW",
	description: "Controls distortion depth for algorithms that expose direct DCW mapping.",
	kind: AlgoControlKindV1::Number,
	min: Some(0.0),
	max: Some(1.0),
	default: Some(0.0),
	default_toggle: None,
	options: &NO_CONTROL_OPTIONS,
}];

pub const ALGO_DEFINITIONS_V1: [AlgoDefinitionV1; 12] = [
	cz101::DEFINITION,
	bend::DEFINITION,
	sync::DEFINITION,
	pinch::DEFINITION,
	fold::DEFINITION,
	skew::DEFINITION,
	twist::DEFINITION,
	clip::DEFINITION,
	ripple::DEFINITION,
	mirror::DEFINITION,
	karpunk::DEFINITION,
	fof::DEFINITION,
];

pub fn algo_definitions_v1() -> &'static [AlgoDefinitionV1] {
	&ALGO_DEFINITIONS_V1
}

pub fn algo_ui_catalog_v1() -> &'static [AlgoUiEntryV1] {
	const CATALOG: [AlgoUiEntryV1; 12] = [
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[0].id,
			label: ALGO_DEFINITIONS_V1[0].name,
			icon_path: ALGO_DEFINITIONS_V1[0].icon_path,
			visible: ALGO_DEFINITIONS_V1[0].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[1].id,
			label: ALGO_DEFINITIONS_V1[1].name,
			icon_path: ALGO_DEFINITIONS_V1[1].icon_path,
			visible: ALGO_DEFINITIONS_V1[1].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[2].id,
			label: ALGO_DEFINITIONS_V1[2].name,
			icon_path: ALGO_DEFINITIONS_V1[2].icon_path,
			visible: ALGO_DEFINITIONS_V1[2].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[3].id,
			label: ALGO_DEFINITIONS_V1[3].name,
			icon_path: ALGO_DEFINITIONS_V1[3].icon_path,
			visible: ALGO_DEFINITIONS_V1[3].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[4].id,
			label: ALGO_DEFINITIONS_V1[4].name,
			icon_path: ALGO_DEFINITIONS_V1[4].icon_path,
			visible: ALGO_DEFINITIONS_V1[4].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[5].id,
			label: ALGO_DEFINITIONS_V1[5].name,
			icon_path: ALGO_DEFINITIONS_V1[5].icon_path,
			visible: ALGO_DEFINITIONS_V1[5].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[6].id,
			label: ALGO_DEFINITIONS_V1[6].name,
			icon_path: ALGO_DEFINITIONS_V1[6].icon_path,
			visible: ALGO_DEFINITIONS_V1[6].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[7].id,
			label: ALGO_DEFINITIONS_V1[7].name,
			icon_path: ALGO_DEFINITIONS_V1[7].icon_path,
			visible: ALGO_DEFINITIONS_V1[7].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[8].id,
			label: ALGO_DEFINITIONS_V1[8].name,
			icon_path: ALGO_DEFINITIONS_V1[8].icon_path,
			visible: ALGO_DEFINITIONS_V1[8].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[9].id,
			label: ALGO_DEFINITIONS_V1[9].name,
			icon_path: ALGO_DEFINITIONS_V1[9].icon_path,
			visible: ALGO_DEFINITIONS_V1[9].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[10].id,
			label: ALGO_DEFINITIONS_V1[10].name,
			icon_path: ALGO_DEFINITIONS_V1[10].icon_path,
			visible: ALGO_DEFINITIONS_V1[10].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[11].id,
			label: ALGO_DEFINITIONS_V1[11].name,
			icon_path: ALGO_DEFINITIONS_V1[11].icon_path,
			visible: ALGO_DEFINITIONS_V1[11].visible,
		},
	];

	&CATALOG
}


/// Wrap a phase value into the normalized range [0.0, 1.0).
#[inline]
pub(crate) fn wrap01(v: f32) -> f32 {
	let w = v - libm::floorf(v);
	if w < 0.0 {
		w + 1.0
	} else {
		w
	}
}

/// Linear interpolation helper used by several generator transfer functions.
#[inline]
pub(crate) fn lerp(a: f32, b: f32, t: f32) -> f32 {
	a + (b - a) * t
}

/// Unified algorithm phase warp dispatcher.
fn algo_control_value(algo_controls: Option<&[AlgoControlValueV1]>, id: &str, fallback: f32) -> f32 {
	if let Some(entries) = algo_controls {
		if let Some(entry) = entries.iter().find(|entry| entry.id == id) {
			return entry.value;
		}
	}
	fallback
}

pub fn warp_phase(algo: Algo, phase: f32, amt: f32, algo_controls: Option<&[AlgoControlValueV1]>) -> f32 {
	if amt == 0.0 && !algo.is_cz_waveform() {
		return phase;
	}

	match algo {
		Algo::Saw => cz101::warp_phase_for_waveform(crate::params::CzWaveform::Saw, phase, amt),
		Algo::Square => {
			cz101::warp_phase_for_waveform(crate::params::CzWaveform::Square, phase, amt)
		}
		Algo::Pulse => cz101::warp_phase_for_waveform(crate::params::CzWaveform::Pulse, phase, amt),
		Algo::Null => cz101::warp_phase_for_waveform(crate::params::CzWaveform::Null, phase, amt),
		Algo::SinePulse => {
			cz101::warp_phase_for_waveform(crate::params::CzWaveform::SinePulse, phase, amt)
		}
		Algo::SawPulse => {
			cz101::warp_phase_for_waveform(crate::params::CzWaveform::SawPulse, phase, amt)
		}
		Algo::MultiSine => {
			cz101::warp_phase_for_waveform(crate::params::CzWaveform::MultiSine, phase, amt)
		}
		Algo::Pulse2 => {
			cz101::warp_phase_for_waveform(crate::params::CzWaveform::Pulse2, phase, amt)
		}
		Algo::Cz101 => cz101::warp_phase(phase, amt),
		Algo::Bend => bend::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "bendCurve", 0.5),
			algo_control_value(algo_controls, "bendBias", 0.5),
			algo_control_value(algo_controls, "bendKnee", 0.5),
		),
		Algo::Sync => sync::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "syncRatio", 0.5),
			algo_control_value(algo_controls, "syncPhase", 0.0),
			algo_control_value(algo_controls, "syncCurve", 0.5),
			algo_control_value(algo_controls, "syncWindow", 0.5),
		),
		Algo::Pinch => pinch::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "pinchFocus", 0.5),
			algo_control_value(algo_controls, "pinchAsym", 0.0),
			algo_control_value(algo_controls, "pinchCurve", 0.5),
			algo_control_value(algo_controls, "pinchDrive", 0.5),
		),
		Algo::Fold => fold::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "foldStages", 0.5),
			algo_control_value(algo_controls, "foldTilt", 0.5),
			algo_control_value(algo_controls, "foldSymmetry", 0.5),
			algo_control_value(algo_controls, "foldSoftness", 0.0),
		),
		Algo::Skew => skew::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "skewBias", 0.2),
			algo_control_value(algo_controls, "skewCurve", 0.5),
			algo_control_value(algo_controls, "skewSpread", 0.5),
			algo_control_value(algo_controls, "skewTilt", 0.5),
		),
		Algo::Quantize => quantize::warp_phase(
			phase,
			algo_control_value(algo_controls, "quantizeAmount", amt),
			algo_control_value(algo_controls, "quantizeSteps", 0.5),
			algo_control_value(algo_controls, "quantizeSkew", 0.5),
		),
		Algo::Twist => twist::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "twistHarmonics", 0.5),
			algo_control_value(algo_controls, "twistDepth", 0.5),
			algo_control_value(algo_controls, "twistPhase", 0.0),
			algo_control_value(algo_controls, "twistShape", 0.5),
		),
		Algo::Clip => clip::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "clipDrive", 0.5),
			algo_control_value(algo_controls, "clipShape", 0.5),
			algo_control_value(algo_controls, "clipBias", 0.5),
			algo_control_value(algo_controls, "clipSoft", 0.0),
		),
		Algo::Ripple => ripple::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "rippleFreq", 0.5),
			algo_control_value(algo_controls, "rippleDepth", 0.5),
			algo_control_value(algo_controls, "ripplePhase", 0.0),
			algo_control_value(algo_controls, "rippleShape", 0.5),
		),
		Algo::Mirror => mirror::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "mirrorCenter", 0.5),
			algo_control_value(algo_controls, "mirrorBlend", 0.5),
			algo_control_value(algo_controls, "mirrorClip", 0.0),
			algo_control_value(algo_controls, "mirrorSkew", 0.5),
		),
		Algo::Fof => fof::warp_phase(
			phase,
			amt,
			algo_control_value(algo_controls, "fofRatio", 0.5),
			algo_control_value(algo_controls, "fofTightness", 0.5),
			algo_control_value(algo_controls, "fofOffset", 0.5),
			algo_control_value(algo_controls, "fofSkew", 0.5),
		),
		Algo::Sine => sine::warp_phase(phase, amt),
		Algo::Karpunk => phase,
	}
}

/// Unified algorithm sample renderer used by voice and utility paths.
///
/// `karpunk_sample` is used only when `algo == Algo::Karpunk`.
pub fn render_algo_sample(
	algo: Algo,
	phase: f32,
	dcw: f32,
	algo_controls: Option<&[AlgoControlValueV1]>,
	karpunk_sample: Option<f32>,
) -> f32 {
	if algo == Algo::Karpunk {
		return karpunk_sample.unwrap_or(0.0);
	}
	let warped = warp_phase(algo, phase, dcw, algo_controls);
	-libm::cosf(TWO_PI * warped)
}
