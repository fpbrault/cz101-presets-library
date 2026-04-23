use crate::envelope_map::{human_level_to_raw, human_rate_to_raw, EnvelopeKind};
use crate::params::{EnvStep, StepEnvData};

fn step(kind: EnvelopeKind, level: u8, rate: u8) -> EnvStep {
    EnvStep {
        level: human_level_to_raw(kind, level),
        rate: human_rate_to_raw(kind, rate),
    }
}

/// Default DCA (amplitude) envelope — full level attack, gentle sustain, release to 0.
/// All values specified in human [0, 99] and converted to raw [0, 127] at construction.
pub fn default_dca_env() -> StepEnvData {
    let s = |l, r| step(EnvelopeKind::Dca, l, r);
    StepEnvData {
        steps: [
            s(99, 75),
            s(79, 80),
            s(79, 75),
            s(0, 40),
            s(0, 50),
            s(0, 50),
            s(0, 50),
            s(0, 50),
        ],
        sustain_step: 2,
        step_count: 4,
        loop_: false,
    }
}

/// Default DCW (filter) envelope — full brightness attack, sustained brightness, release to 0.
/// All values specified in human [0, 99] and converted to raw [0, 127] at construction.
pub fn default_dcw_env() -> StepEnvData {
    let s = |l, r| step(EnvelopeKind::Dcw, l, r);
    StepEnvData {
        steps: [
            s(99, 75),
            s(99, 80),
            s(99, 75),
            s(0, 40),
            s(0, 50),
            s(0, 50),
            s(0, 50),
            s(0, 50),
        ],
        sustain_step: 2,
        step_count: 4,
        loop_: false,
    }
}

/// Default DCO (pitch) envelope — flat (no pitch modulation) by default.
/// All values specified in human [0, 99] and converted to raw [0, 127] at construction.
pub fn default_dco_env() -> StepEnvData {
    let s = |l, r| step(EnvelopeKind::Dco, l, r);
    StepEnvData {
        steps: [
            s(0, 0),
            s(0, 0),
            s(0, 0),
            s(0, 0),
            s(0, 0),
            s(0, 0),
            s(0, 0),
            s(0, 0),
        ],
        sustain_step: 1,
        step_count: 2,
        loop_: false,
    }
}
