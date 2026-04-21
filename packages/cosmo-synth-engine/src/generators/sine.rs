use crate::params::Algo;
use super::{AlgoDefinitionV1, NO_CONTROLS};

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Sine,
	name: "Sine",
	icon_path: "M4,12 C6,4 10,4 12,12 C14,20 18,20 20,12",
	visible: false,
	controls: &NO_CONTROLS,
};

/// Sine algorithm phase behavior (passthrough).
pub fn warp_phase(phase: f32, _amt: f32) -> f32 {
	phase
}
