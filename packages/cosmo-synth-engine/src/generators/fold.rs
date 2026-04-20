use super::wrap01;
use super::{AlgoDefinitionV1, AlgoRefV1, WARP_AMOUNT_CONTROL};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Fold,
	name: "Fold",
	icon_path: "M4,20 L8,4 L12,20 L16,4 L20,20",
	visible: true,
	controls: &WARP_AMOUNT_CONTROL,
};

/// Fold algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32) -> f32 {
	let mut p = phase;
	let folds = 1 + libm::floorf(amt * 5.0) as u32;
	for _ in 0..folds {
		if p > 0.5 {
			p = 1.0 - p;
		}
		p *= 2.0;
	}
	wrap01(p)
}
