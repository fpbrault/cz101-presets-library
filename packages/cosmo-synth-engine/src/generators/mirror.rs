use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Mirror,
	name: "Mirror",
	icon_path: "M4,20 L12,4 L20,20",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Mirror algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	phase + (1.0 - phase - phase) * amt
}
