/// Top-level Cosmo PD-101 synthesizer engine.
///
/// Ported from `CosmoProcessor` in `pdVisualizerProcessor.js`
/// (lines 542-1293).
extern crate alloc;

use alloc::vec::Vec;
use core::array;

use crate::dsp_utils::lfo_output_with_symmetry;
use crate::envelope::normalize_synth_params_envelopes_to_raw_if_human;
use crate::fx::FxChain;
use crate::generators::PER_LINE_HEADROOM;
use crate::params::{PolyMode, SynthParams, NUM_VOICES};
use crate::voice::{render_voice, Voice};

const SOFT_CLIP_DRIVE: f32 = 1.0;
const SOFT_CLIP_THRESHOLD: f32 = 0.9;
const REFERENCE_LINE_HEADROOM: f32 = 0.75;
const HEADROOM_MAKEUP_EXPONENT: f32 = 0.8;
const MAX_HEADROOM_MAKEUP: f32 = 1.0;

// ---------------------------------------------------------------------------
// NoteEntry — maps a MIDI note to a voice index
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NoteEntry {
    pub note: u8,
    pub voice_idx: usize,
}

/// Full voice state saved when switching notes in mono mode.
#[derive(Debug, Clone)]
pub struct MonoStackEntry {
    note: u8,
    voice: Voice,
}

// ---------------------------------------------------------------------------
// CosmoProcessor
// ---------------------------------------------------------------------------

pub struct CosmoProcessor {
    pub voices: [Voice; NUM_VOICES],
    pub fx: FxChain,
    /// Active note → voice mapping (replaces JS `activeNoteMap`).
    pub active_notes: Vec<NoteEntry>,
    /// Note stack for mono mode (last-note priority), stores full voice state.
    pub mono_stack: Vec<MonoStackEntry>,
    pub sustain_on: bool,
    pub lfo_phase: f32,
    pub lfo2_phase: f32,
    pub params: SynthParams,
    pub sample_rate: f32,
    /// Normalised pitch bend value in [-1.0, 1.0].
    /// Multiplied by `params.pitch_bend_range` semitones in voice render.
    pub pitch_bend: f32,
    /// Normalised mod wheel value in [0.0, 1.0].
    /// Boosts vibrato depth by `params.mod_wheel_vibrato_depth * mod_wheel`.
    pub mod_wheel: f32,
    /// Normalised aftertouch/channel pressure value in [0.0, 1.0].
    pub aftertouch: f32,
}

