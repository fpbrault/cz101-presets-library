use super::wrap01;
use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Fof,
	name: "FOF",
	icon_path: "M4,16 C8,4 10,4 12,16 C14,4 16,4 20,16",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Formant-like (FOF) algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let carrier = wrap01(phase * 5.0);
	let diff = phase - 0.5;
	let window = libm::expf(-20.0 * diff * diff);
	wrap01(carrier * (1.0 - amt) + carrier * window * amt)
}
