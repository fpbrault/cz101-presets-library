/// FX chain: chorus, delay, Freeverb-style reverb.
///
/// Ported from `FxChain` in `pdVisualizerProcessor.js` (lines 336-467).
extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use libm::{cosf, sinf};

const SMOOTH_COEFF: f32 = 0.005;

// TWO_PI for f32
const TWO_PI: f32 = core::f32::consts::PI * 2.0;

// ---------------------------------------------------------------------------
// DelayLine
// ---------------------------------------------------------------------------

pub struct DelayLine {
    buffer: Vec<f32>,
    length: usize,
    write_pos: usize,
}

impl DelayLine {
    pub fn new(length: usize) -> Self {
        Self {
            buffer: vec![0.0_f32; length],
            length,
            write_pos: 0,
        }
    }

    /// Write a sample and advance the write pointer.
    #[inline]
    pub fn write(&mut self, value: f32) {
        self.buffer[self.write_pos] = value;
        self.write_pos = (self.write_pos + 1) % self.length;
    }

    /// Read a sample at `offset` samples behind the write pointer.
    #[inline]
    pub fn read(&self, offset: usize) -> f32 {
        // Equivalent to JS: (writePos - offset + length) % length
        let pos = (self.write_pos + self.length - offset % self.length) % self.length;
        self.buffer[pos]
    }

    /// Linear-interpolated read at fractional delay `samples`.
    #[inline]
    pub fn read_at_fractional(&self, samples: f32) -> f32 {
        let int_part = libm::floorf(samples) as usize;
        let frac = samples - libm::floorf(samples);
        let a = self.read(int_part);
        let b = self.read(int_part + 1);
        a + (b - a) * frac
    }
}

// ---------------------------------------------------------------------------
// CombFilter  (Freeverb-style)
// ---------------------------------------------------------------------------

pub struct CombFilter {
    delay: DelayLine,
    filter_store: f32,
}

impl CombFilter {
    pub fn new(delay_samples: usize) -> Self {
        Self {
            delay: DelayLine::new(delay_samples),
            filter_store: 0.0,
        }
    }

    /// Process one sample.
    /// `feedback` and `damping` are computed externally per-call (matches JS).
    #[inline]
    pub fn process(&mut self, input: f32, feedback: f32, damping: f32) -> f32 {
        let damp1 = damping;
        let damp2 = 1.0 - damping;
        let output = self.delay.read(0);
        // One-pole LPF on the feedback path
        self.filter_store = output * damp2 + self.filter_store * damp1;
        self.delay.write(input + self.filter_store * feedback);
        output
    }
}

// ---------------------------------------------------------------------------
// AllPassFilter
// ---------------------------------------------------------------------------

pub struct AllPassFilter {
    delay: DelayLine,
    pub feedback: f32,
}

impl AllPassFilter {
    pub fn new(delay_samples: usize) -> Self {
        Self {
            delay: DelayLine::new(delay_samples),
            feedback: 0.5,
        }
    }

    #[inline]
    pub fn process(&mut self, input: f32) -> f32 {
        let delayed = self.delay.read(0);
        let output = -input + delayed;
        self.delay.write(input + delayed * self.feedback);
        output
    }
}

// ---------------------------------------------------------------------------
// FxChain
// ---------------------------------------------------------------------------

pub struct FxChain {
    // Chorus
    pub chorus_delay: DelayLine,
    pub chorus_phase: f32,
    pub chorus_rate: f32,
    pub chorus_depth: f32,
    pub chorus_mix: f32,
    pub chorus_enabled: bool,
    smooth_chorus_depth: f32,

    // Simple delay
    pub delay_line: DelayLine,
    pub delay_time: f32,
    pub delay_feedback: f32,
    pub delay_mix: f32,
    pub delay_enabled: bool,
    smooth_delay_samples: f32,

