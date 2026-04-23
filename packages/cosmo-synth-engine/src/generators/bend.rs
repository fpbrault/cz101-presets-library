use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};
use crate::params::Algo;

const CONTROLS: [AlgoControlV1; 3] = [
    AlgoControlV1 {
        id: "bendCurve",
        label: "Curve",
        description: "Changes how aggressively the phase bends along the curve.",
        kind: AlgoControlKindV1::Number,
        control_type: super::AlgoControlPresentationV1::Knob,
        bipolar: false,
        icon_name: None,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "bendBias",
        label: "Bias",
        description: "Offsets the bend toward the start or end of the cycle.",
        kind: AlgoControlKindV1::Number,
        control_type: super::AlgoControlPresentationV1::Knob,
        bipolar: true,
        icon_name: None,
        min: Some(-1.0),
        max: Some(1.0),
        default: Some(0.0),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "bendKnee",
        label: "Knee",
        description: "Shapes the transition point between the flatter and steeper bend regions.",
        kind: AlgoControlKindV1::Number,
        control_type: super::AlgoControlPresentationV1::Knob,
        bipolar: false,
        icon_name: None,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Bend,
    name: "Bend",
    icon_path: "M4,18 C10,18 14,10 20,4",
    visible: true,
    controls: &CONTROLS,
};

/// Bend algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, curve: f32, bias: f32, knee: f32) -> f32 {
    // bias is bipolar [-1, 1]; remap to [0, 1] equivalent: old = (bias + 1) / 2
    let centered = (phase - 0.5) * (1.25 + bias * 0.75) + 0.5;
    let warped_phase = centered.clamp(0.0, 1.0);
    let knee_shaped = if warped_phase < 0.5 {
        0.5 * libm::powf((warped_phase * 2.0).clamp(0.0, 1.0), 0.25 + knee * 2.75)
    } else {
        0.5 + 0.5
            * (1.0
                - libm::powf(
                    ((1.0 - warped_phase) * 2.0).clamp(0.0, 1.0),
                    0.25 + knee * 2.75,
                ))
    };
    let scale = -10.0 * (amt * (0.5 + curve * 1.5));
    let num = libm::expm1f(knee_shaped * scale);
    let den = libm::expm1f(scale);
    let bent = if den == 0.0 { phase } else { num / den };
    bent
}