impl CosmoProcessor {
    /// Create a new processor with default parameters and FX state.
    pub fn new(sample_rate: f32) -> Self {
        let mut proc = Self {
            voices: array::from_fn(|_| Voice::new()),
            fx: FxChain::new(sample_rate),
            active_notes: Vec::new(),
            mono_stack: Vec::new(),
            sustain_on: false,
            lfo_phase: 0.0,
            lfo2_phase: 0.0,
            params: SynthParams::default(),
            sample_rate,
            pitch_bend: 0.0,
            mod_wheel: 0.0,
            aftertouch: 0.0,
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
        self.fx.chorus_enabled = p.chorus.enabled;
        self.fx.chorus_rate = p.chorus.rate;
        self.fx.chorus_depth = p.chorus.depth;
        self.fx.chorus_mix = p.chorus.mix;
        self.fx.delay_enabled = p.delay.enabled;
        self.fx.delay_time = p.delay.time;
        self.fx.delay_feedback = p.delay.feedback;
        self.fx.delay_mix = p.delay.mix;
        self.fx.reverb_enabled = p.reverb.enabled;
        self.fx.reverb_size = p.reverb.size;
        self.fx.reverb_mix = p.reverb.mix;
        self.fx.reverb_damping = p.reverb.damping;
        self.fx.reverb_pre_delay = p.reverb.pre_delay;
    }

    // -----------------------------------------------------------------------
    // Params
    // -----------------------------------------------------------------------

    /// Replace the entire parameter set and re-sync FX.
    pub fn set_params(&mut self, mut params: SynthParams) {
        normalize_synth_params_envelopes_to_raw_if_human(&mut params);
        self.params = params;
        self.update_fx();
    }

    /// Reset all envelope generators for the selected voice.
    fn reset_voice_envs(&mut self, voice_idx: usize) {
        self.voices[voice_idx].reset_envs();
    }

    /// Start the release stage for all envelopes on a voice.
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

    /// Mark a voice as releasing and switch all envelopes to release mode.
    fn start_release(&mut self, voice_idx: usize) {
        self.voices[voice_idx].is_releasing = true;
        self.start_env_release_for_voice(voice_idx);
    }

    /// Reset transient oscillator and gate state before starting a fresh note.
    fn reset_voice_runtime(&mut self, voice_idx: usize) {
        let voice = &mut self.voices[voice_idx];
        voice.phi1 = 0.0;
        voice.phi2 = 0.0;
        voice.cycle_count1 = 0;
        voice.cycle_count2 = 0;
        voice.pm_phi = 0.0;
        voice.is_releasing = false;
        voice.is_silent = false;
        voice.sustained = false;
        voice.gate_was_open = false;

        if self.params.vibrato.enabled {
            voice.vibrato_phase = 0.0;
            let delay_ms = self.params.vibrato.delay;
            voice.vibrato_delay_counter = libm::roundf(delay_ms * self.sample_rate / 1000.0) as u32;
        }
    }

    /// Update note and glide-related pitch fields for a voice.
    fn configure_voice_pitch(&mut self, voice_idx: usize, note: u8, frequency: f32) {
        let voice = &mut self.voices[voice_idx];
        voice.note = Some(note);
        voice.env_note = note;
        voice.frequency = frequency;
        voice.target_freq = frequency;

        if self.params.portamento.enabled && !voice.is_silent {
            voice.glide_start_freq = voice.current_freq;
            voice.glide_progress = 0.0;
        } else {
            voice.current_freq = frequency;
            voice.glide_start_freq = frequency;
            voice.glide_progress = 0.0;
        }
    }

    /// Fully prepare a voice slot for a new note-on event.
    fn initialize_voice_for_note(
        &mut self,
        voice_idx: usize,
        note: u8,
        frequency: f32,
        velocity: f32,
    ) {
        self.configure_voice_pitch(voice_idx, note, frequency);
        self.voices[voice_idx].velocity = velocity;
        self.reset_voice_runtime(voice_idx);
        self.reset_voice_envs(voice_idx);
        self.reset_generator_runtime_for_note(voice_idx, note);
    }

    /// Reset generator-owned per-voice runtime state for a new note-on event.
    fn reset_generator_runtime_for_note(&mut self, voice_idx: usize, note: u8) {
        let voice = &mut self.voices[voice_idx];
        voice.algo_runtime.note_on(note);
    }

    /// Replace any previous active-note mapping for a voice slot.
    fn replace_active_note_entry(&mut self, voice_idx: usize, note: u8) {
        self.active_notes.retain(|e| e.voice_idx != voice_idx);
        self.active_notes.push(NoteEntry { note, voice_idx });
    }

    /// Push a note snapshot onto the mono stack, deduplicating by note number.
    fn push_mono_stack_entry(&mut self, entry: MonoStackEntry) {
        self.mono_stack.retain(|e| e.note != entry.note);
        self.mono_stack.push(entry);
    }

    /// Handle mono legato note-on without retriggering envelopes.
    fn try_handle_mono_legato_note_on(&mut self, note: u8, frequency: f32) -> bool {
        let voice = &mut self.voices[0];
        if !self.params.legato || voice.is_releasing || voice.is_silent || voice.note == Some(note)
        {
            return false;
        }

        if let Some(prev_note) = voice.note {
            self.mono_stack.retain(|e| e.note != prev_note);
            self.mono_stack.push(MonoStackEntry {
                note: prev_note,
                voice: voice.clone(),
            });
        }

        voice.target_freq = frequency;
        if self.params.portamento.enabled {
            voice.glide_start_freq = voice.current_freq;
            voice.glide_progress = 0.0;
        } else {
            voice.current_freq = frequency;
        }

        voice.note = Some(note);
        voice.frequency = frequency;
        voice.is_releasing = false;

        self.replace_active_note_entry(0, note);
        true
    }

    /// Snapshot the currently sounding mono voice before overwriting it.
    fn mono_previous_entry(&self, fallback_note: u8) -> Option<MonoStackEntry> {
        let voice = &self.voices[0];
        if voice.is_silent {
            None
        } else {
            Some(MonoStackEntry {
                note: voice.note.unwrap_or(fallback_note),
                voice: voice.clone(),
            })
        }
    }

    /// Choose the best poly voice slot for a new note-on event.
    fn find_poly_voice_for_note_on(&self) -> usize {
        if let Some(voice_idx) = self.voices.iter().position(|v| v.is_silent) {
            return voice_idx;
        }

        let mut min_amp = f32::INFINITY;
        let mut min_idx = 0usize;
        for (idx, voice) in self.voices.iter().enumerate() {
            if voice.is_releasing {
                let amp = voice.line1_env.dca.output.max(voice.line2_env.dca.output);
                if amp < min_amp {
                    min_amp = amp;
                    min_idx = idx;
                }
            }
        }

        min_idx
    }

    /// Route a note-on through mono mode rules, including legato and stack restore.
    fn handle_mono_note_on(&mut self, note: u8, frequency: f32, velocity: f32) {
        if self.try_handle_mono_legato_note_on(note, frequency) {
            return;
        }

        let prev_entry = self.mono_previous_entry(note);
        self.initialize_voice_for_note(0, note, frequency, velocity);

        if let Some(entry) = prev_entry {
            self.push_mono_stack_entry(entry);
        }

        self.replace_active_note_entry(0, note);
    }

    /// Route a note-on through poly mode rules, including voice reuse and stealing.
    fn handle_poly_note_on(&mut self, note: u8, frequency: f32, velocity: f32) {
        if let Some(entry) = self.active_notes.iter().find(|e| e.note == note).cloned() {
            let voice = &mut self.voices[entry.voice_idx];
            if voice.note == Some(note) {
                voice.frequency = frequency;
                voice.target_freq = frequency;
                voice.velocity = velocity;
                return;
            }
        }

        let voice_idx = self.find_poly_voice_for_note_on();
        self.initialize_voice_for_note(voice_idx, note, frequency, velocity);
        self.replace_active_note_entry(voice_idx, note);
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

        if self.params.lfo.retrigger {
            self.lfo_phase = 0.0;
        }
        if self.params.lfo2.retrigger {
            self.lfo2_phase = 0.0;
        }

        if self.params.poly_mode == PolyMode::Mono {
            self.handle_mono_note_on(note, frequency, vel);
        } else {
            self.handle_poly_note_on(note, frequency, vel);
        }
    }

    /// Handle a note-off event, including mono stack restore and sustain logic.
    pub fn note_off(&mut self, note: u8) {
        if self.params.poly_mode == PolyMode::Mono {
            self.mono_stack.retain(|e| e.note != note);
        }

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
            if let Some(prev) = self.mono_stack.last() {
                let voice = &mut self.voices[0];
                *voice = prev.voice.clone();
                voice.note = Some(prev.note);
                self.replace_active_note_entry(0, prev.note);
            } else {
                self.start_release(0);
            }
        } else {
            self.start_release(voice_idx);
        }
    }

