use super::wrap01;
use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Sync,
	name: "Sync",
	icon_path: "M4,20 L8,4 L8,20 L12,4 L12,20 L16,4 L16,20 L20,4",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Sync algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	wrap01(phase * (1.0 + amt * 7.0))
}
