use crate::params::StepEnvData;

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
    pub fn advance(&mut self, env_data: &StepEnvData, sr: f32, key_follow: f32, note: u8) {
        let steps = &env_data.steps;
        let step_count = steps.len().max(1); // NUM_ENV_STEPS = 8, always 8 in our fixed array
        let sustain_step = env_data.sustain_step.min(step_count - 1);
        let effective_end_step = step_count - 1;
        let current_step = self.step.min(effective_end_step);

        let note_offset = (note as f32 - 60.0) / 60.0;
        let speed_mult = 1.0 + key_follow * note_offset * 0.1;

        let step_data = &steps[current_step];
        let target_level = step_data.level;
        let raw_duration = step_duration_samples(self.prev_level, target_level, step_data.rate, sr);
        // Apply key-follow speed multiplier, ensure at least 1
        let duration = if raw_duration == 0 {
            0
        } else {
            (raw_duration as f32 / speed_mult).max(1.0).round() as u32
        };

        if self.releasing {
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
                    self.output = steps[effective_end_step].level;
                }
            }
            return;
        }

        // Normal (non-releasing) path
        let num_steps = step_count;
        if num_steps == 0 {
            return;
        }

        // Re-read using current_step (matches JS which re-assigns stepData)
        let step_data2 = &steps[current_step];
        let target_level2 = step_data2.level;
        let duration2 = step_duration_samples(self.prev_level, target_level2, step_data2.rate, sr);
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
                    self.output = steps[effective_end_step].level;
                }
            }
        }
    }

    /// Begin the release phase of the envelope.
    ///
    /// Mirrors `startEnvRelease` in pdVisualizerProcessor.js exactly.
    pub fn start_release(&mut self, env_data: &StepEnvData) {
        let steps = &env_data.steps;
        let step_count = steps.len().max(1);
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
    let r = rate as f32 / 99.0;
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
