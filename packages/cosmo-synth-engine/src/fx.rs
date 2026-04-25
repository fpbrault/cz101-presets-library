/// FX chain: chorus, phaser, delay (with tape echo mode), Freeverb-style reverb.
///
/// Ported from `FxChain` in `pdVisualizerProcessor.js` (lines 336-467).
extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use libm::{cosf, expf, sinf, tanhf};

const SMOOTH_COEFF: f32 = 0.005;
const TWO_PI: f32 = core::f32::consts::PI * 2.0;

// ---------------------------------------------------------------------------
// FDN reverb constants
// ---------------------------------------------------------------------------

/// Number of delay lines in the FDN.
const FDN_N: usize = 8;

/// Maximum LFO pitch-modulation depth in samples (for `character` control).
const FDN_MAX_MOD: f32 = 14.0;

/// Base FDN delay-line lengths at 44100 Hz (all prime, ≈21–69 ms).
const FDN_BASE_LENGTHS_44100: [f32; FDN_N] = [
    947.0, 1283.0, 1523.0, 1789.0, 2053.0, 2341.0, 2677.0, 3049.0,
];

/// Per-line LFO rates (Hz) — mutually inharmonic to avoid beating.
const FDN_LFO_RATES: [f32; FDN_N] = [0.127, 0.167, 0.207, 0.247, 0.289, 0.331, 0.373, 0.419];

/// Early-reflection tap delays (seconds) and gains.
const ER_N: usize = 5;
const ER_TAP_DELAYS_S: [f32; ER_N] = [0.017, 0.026, 0.035, 0.045, 0.057];
const ER_TAP_GAINS: [f32; ER_N] = [0.70, 0.55, 0.40, 0.28, 0.18];

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
    /// `offset = 1` → most-recently-written sample (1 sample delay).
    #[inline]
    pub fn read(&self, offset: usize) -> f32 {
        let pos = (self.write_pos + self.length - offset % self.length) % self.length;
        self.buffer[pos]
    }

    /// Linear-interpolated read at fractional delay `samples` (≥ 1).
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
// FdnReverb — 8-line Feedback Delay Network with early reflections
//
// Topology:
//   input → pre-delay → [early reflections bank] ─────────────────────────┐
//                      → [FDN: 8 delay lines, Householder matrix,          │
//                               per-line LP brightness filter,             │
//                               per-line LFO modulation for character]     │
//                                     └── late reverb output               │
//   output = distance_blend(early_reflections, late_reverb) ← ────────────┘
//          = equal-power mix(dry, wet)
//
// Parameters
// ----------
// space      – feedback gain (decay time / room size). 0 = dead, 1 = hall.
// predelay   – pre-delay time 0–0.1 s before reverb onset.
// character  – combined brightness and modulation depth.
// distance   – near/far blend between early reflections and late reverb.
// mix        – equal-power wet/dry crossfade.
// ---------------------------------------------------------------------------

pub struct FdnReverb {
    // 8 FDN delay lines (each length = base + FDN_MAX_MOD + 1 for modulation headroom)
    lines: [DelayLine; FDN_N],
    /// Pre-computed base read offsets (in samples) for each FDN line.
    base_lengths: [f32; FDN_N],
    /// One-pole LP filter state per line (brightness damping).
    lp_state: [f32; FDN_N],
    /// LFO phase per line (0–1).
    lfo_phases: [f32; FDN_N],
    /// Smoothed pre-delay (samples).
    smooth_predelay: f32,
    /// Pre-delay line (max 100 ms).
    pre_line: DelayLine,
    /// Early-reflection line; tapped at 5 fixed offsets.
    er_line: DelayLine,
    /// Pre-computed ER tap offsets in samples (scaled to current SR).
    er_tap_samples: [f32; ER_N],
    sample_rate: f32,

    // --- parameters (set by FxChain / processor) ---
    pub enabled: bool,
    pub mix: f32,
    pub space: f32,
    pub predelay: f32,
    pub distance: f32,
    pub character: f32,
}

impl FdnReverb {
    pub fn new(sr: f32) -> Self {
        let ratio = sr / 44100.0;

        // Scale and store base lengths
        let base_lengths: [f32; FDN_N] =
            core::array::from_fn(|i| FDN_BASE_LENGTHS_44100[i] * ratio);

        // Each delay line is slightly longer than base to allow positive LFO swing
        let lines: [DelayLine; FDN_N] = core::array::from_fn(|i| {
            DelayLine::new(base_lengths[i] as usize + FDN_MAX_MOD as usize + 2)
        });

        // Pre-delay: 100 ms max
        let pre_line = DelayLine::new(libm::roundf(0.1 * sr) as usize + 2);

        // Early-reflection tap storage: max tap is ~57 ms, so 80 ms buffer is safe
        let er_line = DelayLine::new(libm::roundf(0.08 * sr) as usize + 2);
        let er_tap_samples: [f32; ER_N] =
            core::array::from_fn(|i| (ER_TAP_DELAYS_S[i] * sr).max(1.0));

        Self {
            lines,
            base_lengths,
            lp_state: [0.0; FDN_N],
            lfo_phases: [0.0; FDN_N],
            smooth_predelay: 0.0,
            pre_line,
            er_line,
            er_tap_samples,
            sample_rate: sr,
            enabled: false,
            mix: 0.0,
            space: 0.5,
            predelay: 0.0,
            distance: 0.3,
            character: 0.65,
        }
    }

