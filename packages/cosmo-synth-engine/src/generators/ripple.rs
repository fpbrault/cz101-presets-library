use super::wrap01;
use crate::params::Algo;
use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};

const CONTROLS: [AlgoControlV1; 4] = [
	AlgoControlV1 {
		id: "rippleFreq",
		label: "Freq",
		description: "Sets how many ripple oscillations appear across the cycle.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "rippleDepth",
		label: "Depth",
		description: "Controls the amplitude of the ripple imposed on the phase.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "ripplePhase",
		label: "Phase",
		description: "Offsets where the ripple pattern begins inside the cycle.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.0),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
	AlgoControlV1 {
		id: "rippleShape",
		label: "Shape",
		description: "Changes the ripple from a smooth sine to a sharper contour.",
		kind: AlgoControlKindV1::Number,
		min: Some(0.0),
		max: Some(1.0),
		default: Some(0.5),
		default_toggle: None,
		options: &NO_CONTROL_OPTIONS,
	},
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
  id: Algo::Ripple,
	name: "Ripple",
	icon_path: "M4,12 C6,8 8,16 10,12 C12,8 14,16 16,12 C18,8 19,13 20,12",
	visible: true,
	controls: &CONTROLS,
};

/// Ripple algorithm phase warp.
pub fn warp_phase(
	phase: f32,
	amt: f32,
	ripple_freq: f32,
	ripple_depth: f32,
	phase_offset: f32,
	shape: f32,
) -> f32 {
	let two_pi = core::f32::consts::TAU;
	let cycles = 2.0 + ripple_freq * 22.0;
	let depth = 0.01 + ripple_depth * 0.12;
	let ripple = libm::sinf(two_pi * (phase + phase_offset) * cycles);
	let shaped = if ripple >= 0.0 {
		libm::powf(ripple, 0.35 + shape * 2.4)
	} else {
		-libm::powf(-ripple, 0.35 + shape * 2.4)
	};
	wrap01(phase + amt * depth * shaped)
}
