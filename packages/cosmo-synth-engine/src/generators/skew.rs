use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Skew,
	name: "Skew",
	icon_path: "M4,20 L10,6 L20,4",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Skew algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let bp = 0.2_f32;
	let target = if phase < bp {
		(phase / bp) * 0.5
	} else {
		0.5 + ((phase - bp) / (1.0 - bp)) * 0.5
	};
	phase + (target - phase) * amt
}
