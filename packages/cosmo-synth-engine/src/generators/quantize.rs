use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Quantize,
	name: "Quantize",
	icon_path: "M4,12 L6,12 L6,8 L8,8 L8,16 L10,16 L10,10 L12,10 L12,14 L14,14 L14,6 L16,6 L16,18 L18,18 L18,12 L20,12",
	visible: false,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Quantize algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let levels = 2.0 + libm::floorf(amt * 30.0);
	let target = libm::roundf(phase * levels) / levels;
	phase + (target - phase) * amt
}
