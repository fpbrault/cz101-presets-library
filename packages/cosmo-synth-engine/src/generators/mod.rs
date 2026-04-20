use crate::params::{Algo, WindowType};
use serde::{Deserialize, Serialize};
#[cfg(feature = "specta-bindings")]
use specta::Type;

const TWO_PI: f32 = core::f32::consts::TAU;

pub mod bend;
pub mod clip;
pub mod cz;
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

/// Describes one control surfaced by an algorithm package.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoControlV1 {
	pub id: &'static str,
	pub label: &'static str,
	pub min: f32,
	pub max: f32,
	pub default: f32,
}

/// Complete algorithm package definition.
#[derive(Debug, Clone, Copy, Serialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct AlgoDefinitionV1 {
	pub id: AlgoRefV1,
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
	pub id: AlgoRefV1,
	pub label: &'static str,
	pub icon_path: &'static str,
	pub visible: bool,
}

pub const NO_CONTROLS: [AlgoControlV1; 0] = [];
pub const WARP_AMOUNT_CONTROL: [AlgoControlV1; 1] = [AlgoControlV1 {
	id: "warpAmount",
	label: "Warp Amount",
	min: 0.0,
	max: 1.0,
	default: 0.0,
}];
pub const DCW_CONTROL: [AlgoControlV1; 1] = [AlgoControlV1 {
	id: "dcw",
	label: "DCW",
	min: 0.0,
	max: 1.0,
	default: 0.0,
}];

pub const ALGO_DEFINITIONS_V1: [AlgoDefinitionV1; 20] = [
	cz::cz101::DEFINITION_CZ_SAW,
	cz::cz101::DEFINITION_CZ_SQUARE,
	cz::cz101::DEFINITION_CZ_PULSE,
	cz::cz101::DEFINITION_CZ_DOUBLE_SINE,
	cz::cz101::DEFINITION_CZ_SAW_PULSE,
	cz::cz101::DEFINITION_CZ_RESO1,
	cz::cz101::DEFINITION_CZ_RESO2,
	cz::cz101::DEFINITION_CZ_RESO3,
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
	cz::cz101::DEFINITION,
];

pub fn algo_definitions_v1() -> &'static [AlgoDefinitionV1] {
	&ALGO_DEFINITIONS_V1
}

pub fn algo_ui_catalog_v1() -> &'static [AlgoUiEntryV1] {
	const CATALOG: [AlgoUiEntryV1; 20] = [
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
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[12].id,
			label: ALGO_DEFINITIONS_V1[12].name,
			icon_path: ALGO_DEFINITIONS_V1[12].icon_path,
			visible: ALGO_DEFINITIONS_V1[12].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[13].id,
			label: ALGO_DEFINITIONS_V1[13].name,
			icon_path: ALGO_DEFINITIONS_V1[13].icon_path,
			visible: ALGO_DEFINITIONS_V1[13].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[14].id,
			label: ALGO_DEFINITIONS_V1[14].name,
			icon_path: ALGO_DEFINITIONS_V1[14].icon_path,
			visible: ALGO_DEFINITIONS_V1[14].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[15].id,
			label: ALGO_DEFINITIONS_V1[15].name,
			icon_path: ALGO_DEFINITIONS_V1[15].icon_path,
			visible: ALGO_DEFINITIONS_V1[15].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[16].id,
			label: ALGO_DEFINITIONS_V1[16].name,
			icon_path: ALGO_DEFINITIONS_V1[16].icon_path,
			visible: ALGO_DEFINITIONS_V1[16].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[17].id,
			label: ALGO_DEFINITIONS_V1[17].name,
			icon_path: ALGO_DEFINITIONS_V1[17].icon_path,
			visible: ALGO_DEFINITIONS_V1[17].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[18].id,
			label: ALGO_DEFINITIONS_V1[18].name,
			icon_path: ALGO_DEFINITIONS_V1[18].icon_path,
			visible: ALGO_DEFINITIONS_V1[18].visible,
		},
		AlgoUiEntryV1 {
			id: ALGO_DEFINITIONS_V1[19].id,
			label: ALGO_DEFINITIONS_V1[19].name,
			icon_path: ALGO_DEFINITIONS_V1[19].icon_path,
			visible: ALGO_DEFINITIONS_V1[19].visible,
		},
	];

	&CATALOG
}

pub fn algo_ref_window_override(algo: AlgoRefV1) -> Option<WindowType> {
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

pub fn algo_ref_to_line(algo: AlgoRefV1) -> Algo {
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

pub fn line_to_algo_ref(algo: Algo, window: WindowType) -> AlgoRefV1 {
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
pub fn warp_phase(algo: Algo, phase: f32, amt: f32) -> f32 {
	if amt == 0.0 && !algo.is_cz_waveform() {
		return phase;
	}

	match algo {
		Algo::Saw => cz::cz_saw::warp_phase(phase, amt),
		Algo::Square => cz::cz_square::warp_phase(phase, amt),
		Algo::Pulse => cz::cz_pulse::warp_phase(phase, amt),
		Algo::Null => cz::cz_null::warp_phase(phase, amt),
		Algo::SinePulse => cz::cz_sine_pulse::warp_phase(phase, amt),
		Algo::SawPulse => cz::cz_saw_pulse::warp_phase(phase, amt),
		Algo::MultiSine => cz::cz_multi_sine::warp_phase(phase, amt),
		Algo::Pulse2 => cz::cz_pulse2::warp_phase(phase, amt),
		Algo::Cz101 => cz::cz101::warp_phase(phase, amt),
		Algo::Bend => bend::warp_phase(phase, amt),
		Algo::Sync => sync::warp_phase(phase, amt),
		Algo::Pinch => pinch::warp_phase(phase, amt),
		Algo::Fold => fold::warp_phase(phase, amt),
		Algo::Skew => skew::warp_phase(phase, amt),
		Algo::Quantize => quantize::warp_phase(phase, amt),
		Algo::Twist => twist::warp_phase(phase, amt),
		Algo::Clip => clip::warp_phase(phase, amt),
		Algo::Ripple => ripple::warp_phase(phase, amt),
		Algo::Mirror => mirror::warp_phase(phase, amt),
		Algo::Fof => fof::warp_phase(phase, amt),
		Algo::Sine => sine::warp_phase(phase, amt),
		Algo::Karpunk => phase,
	}
}

/// Unified algorithm sample renderer used by voice and utility paths.
///
/// `karpunk_sample` is used only when `algo == Algo::Karpunk`.
pub fn render_algo_sample(algo: Algo, phase: f32, dcw: f32, karpunk_sample: Option<f32>) -> f32 {
	if algo == Algo::Karpunk {
		return karpunk_sample.unwrap_or(0.0);
	}
	let warped = warp_phase(algo, phase, dcw);
	-libm::cosf(TWO_PI * warped)
}