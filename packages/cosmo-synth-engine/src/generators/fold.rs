use super::wrap01;
use crate::params::Algo;
use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};

const CONTROLS: [AlgoControlV1; 4] = [
	AlgoControlV1 {
		id: "foldStages",
		label: "Stages",
		description: "Sets how many fold passes are applied across the cycle.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "foldTilt",
		label: "Tilt",
		description: "Moves the fold pivot toward the start or end of the cycle.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "foldSymmetry",
		label: "Symmetry",
		description: "Offsets fold balance to make one side of the cycle fold harder than the other.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "foldSoftness",
		label: "Softness",
		description: "Softens each fold pass so the phase wraps less abruptly.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.0),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Fold,
	name: "Fold",
	icon_path: "M4,20 L8,4 L12,20 L16,4 L20,20",
	visible: true,
	controls: &CONTROLS,
};

/// Fold algorithm phase warp.
pub fn warp_phase(
	phase: f32,
	amt: f32,
	stages: f32,
	tilt: f32,
	symmetry: f32,
	softness: f32,
) -> f32 {
	let mut p = phase;
	let folds = 1 + libm::floorf((0.5 + stages * 5.5) * amt.max(0.05)) as u32;
	let pivot = (0.2 + tilt * 0.6 + (symmetry - 0.5) * 0.25).clamp(0.05, 0.95);
	for _ in 0..folds {
		if p > pivot {
			p = 1.0 - p;
		}
		let fold_gain = (1.0 / pivot).min(8.0);
		let softened_gain = fold_gain * (1.0 - softness.clamp(0.0, 1.0)) + 1.0 * softness.clamp(0.0, 1.0);
		p *= softened_gain;
	}
	wrap01(p)
}
