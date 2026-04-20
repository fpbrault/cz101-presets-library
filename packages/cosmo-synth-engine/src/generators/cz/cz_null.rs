use super::lerp;
use super::{AlgoDefinitionV1, AlgoRefV1, DCW_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Null,
	name: "Null",
	icon_path: "M4,12 L12,12 L20,12",
	visible: false,
	controls: &DCW_CONTROL,
};

/// CZ Null phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	let p_peak = lerp(0.5, 0.01, dcw);

	if phi < p_peak {
		(phi / p_peak) * 0.5
	} else {
		1.0
	}
}
