use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Bend,
	name: "Bend",
	icon_path: "M4,18 C10,18 14,10 20,4",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Bend algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let scale = -10.0 * amt;
	let num = libm::expm1f(phase * scale);
	let den = libm::expm1f(scale);
	if den == 0.0 {
		phase
	} else {
		num / den
	}
}
