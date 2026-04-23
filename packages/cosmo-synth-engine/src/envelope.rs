pub use crate::envelope_map::EnvelopeKind;
use crate::envelope_map::{
    human_level_to_raw, human_rate_to_raw, raw_level_to_human, raw_rate_to_human,
};
use crate::params::{StepEnvData, SynthParams};

pub fn normalize_env_to_raw_if_human(kind: EnvelopeKind, env: &mut StepEnvData) {
    for step in env.steps.iter_mut() {
        step.level = human_level_to_raw(kind, step.level);
        step.rate = human_rate_to_raw(kind, step.rate);
    }
}

pub fn normalize_synth_params_envelopes_to_raw_if_human(params: &mut SynthParams) {
    normalize_env_to_raw_if_human(EnvelopeKind::Dco, &mut params.line1.dco_env);
    normalize_env_to_raw_if_human(EnvelopeKind::Dcw, &mut params.line1.dcw_env);
    normalize_env_to_raw_if_human(EnvelopeKind::Dca, &mut params.line1.dca_env);
    normalize_env_to_raw_if_human(EnvelopeKind::Dco, &mut params.line2.dco_env);
    normalize_env_to_raw_if_human(EnvelopeKind::Dcw, &mut params.line2.dcw_env);
    normalize_env_to_raw_if_human(EnvelopeKind::Dca, &mut params.line2.dca_env);
}

#[derive(Debug, Clone, Default)]
pub struct EnvGen {
    pub step: usize,
    pub step_pos: u32,
    pub prev_level: f32,
    pub output: f32,
    pub releasing: bool,
    pub release_start_level: f32,
    pub release_progress: f32,
    pub release_duration: u32,
}

impl EnvGen {
    pub fn reset(&mut self) {
        self.step = 0;
        self.step_pos = 0;
        self.prev_level = 0.0;
        self.output = 0.0;
        self.releasing = false;
        self.release_start_level = 0.0;
        self.release_progress = 0.0;
        self.release_duration = 0;
    }

    /// Advance the envelope by one sample.
    ///
    /// Mirrors `advanceEnv` in pdVisualizerProcessor.js exactly.
    pub fn advance(
        &mut self,
        kind: EnvelopeKind,
        env_data: &StepEnvData,
        sr: f32,
        key_follow: f32,
        note: u8,
    ) {
        let steps = &env_data.steps;
        // Use step_count to honour the active-step window (matches JS `stepCount`)
        let step_count = env_data.step_count.clamp(1, steps.len());
        let sustain_step = env_data.sustain_step.min(step_count - 1);
        let effective_end_step = step_count - 1;
        let current_step = self.step.min(effective_end_step);

        let note_offset = (note as f32 - 60.0) / 60.0;
        let speed_mult = 1.0 + key_follow * note_offset * 0.1;

        let step_data = &steps[current_step];
        let step_rate = raw_rate_to_human(kind, step_data.rate);
        let step_target_level = raw_level_to_human(kind, step_data.level) as f32 / 99.0;
        // CZ behaviour: the last active step always targets 0 (silence / neutral
        // pitch) so that all envelopes return to their rest state.  The stored
        // value is left untouched so it is available when step count is raised.
        let target_level = if current_step == effective_end_step {
            0.0
        } else {
            step_target_level
        };
        let frozen_step = is_frozen_step(self.prev_level, target_level, step_rate);
        let raw_duration = step_duration_samples(self.prev_level, target_level, step_rate, sr);
        // Apply key-follow speed multiplier, ensure at least 1
        let duration = if raw_duration == 0 {
            0
        } else {
            (raw_duration as f32 / speed_mult).max(1.0).round() as u32
        };

        if self.releasing {
            if frozen_step {
                // CZ-style hold: rate=0 means no progression toward target.
                // Keep current level indefinitely while key is released.
                self.output = self.prev_level;
                return;
            }

            if duration == 0 {
                self.output = target_level;
            } else {
                let progress = (self.step_pos as f32 / duration as f32).min(1.0);
                self.output = lerp(self.prev_level, target_level, progress);
            }

            self.step_pos += 1;
            if self.step_pos >= duration.max(1) {
                self.prev_level = target_level;
                self.step_pos = 0;
                self.step += 1;
                if self.step >= effective_end_step {
                    self.step = effective_end_step;
                    self.output = 0.0; // last step always ends at 0
                }
            }
            return;
        }

        // Normal (non-releasing) path
        let num_steps = step_count;
        if num_steps == 0 {
            return;
        }

        // Re-read using current_step (matches JS which re-assigns stepData).
        // CZ behaviour: last step always targets 0.
        let step_data2 = &steps[current_step];
        let step_rate2 = raw_rate_to_human(kind, step_data2.rate);
        let step_target_level2 = raw_level_to_human(kind, step_data2.level) as f32 / 99.0;
        let target_level2 = if current_step == effective_end_step {
            0.0
        } else {
            step_target_level2
        };
        let frozen_step2 = is_frozen_step(self.prev_level, target_level2, step_rate2);
        let duration2 = step_duration_samples(self.prev_level, target_level2, step_rate2, sr);

        if frozen_step2 {
            // CZ-style hold: stop advancing this envelope step.
            self.output = self.prev_level;
            return;
        }

        let progress = if duration2 == 0 {
            1.0_f32
        } else {
            (self.step_pos as f32 / duration2 as f32).min(1.0)
        };

        self.output = lerp(self.prev_level, target_level2, progress);

        // Sustain hold check
        if !env_data.loop_ && current_step == sustain_step && progress >= 1.0 {
            self.output = target_level2;
            return;
        }

        self.step_pos += 1;
        if self.step_pos >= duration2.max(1) {
            self.prev_level = target_level2;
            self.step_pos = 0;

            if !env_data.loop_ && current_step == sustain_step {
                self.output = target_level2;
                return;
            }

            self.step += 1;

            if self.step >= num_steps {
                if env_data.loop_ {
                    self.step = 0;
                } else {
                    self.step = effective_end_step;
                    self.output = 0.0; // last step always ends at 0
                }
            }
        }
    }

