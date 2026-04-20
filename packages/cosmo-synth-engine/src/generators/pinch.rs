use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Pinch,
	name: "Pinch",
	icon_path: "M4,12 C8,4 10,12 12,12 C14,12 16,20 20,12",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Pinch algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let center = 0.5_f32;
	let a = amt * 0.98 + 0.01;
	let diff = phase - center;
	let norm = libm::fabsf(diff) / center;
	let exp = 1.0 / (a + 0.001);
	let sign = if diff < 0.0 { -1.0_f32 } else { 1.0_f32 };
	center + sign * libm::powf(norm, exp) * center
}