    /// Process one sample through the FDN reverb and return the mixed output.
    pub fn process(&mut self, sample: f32) -> f32 {
        // --- Parameter mapping ---
        // space → feedback gain (0 = dead 0.50, 1 = hall 0.97)
        let g = 0.50 + self.space * 0.47;
        let character = self.character.clamp(0.0, 1.0);
        let lp_damp = (0.90 - character * 0.85).clamp(0.0, 0.995);
        let lfo_depth = character * (FDN_MAX_MOD * 0.5);

        // --- Pre-delay ---
        self.smooth_predelay = Self::smooth(
            self.smooth_predelay,
            self.predelay * self.sample_rate,
            SMOOTH_COEFF,
        );
        self.pre_line.write(sample);
        let pre_delayed = if self.smooth_predelay >= 1.0 {
            self.pre_line.read_at_fractional(self.smooth_predelay)
        } else {
            sample
        };

        // --- Early reflections ---
        // Tap the ER line at 5 fixed offsets and mix with decaying gains.
        let mut er_out = 0.0_f32;
        for i in 0..ER_N {
            er_out += self.er_line.read_at_fractional(self.er_tap_samples[i]) * ER_TAP_GAINS[i];
        }
        self.er_line.write(pre_delayed);

        // --- FDN read ---
        // Update LFOs and read each delay line at a modulated offset.
        let mut x = [0.0_f32; FDN_N];
        for i in 0..FDN_N {
            self.lfo_phases[i] += FDN_LFO_RATES[i] / self.sample_rate;
            if self.lfo_phases[i] >= 1.0 {
                self.lfo_phases[i] -= 1.0;
            }
            let lfo_val = sinf(self.lfo_phases[i] * TWO_PI);
            let read_pos = (self.base_lengths[i] + lfo_val * lfo_depth).max(1.0);
            x[i] = self.lines[i].read_at_fractional(read_pos);
        }

        // --- Brightness: per-line one-pole LP filter ---
        for i in 0..FDN_N {
            self.lp_state[i] = lp_damp * self.lp_state[i] + (1.0 - lp_damp) * x[i];
        }

        // --- Householder feedback matrix ---
        // y[i] = lp[i] - (2/N) * sum(lp)  → O(N), energy-preserving.
        let sum_lp: f32 = self.lp_state.iter().sum();
        let two_over_n = 2.0 / FDN_N as f32; // = 0.25 for N=8

        // --- FDN write ---
        for i in 0..FDN_N {
            let mixed = self.lp_state[i] - two_over_n * sum_lp;
            self.lines[i].write(pre_delayed + g * mixed);
        }

        // --- Late reverb output: average of all FDN line outputs ---
        let late_out: f32 = x.iter().sum::<f32>() / FDN_N as f32;

        // --- Distance blend: near = early reflections, far = late reverb ---
        // close (distance=0): ER gain=0.6, LR gain=0.4
        // far   (distance=1): ER gain=0.0, LR gain=1.0
        let er_gain = (1.0 - self.distance) * 0.6;
        let lr_gain = 0.4 + self.distance * 0.6;
        let wet = er_out * er_gain + late_out * lr_gain;

        // --- Equal-power wet/dry crossfade ---
        let mix_angle = self.mix * core::f32::consts::PI * 0.5;
        let dry_gain = cosf(mix_angle);
        let wet_gain = sinf(mix_angle);
        sample * dry_gain + wet * wet_gain
    }

    #[inline]
    fn smooth(current: f32, target: f32, coeff: f32) -> f32 {
        current + (target - current) * coeff
    }
}

// ---------------------------------------------------------------------------
// PhaserStage (first-order all-pass)
// ---------------------------------------------------------------------------

struct PhaserStage {
    x_prev: f32,
    y_prev: f32,
}

impl PhaserStage {
    fn new() -> Self {
        Self {
            x_prev: 0.0,
            y_prev: 0.0,
        }
    }

