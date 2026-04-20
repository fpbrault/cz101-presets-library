use super::wrap01;
use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Twist,
	name: "Twist",
	icon_path: "M4,12 C8,2 16,22 20,12",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Twist algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let two_pi = core::f32::consts::TAU;
	wrap01(phase + amt * 0.2 * libm::sinf(two_pi * phase * 3.0))
}
