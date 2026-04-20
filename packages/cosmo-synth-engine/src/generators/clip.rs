use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Clip,
	name: "Clip",
	icon_path: "M4,16 L8,16 L8,8 L16,8 L16,16 L20,16",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Clip algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let gain = 1.0 + amt * 4.0;
	let x = (phase - 0.5) * gain;
	x.clamp(-0.5_f32, 0.5_f32) + 0.5
}
