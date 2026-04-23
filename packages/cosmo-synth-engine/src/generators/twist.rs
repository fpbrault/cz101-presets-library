use super::wrap01;
use super::{AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, NO_CONTROL_OPTIONS};
use crate::params::Algo;

const CONTROLS: [AlgoControlV1; 4] = [
    AlgoControlV1 {
        id: "twistHarmonics",
        label: "Harm",
        description: "Sets the internal modulation harmonic used to twist the phase.",
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
        id: "twistDepth",
        label: "Depth",
        description: "Controls how far the phase is displaced by the twist modulator.",
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
        id: "twistPhase",
        label: "Phase",
        description: "Offsets the phase of the internal twist modulation signal.",
        kind: AlgoControlKindV1::Number,
        control_type: super::AlgoControlPresentationV1::Knob,
        bipolar: false,
        icon_name: None,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.0),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "twistShape",
        label: "Shape",
        description: "Changes the contour of the twist modulation from smooth to sharp.",
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
    id: Algo::Twist,
    name: "Twist",
    icon_path: "M4,12 C8,2 16,22 20,12",
    visible: true,
    controls: &CONTROLS,
};

/// Twist algorithm phase warp.
pub fn warp_phase(
    phase: f32,
    amt: f32,
    harmonics: f32,
    depth: f32,
    phase_offset: f32,
    shape: f32,
) -> f32 {
    let two_pi = core::f32::consts::TAU;
    let partials = 1.0 + harmonics * 11.0;
    let depth_scale = 0.03 + depth * 0.25;
    let driver = libm::sinf(two_pi * (phase + phase_offset) * partials);
    let shaped = if driver >= 0.0 {
        libm::powf(driver, 0.35 + shape * 2.2)
    } else {
        -libm::powf(-driver, 0.35 + shape * 2.2)
    };
    wrap01(phase + amt * depth_scale * shaped)
}