    /// Update sustain-pedal state and release any voices no longer physically held.
    pub fn set_sustain(&mut self, on: bool) {
        self.sustain_on = on;
        if !on {
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
    // Pitch bend & mod wheel
    // -----------------------------------------------------------------------

    /// Set pitch bend. `value` is normalised [-1.0, 1.0] (from MIDI 14-bit).
    /// The actual semitone shift = value * params.pitch_bend_range.
    pub fn set_pitch_bend(&mut self, value: f32) {
        self.pitch_bend = value.clamp(-1.0, 1.0);
    }

    /// Set mod wheel. `value` is normalised [0.0, 1.0] (CC1 / 127).
    pub fn set_mod_wheel(&mut self, value: f32) {
        self.mod_wheel = value.clamp(0.0, 1.0);
    }

    /// Set aftertouch/channel pressure. `value` is normalised [0.0, 1.0].
    pub fn set_aftertouch(&mut self, value: f32) {
        self.aftertouch = value.clamp(0.0, 1.0);
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
        let lfo1_rate = p.lfo.rate;
        let lfo1_waveform = p.lfo.waveform;
        let lfo1_symmetry = p.lfo.symmetry;
        let lfo1_depth = p.lfo.depth;
        let lfo1_offset = p.lfo.offset;
        let lfo2_rate = p.lfo2.rate;
        let lfo2_waveform = p.lfo2.waveform;
        let lfo2_symmetry = p.lfo2.symmetry;
        let lfo2_depth = p.lfo2.depth;
        let lfo2_offset = p.lfo2.offset;
        let sr = self.sample_rate;
        let headroom_ratio = REFERENCE_LINE_HEADROOM / PER_LINE_HEADROOM.max(0.01);
        let headroom_makeup =
            libm::powf(headroom_ratio, HEADROOM_MAKEUP_EXPONENT).clamp(1.0, MAX_HEADROOM_MAKEUP);
        let norm = volume * headroom_makeup / libm::sqrtf(NUM_VOICES as f32);

        for sample_out in output.iter_mut() {
            self.lfo_phase += lfo1_rate / sr;
            if self.lfo_phase >= 1.0 {
                self.lfo_phase -= 1.0;
            }
            let lfo1_mod_val =
                lfo_output_with_symmetry(self.lfo_phase, lfo1_waveform, lfo1_symmetry) * lfo1_depth
                    + lfo1_offset;

            self.lfo2_phase += lfo2_rate / sr;
            if self.lfo2_phase >= 1.0 {
                self.lfo2_phase -= 1.0;
            }
            let lfo2_mod_val =
                lfo_output_with_symmetry(self.lfo2_phase, lfo2_waveform, lfo2_symmetry)
                    * lfo2_depth
                    + lfo2_offset;

            let mut mixed = 0.0_f32;
            // SAFETY: `voices` and `params` are separate fields; we use raw pointer to avoid
            // simultaneous mutable + immutable borrow of `self`.
            let params_ptr: *const SynthParams = &self.params;
            let pitch_bend_semitones = self.pitch_bend * self.params.pitch_bend_range;
            let mod_wheel = self.mod_wheel;
            let aftertouch = self.aftertouch;
            for v in 0..NUM_VOICES {
                // SAFETY: params is read-only here and voices[v] is the only mutated field.
                let p_ref: &SynthParams = unsafe { &*params_ptr };
                mixed += render_voice(
                    &mut self.voices[v],
                    p_ref,
                    lfo1_mod_val,
                    lfo2_mod_val,
                    sr,
                    pitch_bend_semitones,
                    mod_wheel,
                    aftertouch,
                );
            }

            mixed *= norm;

            let fx_out = self.fx.process(mixed);
            let soft_limited = soft_clip_tanh(fx_out, SOFT_CLIP_DRIVE);
            *sample_out = soft_limited.clamp(-1.0, 1.0);
        }
    }

    /// Find the active voice index currently assigned to a MIDI note.
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

#[inline]
fn soft_clip_tanh(sample: f32, drive: f32) -> f32 {
    if drive <= 0.0 {
        return sample;
    }

    let abs_sample = libm::fabsf(sample);
    if abs_sample <= SOFT_CLIP_THRESHOLD {
        return sample;
    }

    let norm = libm::tanhf(drive);
    if norm <= 0.0 {
        return sample;
    }

    let clipped = libm::tanhf(sample * drive) / norm;
    let blend = ((abs_sample - SOFT_CLIP_THRESHOLD) / (1.0 - SOFT_CLIP_THRESHOLD)).clamp(0.0, 1.0);
    sample + (clipped - sample) * blend
}
