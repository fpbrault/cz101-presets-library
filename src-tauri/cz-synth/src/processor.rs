/// Top-level CZ-101 synthesizer engine.
///
/// Ported from `Cz101Processor` in `pdVisualizerProcessor.js`
/// (lines 542-1293).
extern crate alloc;

use alloc::vec::Vec;
use core::array;

use crate::fx::FxChain;
use crate::oscillator::lfo_output;
use crate::params::{PolyMode, SynthParams, NUM_VOICES};
use crate::voice::{render_voice, Voice};

// ---------------------------------------------------------------------------
// NoteEntry — maps a MIDI note to a voice index
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NoteEntry {
    pub note: u8,
    pub voice_idx: usize,
}

// ---------------------------------------------------------------------------
// Cz101Processor
// ---------------------------------------------------------------------------

pub struct Cz101Processor {
    pub voices: [Voice; NUM_VOICES],
    pub fx: FxChain,
    /// Active note → voice mapping (replaces JS `activeNoteMap`).
    pub active_notes: Vec<NoteEntry>,
    /// Note stack for mono mode (last-note priority).
    pub mono_note_stack: Vec<u8>,
    pub sustain_on: bool,
    pub lfo_phase: f32,
    pub params: SynthParams,
    pub sample_rate: f32,
}

impl Cz101Processor {
    pub fn new(sample_rate: f32) -> Self {
        let mut proc = Self {
            voices: array::from_fn(|_| Voice::new()),
            fx: FxChain::new(sample_rate),
            active_notes: Vec::new(),
            mono_note_stack: Vec::new(),
            sustain_on: false,
            lfo_phase: 0.0,
            params: SynthParams::default(),
            sample_rate,
        };
        proc.update_fx();
        proc
    }

    // -----------------------------------------------------------------------
    // FX parameter sync
    // -----------------------------------------------------------------------

    /// Copy FX-relevant fields from `self.params` into the `FxChain`.
    pub fn update_fx(&mut self) {
        let p = &self.params;
        self.fx.chorus_rate = p.chorus.rate;
        self.fx.chorus_depth = p.chorus.depth;
        self.fx.chorus_mix = p.chorus.mix;
        self.fx.delay_time = p.delay.time;
        self.fx.delay_feedback = p.delay.feedback;
        self.fx.delay_mix = p.delay.mix;
        self.fx.reverb_size = p.reverb.size;
        self.fx.reverb_mix = p.reverb.mix;
    }

    // -----------------------------------------------------------------------
    // Params
    // -----------------------------------------------------------------------

    /// Replace the entire parameter set and re-sync FX.
    pub fn set_params(&mut self, params: SynthParams) {
        self.params = params;
        self.update_fx();
    }

    // -----------------------------------------------------------------------
    // Voice helpers
    // -----------------------------------------------------------------------

    fn reset_voice_envs(&mut self, voice_idx: usize) {
        self.voices[voice_idx].reset_envs();
    }

    fn start_env_release_for_voice(&mut self, voice_idx: usize) {
        let p = &self.params;
        let voice = &mut self.voices[voice_idx];
        voice.line1_env.dco.start_release(&p.line1.dco_env);
        voice.line1_env.dcw.start_release(&p.line1.dcw_env);
        voice.line1_env.dca.start_release(&p.line1.dca_env);
        voice.line2_env.dco.start_release(&p.line2.dco_env);
        voice.line2_env.dcw.start_release(&p.line2.dcw_env);
        voice.line2_env.dca.start_release(&p.line2.dca_env);
    }

    fn start_release(&mut self, voice_idx: usize) {
        self.voices[voice_idx].is_releasing = true;
        self.start_env_release_for_voice(voice_idx);
    }

    // -----------------------------------------------------------------------
    // Note-on
    // -----------------------------------------------------------------------

