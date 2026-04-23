use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};
use crate::params::Algo;

const CONTROLS: [AlgoControlV1; 4] = [
    AlgoControlV1 {
        id: "clipDrive",
        label: "Drive",
        description: "Increases the gain before clipping for a stronger flattened peak.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "clipShape",
        label: "Shape",
        description: "Sets the clip threshold width from narrow to wide.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "clipBias",
        label: "Bias",
        description: "Offsets the clipped region toward the start or end of the cycle.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "clipSoft",
        label: "Soft",
        description: "Blends from hard clipping into a softer rounded saturation.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.0),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Clip,
    name: "Clip",
    icon_path: "M4,16 L8,16 L8,8 L16,8 L16,16 L20,16",
    visible: true,
    controls: &CONTROLS,
};

/// Clip algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, drive: f32, shape: f32, bias: f32, soft: f32) -> f32 {
    let gain = 1.0 + amt * (2.0 + drive * 8.0);
    let clip = 0.15 + (1.0 - shape) * 0.35;
    let x = ((phase - 0.5) + (bias - 0.5) * 0.5) * gain;
    let hard = x.clamp(-clip, clip);
    let soft_mix = soft.clamp(0.0, 1.0);
    let softened = libm::tanhf(x / clip.max(0.001)) * clip;
    let mixed = hard * (1.0 - soft_mix) + softened * soft_mix;
    mixed / (clip * 2.0) + 0.5
}
