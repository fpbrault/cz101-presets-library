use crate::params::Algo;
use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};

const CONTROLS: [AlgoControlV1; 4] = [
	AlgoControlV1 {
		id: "mirrorCenter",
		label: "Center",
		description: "Chooses the pivot around which the phase is mirrored.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "mirrorBlend",
		label: "Blend",
		description: "Controls how strongly the mirrored phase replaces the original phase.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "mirrorClip",
		label: "Clip",
		description: "Clamps the mirrored excursion for a tighter folded reflection.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.0),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "mirrorSkew",
		label: "Skew",
		description: "Skews the mirrored side so reflection distance changes across the cycle.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
  id: Algo::Mirror,
	name: "Mirror",
	icon_path: "M4,20 L12,4 L20,20",
	visible: true,
	controls: &CONTROLS,
};

/// Mirror algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, center: f32, blend: f32, clip: f32, skew: f32) -> f32 {
	let pivot = center.clamp(0.01, 0.99);
	let mirrored = (pivot + (pivot - phase) * (0.5 + skew)).clamp(0.0, 1.0);
	let clipped = if clip > 0.0 {
		let clip_amt = 0.5 - clip * 0.45;
		((mirrored - 0.5).clamp(-clip_amt, clip_amt) / (clip_amt * 2.0)) + 0.5
	} else {
		mirrored
	};
	phase + (clipped - phase) * (amt * (0.2 + blend * 0.8))
}
