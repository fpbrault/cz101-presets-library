use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};
use crate::params::Algo;

const CONTROLS: [AlgoControlV1; 4] = [
    AlgoControlV1 {
        id: "pinchFocus",
        label: "Focus",
        description: "Moves the pinch center toward the start or end of the cycle.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "pinchAsym",
        label: "Asym",
        description: "Adds asymmetry so one side of the pinch shifts more than the other.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.0),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "pinchCurve",
        label: "Curve",
        description: "Changes the curvature of the pinched center region.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "pinchDrive",
        label: "Drive",
        description: "Pushes the pinch harder for a tighter, more exaggerated distortion.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Pinch,
    name: "Pinch",
    icon_path: "M4,12 C8,4 10,12 12,12 C14,12 16,20 20,12",
    visible: true,
    controls: &CONTROLS,
};

/// Pinch algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, focus: f32, asym: f32, curve: f32, drive: f32) -> f32 {
    let center = 0.3 + focus * 0.4;
    let intensity = 1.0 + amt * (2.0 + focus * 5.0 + drive * 4.0);
    let shaped = if phase < center {
        center * libm::powf((phase / center).clamp(0.0, 1.0), intensity)
    } else {
        let right_norm = ((phase - center) / (1.0 - center)).clamp(0.0, 1.0);
        center + (1.0 - center) * (1.0 - libm::powf(1.0 - right_norm, intensity))
    };
    let asym_shift = (asym - 0.5) * (0.2 + drive * 0.2);
    let curved = if shaped < 0.5 {
        0.5 * libm::powf((shaped * 2.0).clamp(0.0, 1.0), 0.35 + curve * 2.4)
    } else {
        0.5 + 0.5 * (1.0 - libm::powf(((1.0 - shaped) * 2.0).clamp(0.0, 1.0), 0.35 + curve * 2.4))
    };
    (curved + asym_shift).clamp(0.0, 1.0)
}