    // Freeverb-style reverb
    pub reverb_combs: [CombFilter; 8],
    pub reverb_allpass: [AllPassFilter; 4],
    pub reverb_pre_delay_line: DelayLine,
    pub reverb_mix: f32,
    pub reverb_size: f32,
    pub reverb_damping: f32,
    pub reverb_pre_delay: f32,
    pub reverb_enabled: bool,
    smooth_reverb_pre_delay: f32,

    sample_rate: f32,
}

impl FxChain {
    /// Construct a new `FxChain` for the given sample rate.
    ///
    /// Delay-line sizes match the JS constructor exactly:
    /// - Chorus buffer : `round(0.05 * sr) + 2`
    /// - Delay line    : `round(2 * sr)`
    /// - Comb sizes    : 1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116  (scaled by sr/44100)
    /// - Allpass sizes : 225, 556, 441, 341                               (scaled by sr/44100)
    /// - Pre-delay buf : `round(0.1 * sr) + 2`
    pub fn new(sr: f32) -> Self {
        let sr_ratio = sr / 44100.0;

        // Chorus
        let chorus_buf_len = libm::roundf(0.05 * sr) as usize + 2;
        let chorus_delay = DelayLine::new(chorus_buf_len);

        // Delay
        let delay_buf_len = libm::roundf(2.0 * sr) as usize;
        let delay_line = DelayLine::new(delay_buf_len);

        // Reverb combs — full 8-filter Freeverb network
        let comb_sizes = [1557_f32, 1617.0, 1491.0, 1422.0, 1277.0, 1356.0, 1188.0, 1116.0];
        let reverb_combs = [
            CombFilter::new(libm::roundf(comb_sizes[0] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[1] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[2] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[3] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[4] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[5] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[6] * sr_ratio) as usize),
            CombFilter::new(libm::roundf(comb_sizes[7] * sr_ratio) as usize),
        ];

        // Reverb allpasses
        let ap_sizes = [225_f32, 556.0, 441.0, 341.0];
        let reverb_allpass = [
            AllPassFilter::new(libm::roundf(ap_sizes[0] * sr_ratio) as usize),
            AllPassFilter::new(libm::roundf(ap_sizes[1] * sr_ratio) as usize),
            AllPassFilter::new(libm::roundf(ap_sizes[2] * sr_ratio) as usize),
            AllPassFilter::new(libm::roundf(ap_sizes[3] * sr_ratio) as usize),
        ];

        // Reverb pre-delay line (max 100 ms)
        let pre_delay_buf_len = libm::roundf(0.1 * sr) as usize + 2;
        let reverb_pre_delay_line = DelayLine::new(pre_delay_buf_len);

        Self {
            chorus_delay,
            chorus_phase: 0.0,
            chorus_rate: 0.8,
            chorus_depth: 0.003,
            chorus_mix: 0.0,
            chorus_enabled: false,
            smooth_chorus_depth: 0.003,

            delay_line,
            delay_time: 0.3,
            delay_feedback: 0.35,
            delay_mix: 0.0,
            delay_enabled: false,
            smooth_delay_samples: libm::roundf(0.3 * sr) as f32,

            reverb_combs,
            reverb_allpass,
            reverb_pre_delay_line,
            reverb_mix: 0.0,
            reverb_size: 0.5,
            reverb_damping: 0.5,
            reverb_pre_delay: 0.0,
            reverb_enabled: false,
            smooth_reverb_pre_delay: 0.0,

            sample_rate: sr,
        }
    }

    #[inline]
    fn smooth(current: f32, target: f32, coeff: f32) -> f32 {
        current + (target - current) * coeff
    }

