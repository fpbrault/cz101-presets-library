use crate::params::Algo;
use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};

const CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "quantizeAmount",
		label: "Amount",
		description: "Sets how strongly the phase snaps to quantized steps.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.0),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "quantizeSteps",
		label: "Steps",
		description: "Controls how many discrete phase levels are available.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "quantizeSkew",
		label: "Skew",
		description: "Biases the phase before quantization for uneven step spacing.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: Algo::Quantize,
	name: "Quantize",
	icon_path: "M4,12 L6,12 L6,8 L8,8 L8,16 L10,16 L10,10 L12,10 L12,14 L14,14 L14,6 L16,6 L16,18 L18,18 L18,12 L20,12",
	visible: false,
	controls: &CONTROLS,
};

/// Quantize algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, steps: f32, skew: f32) -> f32 {
	let levels = 2.0 + libm::floorf(steps * 30.0);
	let warped_phase = libm::powf(phase.clamp(0.0, 1.0), 0.4 + skew * 2.2);
	let target = libm::roundf(warped_phase * levels) / levels;
	phase + (target - phase) * amt
}
