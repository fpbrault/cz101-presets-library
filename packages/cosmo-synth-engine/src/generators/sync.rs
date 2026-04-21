use super::wrap01;
use crate::params::Algo;
use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};

const CONTROLS: [AlgoControlV1; 4] = [
	AlgoControlV1 {
		id: "syncRatio",
		label: "Ratio",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "syncPhase",
		label: "Phase",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.0),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "syncCurve",
		label: "Curve",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "syncWindow",
		label: "Window",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: Algo::Sync,
	name: "Sync",
	icon_path: "M4,20 L8,4 L8,20 L12,4 L12,20 L16,4 L16,20 L20,4",
	visible: true,
	controls: &CONTROLS,
};

/// Sync algorithm phase warp.
pub fn warp_phase(
	phase: f32,
	amt: f32,
	ratio: f32,
	phase_offset: f32,
	curve: f32,
	window: f32,
) -> f32 {
	let mult = 1.0 + amt * (4.0 + ratio * 14.0);
	let synced = wrap01((phase + phase_offset) * mult);
	let shaped = if synced < 0.5 {
		0.5 * libm::powf((synced * 2.0).clamp(0.0, 1.0), 0.35 + curve * 2.4)
	} else {
		0.5
			+ 0.5
				* (1.0
					- libm::powf(
						((1.0 - synced) * 2.0).clamp(0.0, 1.0),
						0.35 + curve * 2.4,
					))
	};
	phase + (shaped - phase) * (0.25 + window * 0.75)
}