    /// Handle a note-on event.
    ///
    /// * `note`      – MIDI note number [0, 127]
    /// * `frequency` – corresponding frequency in Hz
    /// * `velocity`  – normalised velocity [0.0, 1.0]
    pub fn note_on(&mut self, note: u8, frequency: f32, velocity: f32) {
        let vel = if velocity <= 0.0 { 1.0 } else { velocity };
        let sr = self.sample_rate;

        if self.params.poly_mode == PolyMode::Mono {
            // ---- Mono mode ----
            let voice = &mut self.voices[0];

            if self.params.legato && !voice.is_silent && voice.note != Some(note) {
                // Legato: glide to new pitch without retriggering
                voice.target_freq = frequency;
                if self.params.portamento.enabled {
                    voice.glide_progress = 0.0;
                }
                voice.note = Some(note);
                voice.velocity = vel;
                // Update active_notes entry for voice 0
                self.active_notes.retain(|e| e.voice_idx != 0);
                self.active_notes.push(NoteEntry { note, voice_idx: 0 });
                // Push to mono stack
                self.mono_note_stack.retain(|&n| n != note);
                self.mono_note_stack.push(note);
                return;
            }

            // Hard retrigger
            let voice = &mut self.voices[0];
            voice.note = Some(note);
            voice.frequency = frequency;
            voice.target_freq = frequency;
            voice.current_freq = frequency;
            voice.glide_progress = 0.0;
            voice.velocity = vel;
            voice.phi1 = 0.0;
            voice.phi2 = 0.0;
            voice.pm_phi = 0.0;
            voice.is_releasing = false;
            voice.is_silent = false;
            voice.sustained = false;
            voice.gate_was_open = false;

            if self.params.vibrato.enabled {
                voice.vibrato_phase = 0.0;
                let delay_ms = self.params.vibrato.delay;
                voice.vibrato_delay_counter = libm::roundf(delay_ms * sr / 1000.0) as u32;
            }

            // Reset envs (borrow ends after this block)
            self.reset_voice_envs(0);

            // KS buffer init: alternating ±0.5 as deterministic substitute for
            // Math.random() * 2 - 1.  A proper PRNG should be wired in later.
            {
                let voice = &mut self.voices[0];
                for (i, s) in voice.ks_buffer1.iter_mut().enumerate() {
                    *s = if i % 2 == 0 { 0.5 } else { -0.5 };
                }
                voice.ks_write_pos1 = 0;
                voice.ks_last_sample1 = 0.0;
                for (i, s) in voice.ks_buffer2.iter_mut().enumerate() {
                    *s = if i % 2 == 0 { 0.5 } else { -0.5 };
                }
                voice.ks_write_pos2 = 0;
                voice.ks_last_sample2 = 0.0;
            }

            self.active_notes.retain(|e| e.voice_idx != 0);
            self.active_notes.push(NoteEntry { note, voice_idx: 0 });
            self.mono_note_stack.retain(|&n| n != note);
            self.mono_note_stack.push(note);
        } else {
            // ---- Poly8 mode ----

            // If note already active in a voice, just update it
            if let Some(entry) = self.active_notes.iter().find(|e| e.note == note).cloned() {
                let voice = &mut self.voices[entry.voice_idx];
                if voice.note == Some(note) {
                    voice.frequency = frequency;
                    voice.target_freq = frequency;
                    voice.velocity = vel;
                    return;
                }
            }

            // Find a silent voice
            let mut voice_idx = self.voices.iter().position(|v| v.is_silent);

            // If none silent, steal the quietest releasing voice
            if voice_idx.is_none() {
                let mut min_amp = f32::INFINITY;
                let mut min_idx = 0usize;
                for i in 0..NUM_VOICES {
                    if self.voices[i].is_releasing {
                        let amp = self.voices[i]
                            .line1_env
                            .dca
                            .output
                            .max(self.voices[i].line2_env.dca.output);
                        if amp < min_amp {
                            min_amp = amp;
                            min_idx = i;
                        }
                    }
                }
                voice_idx = Some(min_idx);
            }

            let vi = voice_idx.unwrap_or(0);

            let voice = &mut self.voices[vi];
            voice.note = Some(note);
            voice.frequency = frequency;
            voice.target_freq = frequency;
            voice.current_freq = frequency;
            voice.glide_progress = 0.0;
            voice.velocity = vel;
            voice.phi1 = 0.0;
            voice.phi2 = 0.0;
            voice.pm_phi = 0.0;
            voice.is_releasing = false;
            voice.is_silent = false;
            voice.sustained = false;
            voice.gate_was_open = false;

            if self.params.vibrato.enabled {
                voice.vibrato_phase = 0.0;
                let delay_ms = self.params.vibrato.delay;
                voice.vibrato_delay_counter = libm::roundf(delay_ms * sr / 1000.0) as u32;
            }

            self.reset_voice_envs(vi);

            // KS buffer init
            {
                let voice = &mut self.voices[vi];
                for (i, s) in voice.ks_buffer1.iter_mut().enumerate() {
                    *s = if i % 2 == 0 { 0.5 } else { -0.5 };
                }
                voice.ks_write_pos1 = 0;
                voice.ks_last_sample1 = 0.0;
                for (i, s) in voice.ks_buffer2.iter_mut().enumerate() {
                    *s = if i % 2 == 0 { 0.5 } else { -0.5 };
                }
                voice.ks_write_pos2 = 0;
                voice.ks_last_sample2 = 0.0;
            }

            // Remove any stale entry for this voice index then add fresh one
            self.active_notes.retain(|e| e.voice_idx != vi);
            self.active_notes.push(NoteEntry {
                note,
                voice_idx: vi,
            });
        }
    }