    /// Process one sample with all-pass coefficient `a`.
    #[inline]
    fn process(&mut self, input: f32, a: f32) -> f32 {
        let output = a * input + self.x_prev - a * self.y_prev;
        self.x_prev = input;
        self.y_prev = output;
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

    // Phaser
    phaser_stages: [PhaserStage; 4],
    phaser_phase: f32,
    pub phaser_rate: f32,
    pub phaser_depth: f32,
    pub phaser_mix: f32,
    pub phaser_feedback: f32,
    pub phaser_enabled: bool,
    phaser_feedback_buf: f32,

    // Delay (with optional tape echo mode)
    pub delay_line: DelayLine,
    pub delay_time: f32,
    pub delay_feedback: f32,
    pub delay_mix: f32,
    pub delay_enabled: bool,
    smooth_delay_samples: f32,
    pub delay_tape_mode: bool,
    pub delay_warmth: f32,
    tape_filter_state: f32,

    // FDN reverb (all reverb state is encapsulated in FdnReverb)
    pub reverb: FdnReverb,

    sample_rate: f32,
}

impl FxChain {
    /// Construct a new `FxChain` for the given sample rate.
    pub fn new(sr: f32) -> Self {
        // Chorus
        let chorus_buf_len = libm::roundf(0.05 * sr) as usize + 2;
        let chorus_delay = DelayLine::new(chorus_buf_len);

        // Delay
        let delay_buf_len = libm::roundf(2.0 * sr) as usize;
        let delay_line = DelayLine::new(delay_buf_len);

        Self {
            chorus_delay,
            chorus_phase: 0.0,
            chorus_rate: 0.8,
            chorus_depth: 0.003,
            chorus_mix: 0.0,
            chorus_enabled: false,
            smooth_chorus_depth: 0.003,

            phaser_stages: [
                PhaserStage::new(),
                PhaserStage::new(),
                PhaserStage::new(),
                PhaserStage::new(),
            ],
            phaser_phase: 0.0,
            phaser_rate: 0.5,
            phaser_depth: 1.0,
            phaser_mix: 0.0,
            phaser_feedback: 0.5,
            phaser_enabled: false,
            phaser_feedback_buf: 0.0,

            delay_line,
            delay_time: 0.3,
            delay_feedback: 0.35,
            delay_mix: 0.0,
            delay_enabled: false,
            smooth_delay_samples: libm::roundf(0.3 * sr) as f32,
            delay_tape_mode: false,
            delay_warmth: 0.5,
            tape_filter_state: 0.0,

            reverb: FdnReverb::new(sr),

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

    /// Process phaser effect.
    ///
    /// Four first-order all-pass stages in series, modulated by an LFO.
    /// Mixing the all-pass output with the dry signal creates sweeping notches.
    pub fn process_phaser(&mut self, sample: f32) -> f32 {
        if !self.phaser_enabled || self.phaser_mix <= 0.0 {
            return sample;
        }

        // Advance LFO
        self.phaser_phase += self.phaser_rate / self.sample_rate;
        if self.phaser_phase >= 1.0 {
            self.phaser_phase -= 1.0;
        }
        let lfo = sinf(TWO_PI * self.phaser_phase);

        // Center frequency sweeps between 100 Hz and 2000 Hz
        let min_freq = 100.0_f32;
        let max_freq = 2000.0_f32;
        let depth_clamped = self.phaser_depth.clamp(0.0, 1.0);
        let center_freq =
            min_freq + (max_freq - min_freq) * 0.5 * (1.0 + lfo * depth_clamped);

        // All-pass coefficient from center frequency
        let g = libm::tanf(core::f32::consts::PI * center_freq / self.sample_rate);
        let a = (g - 1.0) / (g + 1.0);

        // Apply feedback then cascade through 4 all-pass stages
        let fb = self.phaser_feedback.clamp(-0.9, 0.9);
        let input_with_fb = sample + self.phaser_feedback_buf * fb;
        let mut out = input_with_fb;
        for stage in &mut self.phaser_stages {
            out = stage.process(out, a);
        }
        self.phaser_feedback_buf = out;

        // Equal-power crossfade: dry² + wet² = 1
        let mix_angle = self.phaser_mix * core::f32::consts::PI * 0.5;
        let dry_gain = cosf(mix_angle);
        let wet_gain = sinf(mix_angle);
        sample * dry_gain + out * wet_gain
    }

    /// Process simple feedback delay with smoothed delay time.
    /// When `delay_tape_mode` is true, applies a one-pole LP filter and soft
    /// saturation in the feedback path to emulate tape echo characteristics.
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

        let feedback_input = if self.delay_tape_mode {
            // One-pole LP filter: warmth 0 = bright (fc≈20000 Hz), warmth 1 = warm (fc≈300 Hz)
            let fc = 20000.0 - self.delay_warmth * 19700.0;
            let g = expf(-TWO_PI * fc / self.sample_rate);
            self.tape_filter_state = self.tape_filter_state * g + delayed * (1.0 - g);
            // Gentle soft saturation
            let drive = 1.5;
            tanhf(self.tape_filter_state * drive) / drive
        } else {
            delayed
        };

        self.delay_line
            .write(sample + feedback_input * self.delay_feedback);
        // Equal-power crossfade: dry² + wet² = 1
        let mix_angle = self.delay_mix * core::f32::consts::PI * 0.5;
        let dry_gain = cosf(mix_angle);
        let wet_gain = sinf(mix_angle);
        sample * dry_gain + delayed * wet_gain
    }

    /// Process FDN reverb. Bypasses if not enabled.
    pub fn process_reverb(&mut self, sample: f32) -> f32 {
        if !self.reverb.enabled {
            return sample;
        }
        self.reverb.process(sample)
    }

    /// Run chorus → phaser → delay → reverb chain.
    pub fn process(&mut self, sample: f32) -> f32 {
        let out = self.process_chorus(sample);
        let out = self.process_phaser(out);
        let out = self.process_delay(out);
        self.process_reverb(out)
    }
}
