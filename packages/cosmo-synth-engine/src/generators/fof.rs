use super::{wrap01, AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};
use crate::params::Algo;

const CONTROLS: [AlgoControlV1; 4] = [
    AlgoControlV1 {
        id: "fofRatio",
        label: "Ratio",
        description: "Sets the internal carrier multiplier used for the formant-like repetition.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "fofTightness",
        label: "Tight",
        description: "Narrows or widens the Gaussian-like formant window.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "fofOffset",
        label: "Offset",
        description: "Offsets the repeated carrier phase before the formant window is applied.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "fofSkew",
        label: "Skew",
        description: "Moves the center of the formant window toward the start or end of the cycle.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Fof,
    name: "FOF",
    icon_path: "M4,16 C8,4 10,4 12,16 C14,4 16,4 20,16",
    visible: true,
    controls: &CONTROLS,
};

/// Formant-like (FOF) algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, ratio: f32, tightness: f32, offset: f32, skew: f32) -> f32 {
    let carrier = wrap01((phase + (offset - 0.5) * 0.5) * (2.0 + ratio * 8.0));
    let diff = phase - (0.25 + skew * 0.5);
    let sharpness = 8.0 + tightness * 36.0;
    let window = libm::expf(-sharpness * diff * diff);
    wrap01(carrier * (1.0 - amt) + carrier * window * amt)
}