    /// Process chorus effect.
    ///
    /// LFO-modulated delay line with equal-power crossfade and smoothed depth.
    pub fn process_chorus(&mut self, sample: f32) -> f32 {
        if !self.chorus_enabled || self.chorus_mix <= 0.0 {
            return sample;
        }
        self.smooth_chorus_depth =
            Self::smooth(self.smooth_chorus_depth, self.chorus_depth, SMOOTH_COEFF) / 10.0;
        self.chorus_phase += self.chorus_rate / self.sample_rate;
        if self.chorus_phase >= 1.0 {
            self.chorus_phase -= 1.0;
        }
        let mod_val = sinf(TWO_PI * self.chorus_phase);
        let delay_samples = (0.005 + self.smooth_chorus_depth * (mod_val + 1.0)) * self.sample_rate;
        let delay_samples = if delay_samples < 1.0 {
            1.0
        } else {
            delay_samples
        };
        let wet = self.chorus_delay.read_at_fractional(delay_samples);
        self.chorus_delay.write(sample);
        // Equal-power crossfade: dry² + wet² = 1
        let mix_angle = self.chorus_mix * core::f32::consts::PI * 0.5;
        let dry_gain = cosf(mix_angle);
        let wet_gain = sinf(mix_angle);
        sample * dry_gain + wet * wet_gain
    }

    /// Process simple feedback delay with smoothed delay time.
    pub fn process_delay(&mut self, sample: f32) -> f32 {
        if !self.delay_enabled || self.delay_mix <= 0.0 {
            return sample;
        }
        self.smooth_delay_samples = Self::smooth(
            self.smooth_delay_samples,
            self.delay_time * self.sample_rate,
            SMOOTH_COEFF,
        );
        let delay_samples = if self.smooth_delay_samples < 1.0 {
            1.0
        } else {
            self.smooth_delay_samples
        };
        let delayed = self.delay_line.read_at_fractional(delay_samples);
        self.delay_line
            .write(sample + delayed * self.delay_feedback);
        // Equal-power crossfade: dry² + wet² = 1
        let mix_angle = self.delay_mix * core::f32::consts::PI * 0.5;
        let dry_gain = cosf(mix_angle);
        let wet_gain = sinf(mix_angle);
        sample * dry_gain + delayed * wet_gain
    }

    /// Process Freeverb-style reverb with equal-power wet/dry mix.
    ///
    /// Improvements over the original 4-comb design:
    /// - Full 8-comb Freeverb network for denser, more natural reverb tails.
    /// - Independent `reverb_damping` parameter (0 = bright, 1 = dark).
    /// - Pre-delay line for added depth and dry/wet separation.
    pub fn process_reverb(&mut self, sample: f32) -> f32 {
        if !self.reverb_enabled || self.reverb_mix <= 0.0 {
            return sample;
        }
        let size = self.reverb_size;
        let feedback = 0.28 + size * 0.56;
        // Map 0–1 damping param to a perceptually useful range (0.05–0.85).
        let damping = 0.05 + self.reverb_damping * 0.8;

        // Smooth and apply pre-delay.
        self.smooth_reverb_pre_delay = Self::smooth(
            self.smooth_reverb_pre_delay,
            self.reverb_pre_delay * self.sample_rate,
            SMOOTH_COEFF,
        );
        let pre_delay_samples = self.smooth_reverb_pre_delay;
        self.reverb_pre_delay_line.write(sample);
        let reverb_input = if pre_delay_samples >= 1.0 {
            self.reverb_pre_delay_line.read_at_fractional(pre_delay_samples)
        } else {
            sample
        };

        // Sum all 8 comb filters in parallel.
        let mut sum = 0.0_f32;
        for i in 0..8 {
            sum += self.reverb_combs[i].process(reverb_input, feedback, damping);
        }
        sum /= 8.0;

        // Cascade 4 allpass diffusers.
        let allpass_feedback = 0.55 + size * 0.1;
        for i in 0..4 {
            self.reverb_allpass[i].feedback = allpass_feedback;
            sum = self.reverb_allpass[i].process(sum);
        }

        // Equal-power crossfade: dry² + wet² = 1
        let mix_angle = self.reverb_mix * core::f32::consts::PI * 0.5;
        let dry_gain = cosf(mix_angle);
        let wet_gain = sinf(mix_angle);
        sample * dry_gain + sum * wet_gain
    }

    /// Run chorus → delay → reverb chain.
    pub fn process(&mut self, sample: f32) -> f32 {
        let out = self.process_chorus(sample);
        let out = self.process_delay(out);
        self.process_reverb(out)
    }
}