    /// Begin the release phase of the envelope.
    ///
    /// Mirrors `startEnvRelease` in pdVisualizerProcessor.js exactly.
    pub fn start_release(&mut self, env_data: &StepEnvData) {
        let steps = &env_data.steps;
        let step_count = env_data.step_count.clamp(1, steps.len());
        let sustain_step = env_data.sustain_step.min(step_count - 1);
        let effective_end_step = step_count - 1;

        self.releasing = true;
        self.release_progress = 0.0;

        if self.step <= sustain_step {
            self.step = (sustain_step + 1).min(effective_end_step);
            self.step_pos = 0;
        }

        self.prev_level = self.output;
    }
}

#[inline]
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Converts a rate byte [0..99] to a sample count.
///
/// JS: `Math.max(1, Math.round(sr * 5.0 * 0.0002 ** (rate / 99)))`
#[inline]
fn rate_to_samples(rate: u8, sr: f32) -> u32 {
    let clamped_rate = rate.min(99);
    let r = clamped_rate as f32 / 99.0;
    let v = sr * 5.0 * libm::powf(0.0002_f32, r);
    v.max(1.0).round() as u32
}

/// Duration in samples for a transition between two envelope levels.
///
/// JS: `Math.max(1, Math.round(rateToSamples(rate, sr) * |toLevel - fromLevel|))`
/// Returns 0 when distance is 0 (no movement needed).
#[inline]
fn step_duration_samples(from_level: f32, to_level: f32, rate: u8, sr: f32) -> u32 {
    let distance = libm::fabsf(to_level - from_level);
    if distance <= 0.0 {
        return 0;
    }
    let base = rate_to_samples(rate, sr);
    ((base as f32 * distance).max(1.0).round()) as u32
}

#[inline]
fn is_frozen_step(from_level: f32, to_level: f32, rate: u8) -> bool {
    rate == 0 && libm::fabsf(to_level - from_level) > 0.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::SynthParams;

    #[test]
    fn dco_rate_mapping_matches_spec() {
        assert_eq!(human_rate_to_raw(EnvelopeKind::Dco, 0), 0);
        assert_eq!(human_rate_to_raw(EnvelopeKind::Dco, 99), 127);
        assert_eq!(raw_rate_to_human(EnvelopeKind::Dco, 0), 0);
        assert_eq!(raw_rate_to_human(EnvelopeKind::Dco, 127), 99);
    }

    #[test]
    fn dco_level_mapping_matches_spec() {
        assert_eq!(human_level_to_raw(EnvelopeKind::Dco, 63), 63);
        assert_eq!(human_level_to_raw(EnvelopeKind::Dco, 64), 68);
        assert_eq!(human_level_to_raw(EnvelopeKind::Dco, 99), 103);
        assert_eq!(raw_level_to_human(EnvelopeKind::Dco, 63), 63);
        assert_eq!(raw_level_to_human(EnvelopeKind::Dco, 68), 64);
    }

    #[test]
    fn dcw_mapping_matches_spec() {
        assert_eq!(human_rate_to_raw(EnvelopeKind::Dcw, 0), 8);
        assert_eq!(human_rate_to_raw(EnvelopeKind::Dcw, 99), 127);
        assert_eq!(human_level_to_raw(EnvelopeKind::Dcw, 99), 127);
        assert_eq!(raw_rate_to_human(EnvelopeKind::Dcw, 8), 0);
        assert_eq!(raw_rate_to_human(EnvelopeKind::Dcw, 127), 99);
    }

    #[test]
    fn dca_mapping_matches_spec() {
        assert_eq!(human_rate_to_raw(EnvelopeKind::Dca, 0), 0);
        assert_eq!(human_rate_to_raw(EnvelopeKind::Dca, 99), 119);
        assert_eq!(human_level_to_raw(EnvelopeKind::Dca, 0), 0);
        assert_eq!(human_level_to_raw(EnvelopeKind::Dca, 1), 29);
        assert_eq!(human_level_to_raw(EnvelopeKind::Dca, 99), 127);
        assert_eq!(raw_level_to_human(EnvelopeKind::Dca, 127), 99);
    }

    #[test]
    fn normalize_synth_params_converts_human_envelopes_to_raw() {
        let mut params = SynthParams::default();
        params.line1.dco_env.steps[0].level = 66;
        params.line1.dco_env.steps[0].rate = 99;
        params.line1.dcw_env.steps[0].level = 99;
        params.line1.dcw_env.steps[0].rate = 0;
        params.line1.dca_env.steps[0].level = 1;
        params.line1.dca_env.steps[0].rate = 99;

        normalize_synth_params_envelopes_to_raw_if_human(&mut params);

        assert_eq!(params.line1.dco_env.steps[0].level, 70);
        assert_eq!(params.line1.dco_env.steps[0].rate, 127);
        assert_eq!(params.line1.dcw_env.steps[0].level, 127);
        assert_eq!(params.line1.dcw_env.steps[0].rate, 8);
        assert_eq!(params.line1.dca_env.steps[0].level, 29);
        assert_eq!(params.line1.dca_env.steps[0].rate, 119);
    }
}
