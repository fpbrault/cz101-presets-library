use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};
use crate::params::Algo;

const CONTROLS: [AlgoControlV1; 4] = [
    AlgoControlV1 {
        id: "skewBias",
        label: "Bias",
        description: "Moves the breakpoint where the skewed ramp changes slope.",
        kind: AlgoControlKindV1::Number,
        control_type: super::AlgoControlPresentationV1::Knob,
        bipolar: false,
        icon_name: None,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.2),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "skewCurve",
        label: "Curve",
        description: "Adjusts the curvature on both sides of the skew breakpoint.",
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
        id: "skewSpread",
        label: "Spread",
        description: "Redistributes how much of the cycle is assigned to each side of the skew.",
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
        id: "skewTilt",
        label: "Tilt",
        description: "Tilts the skewed ramp so one side becomes steeper than the other.",
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
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Skew,
    name: "Skew",
    icon_path: "M4,20 L10,6 L20,4",
    visible: true,
    controls: &CONTROLS,
};

/// Skew algorithm phase warp.
pub fn warp_phase(phase: f32, amt: f32, bias: f32, curve: f32, spread: f32, tilt: f32) -> f32 {
    let bp = (0.05 + bias * 0.9).clamp(0.05, 0.95);
    // spread is bipolar [-1, 1]; remap: old = (spread + 1) / 2
    let left_span = 0.675 + spread * 0.325;
    let right_span = 0.675 - spread * 0.325;
    let target = if phase < bp {
        left_span * libm::powf((phase / bp).clamp(0.0, 1.0), 0.4 + curve * 2.2)
    } else {
        left_span
            + right_span
                * libm::powf(
                    ((phase - bp) / (1.0 - bp)).clamp(0.0, 1.0),
                    // tilt is bipolar [-1, 1]; remap: old = (tilt + 1) / 2, so (old - 0.5) = tilt / 2
                    0.4 + (1.0 - curve + tilt * 0.25) * 2.2,
                )
    };
    phase + (target - phase) * amt
}
