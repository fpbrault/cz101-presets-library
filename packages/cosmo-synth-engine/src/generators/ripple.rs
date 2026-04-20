use super::wrap01;
use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Ripple,
	name: "Ripple",
	icon_path: "M4,12 C6,8 8,16 10,12 C12,8 14,16 16,12 C18,8 19,13 20,12",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Ripple algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let two_pi = core::f32::consts::TAU;
	wrap01(phase + amt * 0.08 * libm::sinf(two_pi * phase * 10.0))
}
