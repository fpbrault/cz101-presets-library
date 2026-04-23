extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;

use crate::params::Algo;

use super::{
    AlgoControlKindV1, AlgoControlV1, AlgoDefinitionV1, LineRenderConfig, NO_CONTROL_OPTIONS,
    PER_LINE_HEADROOM,
};

const CONTROLS: [AlgoControlV1; 4] = [
    AlgoControlV1 {
        id: "karpunkDamp",
        label: "Damp",
        description: "Controls how quickly high-frequency energy is damped in the string model.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "karpunkBright",
        label: "Bright",
        description: "Adjusts the brightness of the feedback filter inside the string loop.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "karpunkDecay",
        label: "Decay",
        description: "Sets how long the plucked string sustains before fading out.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.5),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
    AlgoControlV1 {
        id: "karpunkExcite",
        label: "Excite",
        description: "Injects fresh noise into the delay line for a noisier or raspier pluck.",
        kind: AlgoControlKindV1::Number,
        min: Some(0.0),
        max: Some(1.0),
        default: Some(0.0),
        default_toggle: None,
        options: &NO_CONTROL_OPTIONS,
    },
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
    id: Algo::Karpunk,
    name: "Karpunk",
    icon_path: "M4,16 C8,2 12,22 16,8 L20,12",
    visible: true,
    controls: &CONTROLS,
};

pub const KS_BUFFER_SIZE: usize = 2048;
pub const DEFAULT_PRNG_SEED: u32 = 0x1234_5678;
pub const SECONDARY_PRNG_SALT: u32 = 0x9e37_79b9;

/// All Karpunk state owned by a single synth voice.
#[derive(Debug, Clone)]
pub struct KarpunkPair {
    line1: KarpunkState,
    line2: KarpunkState,
}

impl KarpunkPair {
    pub fn new() -> Self {
        Self {
            line1: KarpunkState::default(),
            line2: KarpunkState::new(DEFAULT_PRNG_SEED ^ SECONDARY_PRNG_SALT),
        }
    }

    /// Reseed both Karpunk lines for a note-on event.
    pub fn reseed_for_note(&mut self, note: u8) {
        self.line1.reseed_for_note(note);
        self.line2.reseed_for_note(note.wrapping_add(1));
    }

    /// Render line 1 using the first Karpunk state buffer when needed.
    pub fn render_line1(&mut self, config: LineRenderConfig<'_>) -> (f32, Option<f32>) {
        render_line(&mut self.line1, config)
    }

    /// Render line 2 using the second Karpunk state buffer when needed.
    pub fn render_line2(&mut self, config: LineRenderConfig<'_>) -> (f32, Option<f32>) {
        render_line(&mut self.line2, config)
    }
}

impl Default for KarpunkPair {
    fn default() -> Self {
        Self::new()
    }
}

/// Stateful Karplus-Strong engine state for one oscillator line.
#[derive(Debug, Clone)]
pub struct KarpunkState {
    pub buffer: Vec<f32>,
    pub write_pos: usize,
    pub last_sample: f32,
    pub prng: u32,
}

impl KarpunkState {
    pub fn new(prng_seed: u32) -> Self {
        Self {
            buffer: vec![0.0_f32; KS_BUFFER_SIZE],
            write_pos: 0,
            last_sample: 0.0,
            prng: prng_seed,
        }
    }

    pub fn reseed_for_note(&mut self, note: u8) {
        self.prng = self
            .prng
            .wrapping_add(note as u32)
            .wrapping_mul(0x9e37_79b9);
        for s in self.buffer.iter_mut() {
            *s = lcg_rand(&mut self.prng);
        }
        self.write_pos = 0;
        self.last_sample = 0.0;
    }

    pub fn advance(
        &mut self,
        effective_freq: f32,
        sample_rate: f32,
        dcw: f32,
        damp_control: f32,
        bright_control: f32,
        decay_control: f32,
        excite_control: f32,
    ) -> f32 {
        let safe_freq = if effective_freq > 0.0 {
            effective_freq
        } else {
            220.0
        };
        let ks_size = (libm::roundf(sample_rate / safe_freq) as usize).clamp(2, KS_BUFFER_SIZE - 1);
        let read_pos = (self.write_pos + KS_BUFFER_SIZE - ks_size) % KS_BUFFER_SIZE;
        let out = self.buffer[read_pos];
        let damp = (0.2 + dcw * 0.45 + damp_control.clamp(0.0, 1.0) * 0.35).clamp(0.0, 1.0);
        let bright = bright_control.clamp(0.0, 1.0);
        let filtered =
            damp * out + (1.0 - damp) * (bright * out + (1.0 - bright) * self.last_sample);
        let decay = 0.96 + decay_control.clamp(0.0, 1.0) * 0.039;
        let excite = excite_control.clamp(0.0, 1.0) * 0.03;

        self.last_sample = filtered;
        self.buffer[self.write_pos] = filtered * decay + excite * lcg_rand(&mut self.prng);
        self.write_pos = (self.write_pos + 1) % KS_BUFFER_SIZE;

        filtered
    }
}

impl Default for KarpunkState {
    fn default() -> Self {
        Self::new(DEFAULT_PRNG_SEED)
    }
}

fn render_line(ks_state: &mut KarpunkState, config: LineRenderConfig<'_>) -> (f32, Option<f32>) {
    let control_value = |id: &str, default: f32| {
        super::resolve_algo_control_value(
            config.primary_algo,
            config.algo_controls,
            id,
            default,
            &config.algo_param_mods,
        )
    };

    let ks_raw = if requires_state_tick(config.primary_algo, config.secondary_algo) {
        Some(ks_state.advance(
            config.effective_freq,
            config.sample_rate,
            config.final_dcw,
            control_value("karpunkDamp", 0.5),
            control_value("karpunkBright", 0.5),
            control_value("karpunkDecay", 0.5),
            control_value("karpunkExcite", 0.0),
        ))
    } else {
        None
    };

    let sample = if let Some(secondary_algo) = config.secondary_algo {
        let secondary_dcw = config.final_dcw * config.blend;
        let primary_dcw = config.final_dcw * (1.0 - config.blend);
        let primary = super::render_algo_sample(
            config.primary_algo,
            config.phase,
            primary_dcw,
            config.algo_controls,
            config.algo_param_mods,
            ks_raw,
        );
        let secondary = super::render_algo_sample(
            secondary_algo,
            config.phase,
            secondary_dcw,
            config.algo_controls,
            config.algo_param_mods,
            ks_raw,
        );
        blend(config.primary_algo, primary, secondary, config.blend)
    } else {
        super::render_algo_sample(
            config.primary_algo,
            config.phase,
            config.final_dcw,
            config.algo_controls,
            config.algo_param_mods,
            ks_raw,
        )
    };

    (
        sample * config.window_gain * config.final_dca * PER_LINE_HEADROOM,
        ks_raw,
    )
}

#[inline(always)]
pub fn requires_state_tick(primary_algo: Algo, secondary_algo: Option<Algo>) -> bool {
    primary_algo == Algo::Karpunk || secondary_algo == Some(Algo::Karpunk)
}

#[inline(always)]
pub fn blend(primary_algo: Algo, primary: f32, secondary: f32, blend: f32) -> f32 {
    if primary_algo == Algo::Karpunk {
        lerp(primary, primary * secondary * 2.0, blend)
    } else {
        lerp(primary, secondary, blend)
    }
}

#[inline(always)]
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Simple LCG PRNG — produces a value in [-1.0, 1.0].
///
/// Parameters from Numerical Recipes (Knuth): multiplier 1664525, increment 1013904223.
#[inline(always)]
fn lcg_rand(state: &mut u32) -> f32 {
    *state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
    let bits = (*state >> 16) as f32;
    bits / 32767.5 - 1.0
}