    // -----------------------------------------------------------------------
    // Note-off
    // -----------------------------------------------------------------------

    pub fn note_off(&mut self, note: u8) {
        // Find voice index for this note
        let entry = match self.active_notes.iter().find(|e| e.note == note).cloned() {
            Some(e) => e,
            None => return,
        };
        self.active_notes.retain(|e| e.note != note);

        let voice_idx = entry.voice_idx;
        if self.voices[voice_idx].note != Some(note) {
            return;
        }

        if self.sustain_on {
            self.voices[voice_idx].sustained = true;
            return;
        }

        if self.params.poly_mode == PolyMode::Mono {
            // Remove from mono note stack
            self.mono_note_stack.retain(|&n| n != note);

            if let Some(&prev_note) = self.mono_note_stack.last() {
                // Resume previous note in stack
                let freq = midi_note_to_freq(prev_note);
                let voice = &mut self.voices[0];
                voice.note = Some(prev_note);
                voice.frequency = freq;
                voice.target_freq = freq;
            } else {
                // Stack empty — release
                self.start_release(0);
            }
        } else {
            self.start_release(voice_idx);
        }
    }

    // -----------------------------------------------------------------------
    // Sustain pedal
    // -----------------------------------------------------------------------

    pub fn set_sustain(&mut self, on: bool) {
        self.sustain_on = on;
        if !on {
            // Release any voices that were sustained and are no longer held
            for i in 0..NUM_VOICES {
                let note = self.voices[i].note;
                let sustained = self.voices[i].sustained;
                if sustained {
                    let still_held =
                        note.is_some_and(|n| self.active_notes.iter().any(|e| e.note == n));
                    if !still_held {
                        self.voices[i].sustained = false;
                        self.start_release(i);
                    } else {
                        self.voices[i].sustained = false;
                    }
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Audio process loop
    // -----------------------------------------------------------------------

    /// Fill `output` with mono samples.
    ///
    /// The caller is responsible for distributing these samples to stereo
    /// channels if required.
    pub fn process(&mut self, output: &mut [f32]) {
        let p = &self.params;
        let volume = p.volume;
        let lfo_enabled = p.lfo.enabled;
        let lfo_rate = p.lfo.rate;
        let lfo_waveform = p.lfo.waveform;
        let sr = self.sample_rate;
        // Volume normalisation: avoid clipping when all voices are active.
        let norm = volume / libm::sqrtf(NUM_VOICES as f32);

        for sample_out in output.iter_mut() {
            // Advance global LFO one sample at a time for accurate pitch tracking
            let lfo_mod_val = if lfo_enabled {
                self.lfo_phase += lfo_rate / sr;
                if self.lfo_phase >= 1.0 {
                    self.lfo_phase -= 1.0;
                }
                lfo_output(self.lfo_phase, lfo_waveform)
            } else {
                0.0
            };

            // Sum all voices
            let mut mixed = 0.0_f32;
            // We need to re-borrow params each iteration since render_voice needs &SynthParams
            // and we own self.  Work around borrow checker by cloning params reference.
            // SAFETY: `voices` and `params` are separate fields; we use raw pointer to avoid
            // simultaneous mutable + immutable borrow of `self`.
            let params_ptr: *const SynthParams = &self.params;
            for v in 0..NUM_VOICES {
                // SAFETY: params is read-only here and voices[v] is the only mutated field.
                let p_ref: &SynthParams = unsafe { &*params_ptr };
                mixed += render_voice(&mut self.voices[v], p_ref, lfo_mod_val, sr);
            }

            mixed *= norm;

            let fx_out = self.fx.process(mixed);
            *sample_out = fx_out.clamp(-1.0, 1.0);
        }
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    pub fn find_voice_for_note(&self, note: u8) -> Option<usize> {
        self.active_notes
            .iter()
            .find(|e| e.note == note)
            .map(|e| e.voice_idx)
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/// Standard MIDI note → frequency conversion.
#[inline]
pub fn midi_note_to_freq(note: u8) -> f32 {
    440.0 * libm::powf(2.0, (note as f32 - 69.0) / 12.0)
}
