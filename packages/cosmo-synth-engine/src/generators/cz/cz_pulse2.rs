use super::{lerp, wrap01};
use super::{AlgoDefinitionV1, AlgoRefV1, DCW_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Pulse2,
	name: "Pulse2",
	icon_path: "M4,20 L7,20 L7,4 L10,4 L10,20 L14,20 L14,4 L17,4 L17,20 L20,20",
	visible: false,
	controls: &DCW_CONTROL,
};

/// CZ Pulse2 phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	let p = wrap01(phi * 2.0);
	let p_peak = lerp(0.5, 0.01, dcw);
	let p_hold = lerp(0.5, 0.01, dcw);
	let p_fall = lerp(1.0, 0.01, dcw);

	if p < p_peak {
		(p / p_peak) * 0.5
	} else if p < p_hold {
		0.5
	} else if p < p_fall {
		0.5 + ((p - p_hold) / (p_fall - p_hold)) * 0.5
	} else {
		1.0
	}
}
