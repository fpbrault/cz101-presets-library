//! CZ-101 Phase Distortion synthesizer — VST3/AU plugin via Beamer.
//!
//! Uses beamer for VST3/AU plugin hosting and cz-synth for the DSP engine.

use std::sync::Arc;

use beamer::prelude::*;
use cz_synth::params::{PolyMode, SynthParams};
use cz_synth::processor::{midi_note_to_freq, Cz101Processor};

// =============================================================================
// Enum Types for EnumParameter
// =============================================================================

/// Waveform selection (1-8).
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum Waveform {
    #[name = "Saw"]
    #[default]
    Saw,
    #[name = "Square"]
    Square,
    #[name = "Pulse"]
    Pulse,
    #[name = "Null"]
    Null,
    #[name = "Sine Pulse"]
    SinePulse,
    #[name = "Saw Pulse"]
    SawPulse,
    #[name = "Multi Sine"]
    MultiSine,
    #[name = "Pulse 2"]
    Pulse2,
}

/// Warp algorithm selector.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum WarpAlgo {
    #[name = "CZ-101"]
    #[default]
    Cz101,
    #[name = "Bend"]
    Bend,
    #[name = "Sync"]
    Sync,
    #[name = "Pinch"]
    Pinch,
    #[name = "Fold"]
    Fold,
    #[name = "Skew"]
    Skew,
    #[name = "Quantize"]
    Quantize,
    #[name = "Twist"]
    Twist,
    #[name = "Clip"]
    Clip,
    #[name = "Ripple"]
    Ripple,
    #[name = "Mirror"]
    Mirror,
    #[name = "Fof"]
    Fof,
    #[name = "Karpunk"]
    Karpunk,
    #[name = "Sine"]
    Sine,
}

/// Line select mode.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum LineSelect {
    #[name = "L1+L2"]
    #[default]
    L1PlusL2,
    #[name = "L1"]
    L1,
    #[name = "L2"]
    L2,
    #[name = "L1+L1'"]
    L1PlusL1Prime,
    #[name = "L1+L2'"]
    L1PlusL2Prime,
}

/// Modulation mode.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum ModMode {
    #[name = "Normal"]
    #[default]
    Normal,
    #[name = "Ring"]
    Ring,
    #[name = "Noise"]
    Noise,
}

/// Polyphony mode.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum PolyModeParam {
    #[name = "Poly 8"]
    #[default]
    Poly8,
    #[name = "Mono"]
    Mono,
}

/// Velocity routing target.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum VelocityTarget {
    #[name = "Amp"]
    #[default]
    Amp,
    #[name = "DCW"]
    Dcw,
    #[name = "Both"]
    Both,
    #[name = "Off"]
    Off,
}

/// LFO waveform.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum LfoWaveform {
    #[name = "Sine"]
    #[default]
    Sine,
    #[name = "Triangle"]
    Triangle,
    #[name = "Square"]
    Square,
    #[name = "Saw"]
    Saw,
}

/// LFO target.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum LfoTarget {
    #[name = "Pitch"]
    #[default]
    Pitch,
    #[name = "DCW"]
    Dcw,
    #[name = "DCA"]
    Dca,
    #[name = "Filter"]
    Filter,
}

/// Filter type.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum FilterType {
    #[name = "Low Pass"]
    #[default]
    Lp,
    #[name = "High Pass"]
    Hp,
    #[name = "Band Pass"]
    Bp,
}

/// Portamento mode.
#[derive(Copy, Clone, PartialEq, EnumParameter)]
pub enum PortamentoMode {
    #[name = "Rate"]
    #[default]
    Rate,
    #[name = "Time"]
    Time,
}

// =============================================================================
// Parameters
// =============================================================================

/// Parameters for the CZ-101 Phase Distortion synthesizer.
#[derive(Parameters)]
pub struct CzParameters {
    // Global
    #[parameter(id = "volume", name = "Volume", default = 0.4, range = 0.0..=1.0)]
    pub volume: FloatParameter,

    #[parameter(id = "octave", name = "Octave", default = 0.0, range = -2.0..=2.0)]
    pub octave: FloatParameter,

    #[parameter(id = "line_select", name = "Line Select", group = "Global")]
    pub line_select: EnumParameter<LineSelect>,

    #[parameter(id = "mod_mode", name = "Mod Mode", group = "Global")]
    pub mod_mode: EnumParameter<ModMode>,

    #[parameter(id = "poly_mode", name = "Poly Mode", group = "Global")]
    pub poly_mode: EnumParameter<PolyModeParam>,

    #[parameter(id = "legato", name = "Legato", default = 0.0, range = 0.0..=1.0)]
    pub legato: FloatParameter,

    #[parameter(id = "vel_target", name = "Velocity Target", group = "Global")]
    pub vel_target: EnumParameter<VelocityTarget>,

    #[parameter(id = "int_pm_amount", name = "Int PM Amount", default = 0.0, range = 0.0..=1.0)]
    pub int_pm_amount: FloatParameter,

    #[parameter(id = "int_pm_ratio", name = "Int PM Ratio", default = 1.0, range = 0.0..=8.0)]
    pub int_pm_ratio: FloatParameter,

    #[parameter(id = "ext_pm_amount", name = "Ext PM Amount", default = 0.0, range = 0.0..=1.0)]
    pub ext_pm_amount: FloatParameter,

    #[parameter(id = "pm_pre", name = "PM Pre", default = 1.0, range = 0.0..=1.0)]
    pub pm_pre: FloatParameter,

    // Line 1
    #[parameter(id = "l1_waveform", name = "Waveform", group = "Line 1")]
    pub l1_waveform: EnumParameter<Waveform>,

    #[parameter(id = "l1_warp_algo", name = "Warp Algo", group = "Line 1")]
    pub l1_warp_algo: EnumParameter<WarpAlgo>,

    #[parameter(id = "l1_dcw_base", name = "DCW Amount", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_dcw_base: FloatParameter,

    #[parameter(id = "l1_dca_base", name = "Level", default = 1.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_dca_base: FloatParameter,

    #[parameter(id = "l1_dco_depth", name = "DCO Depth", default = 0.0, range = 0.0..=24.0, group = "Line 1")]
    pub l1_dco_depth: FloatParameter,

    #[parameter(id = "l1_octave", name = "Octave", default = 0.0, range = -2.0..=2.0, group = "Line 1")]
    pub l1_octave: FloatParameter,

    #[parameter(id = "l1_detune", name = "Detune (cents)", default = 0.0, range = -100.0..=100.0, group = "Line 1")]
    pub l1_detune: FloatParameter,

    #[parameter(id = "l1_dcw_comp", name = "DCW Comp", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_dcw_comp: FloatParameter,

    #[parameter(id = "l1_key_follow", name = "Key Follow", default = 0.0, range = 0.0..=10.0, group = "Line 1")]
    pub l1_key_follow: FloatParameter,

    #[parameter(id = "l1_modulation", name = "Modulation", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_modulation: FloatParameter,

    #[parameter(id = "l1_algo_blend", name = "Algo Blend", default = 0.0, range = 0.0..=1.0, group = "Line 1")]
    pub l1_algo_blend: FloatParameter,

    #[parameter(id = "l1_warp_algo2", name = "Warp Algo 2", default = -1.0, range = -1.0..=13.0, group = "Line 1")]
    pub l1_warp_algo2: FloatParameter,

    // Line 2
    #[parameter(id = "l2_waveform", name = "Waveform", group = "Line 2")]
    pub l2_waveform: EnumParameter<Waveform>,

    #[parameter(id = "l2_warp_algo", name = "Warp Algo", group = "Line 2")]
    pub l2_warp_algo: EnumParameter<WarpAlgo>,

    #[parameter(id = "l2_dcw_base", name = "DCW Amount", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_dcw_base: FloatParameter,

    #[parameter(id = "l2_dca_base", name = "Level", default = 1.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_dca_base: FloatParameter,

    #[parameter(id = "l2_dco_depth", name = "DCO Depth", default = 0.0, range = 0.0..=24.0, group = "Line 2")]
    pub l2_dco_depth: FloatParameter,

    #[parameter(id = "l2_octave", name = "Octave", default = 0.0, range = -2.0..=2.0, group = "Line 2")]
    pub l2_octave: FloatParameter,

    #[parameter(id = "l2_detune", name = "Detune (cents)", default = 0.0, range = -100.0..=100.0, group = "Line 2")]
    pub l2_detune: FloatParameter,

    #[parameter(id = "l2_dcw_comp", name = "DCW Comp", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_dcw_comp: FloatParameter,

    #[parameter(id = "l2_key_follow", name = "Key Follow", default = 0.0, range = 0.0..=10.0, group = "Line 2")]
    pub l2_key_follow: FloatParameter,

    #[parameter(id = "l2_modulation", name = "Modulation", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_modulation: FloatParameter,

    #[parameter(id = "l2_algo_blend", name = "Algo Blend", default = 0.0, range = 0.0..=1.0, group = "Line 2")]
    pub l2_algo_blend: FloatParameter,

    #[parameter(id = "l2_warp_algo2", name = "Warp Algo 2", default = -1.0, range = -1.0..=13.0, group = "Line 2")]
    pub l2_warp_algo2: FloatParameter,

    // Vibrato
    #[parameter(id = "vib_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "Vibrato")]
    pub vib_enabled: FloatParameter,

    #[parameter(id = "vib_waveform", name = "Waveform", default = 1.0, range = 1.0..=4.0, group = "Vibrato")]
    pub vib_waveform: FloatParameter,

    #[parameter(id = "vib_rate", name = "Rate (Hz)", default = 5.0, range = 0.1..=20.0, group = "Vibrato")]
    pub vib_rate: FloatParameter,

    #[parameter(id = "vib_depth", name = "Depth", default = 30.0, range = 0.0..=100.0, group = "Vibrato")]
    pub vib_depth: FloatParameter,

    #[parameter(id = "vib_delay", name = "Delay (ms)", default = 0.0, range = 0.0..=2000.0, group = "Vibrato")]
    pub vib_delay: FloatParameter,

    // Chorus
    #[parameter(id = "cho_mix", name = "Mix", default = 0.0, range = 0.0..=1.0, group = "Chorus")]
    pub cho_mix: FloatParameter,

    #[parameter(id = "cho_rate", name = "Rate (Hz)", default = 0.8, range = 0.1..=10.0, group = "Chorus")]
    pub cho_rate: FloatParameter,

    #[parameter(id = "cho_depth", name = "Depth", default = 0.003, range = 0.0..=0.02, group = "Chorus")]
    pub cho_depth: FloatParameter,

    // Delay
    #[parameter(id = "del_mix", name = "Mix", default = 0.0, range = 0.0..=1.0, group = "Delay")]
    pub del_mix: FloatParameter,

    #[parameter(id = "del_time", name = "Time (s)", default = 0.3, range = 0.01..=2.0, group = "Delay")]
    pub del_time: FloatParameter,

    #[parameter(id = "del_feedback", name = "Feedback", default = 0.35, range = 0.0..=1.0, group = "Delay")]
    pub del_feedback: FloatParameter,

    // Reverb
    #[parameter(id = "rev_mix", name = "Mix", default = 0.0, range = 0.0..=1.0, group = "Reverb")]
    pub rev_mix: FloatParameter,

    #[parameter(id = "rev_size", name = "Size", default = 0.5, range = 0.0..=1.0, group = "Reverb")]
    pub rev_size: FloatParameter,

    // LFO
    #[parameter(id = "lfo_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "LFO")]
    pub lfo_enabled: FloatParameter,

    #[parameter(id = "lfo_waveform", name = "Waveform", group = "LFO")]
    pub lfo_waveform: EnumParameter<LfoWaveform>,

    #[parameter(id = "lfo_rate", name = "Rate (Hz)", default = 5.0, range = 0.01..=20.0, group = "LFO")]
    pub lfo_rate: FloatParameter,

    #[parameter(id = "lfo_depth", name = "Depth", default = 0.0, range = 0.0..=1.0, group = "LFO")]
    pub lfo_depth: FloatParameter,

    #[parameter(id = "lfo_target", name = "Target", group = "LFO")]
    pub lfo_target: EnumParameter<LfoTarget>,

    // Filter
    #[parameter(id = "fil_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "Filter")]
    pub fil_enabled: FloatParameter,

    #[parameter(id = "fil_cutoff", name = "Cutoff (Hz)", default = 5000.0, range = 20.0..=20000.0, kind = "hz", group = "Filter")]
    pub fil_cutoff: FloatParameter,

    #[parameter(id = "fil_resonance", name = "Resonance", default = 0.0, range = 0.0..=1.0, group = "Filter")]
    pub fil_resonance: FloatParameter,

    #[parameter(id = "fil_env_amount", name = "Env Amount", default = 0.0, range = 0.0..=1.0, group = "Filter")]
    pub fil_env_amount: FloatParameter,

    #[parameter(id = "fil_type", name = "Type", group = "Filter")]
    pub fil_type: EnumParameter<FilterType>,

    // Portamento
    #[parameter(id = "port_enabled", name = "Enabled", default = 0.0, range = 0.0..=1.0, group = "Portamento")]
    pub port_enabled: FloatParameter,

    #[parameter(id = "port_mode", name = "Mode", group = "Portamento")]
    pub port_mode: EnumParameter<PortamentoMode>,

    #[parameter(id = "port_time", name = "Time (s)", default = 0.5, range = 0.0..=2.0, group = "Portamento")]
    pub port_time: FloatParameter,
}

impl CzParameters {
    fn to_synth_params(&self) -> SynthParams {
        SynthParams {
            volume: self.volume.get() as f32,
            octave: self.octave.get() as f32,
            line_select: match self.line_select.get() {
                LineSelect::L1PlusL2 => cz_synth::params::LineSelect::L1PlusL2,
                LineSelect::L1 => cz_synth::params::LineSelect::L1,
                LineSelect::L2 => cz_synth::params::LineSelect::L2,
                LineSelect::L1PlusL1Prime => cz_synth::params::LineSelect::L1PlusL1Prime,
                LineSelect::L1PlusL2Prime => cz_synth::params::LineSelect::L1PlusL2Prime,
            },
            mod_mode: match self.mod_mode.get() {
                ModMode::Normal => cz_synth::params::ModMode::Normal,
                ModMode::Ring => cz_synth::params::ModMode::Ring,
                ModMode::Noise => cz_synth::params::ModMode::Noise,
            },
            poly_mode: match self.poly_mode.get() {
                PolyModeParam::Poly8 => PolyMode::Poly8,
                PolyModeParam::Mono => PolyMode::Mono,
            },
            legato: self.legato.get() >= 0.5,
            velocity_target: match self.vel_target.get() {
                VelocityTarget::Amp => cz_synth::params::VelocityTarget::Amp,
                VelocityTarget::Dcw => cz_synth::params::VelocityTarget::Dcw,
                VelocityTarget::Both => cz_synth::params::VelocityTarget::Both,
                VelocityTarget::Off => cz_synth::params::VelocityTarget::Off,
            },
            int_pm_amount: self.int_pm_amount.get() as f32,
            int_pm_ratio: self.int_pm_ratio.get() as f32,
            ext_pm_amount: self.ext_pm_amount.get() as f32,
            pm_pre: self.pm_pre.get() >= 0.5,
            ..Default::default()
        }
    }
}

// =============================================================================
// Descriptor (unprepared state)
// =============================================================================

#[beamer::export]
#[derive(Default, HasParameters)]
pub struct CzDescriptor {
    #[parameters]
    pub parameters: CzParameters,
}

impl Descriptor for CzDescriptor {
    type Setup = SampleRate;
    type Processor = CzProcessor;

    fn prepare(self, setup: SampleRate) -> CzProcessor {
        let mut processor = Cz101Processor::new(setup.hz() as f32);
        processor.set_params(self.parameters.to_synth_params());
        CzProcessor {
            parameters: self.parameters,
            processor,
        }
    }

    fn webview_handler(&self) -> Option<Arc<dyn WebViewHandler>> {
        None
    }
}

// =============================================================================
// Processor (prepared state)
// =============================================================================

#[derive(HasParameters)]
pub struct CzProcessor {
    #[parameters]
    pub parameters: CzParameters,
    processor: Cz101Processor,
}

impl Processor for CzProcessor {
    type Descriptor = CzDescriptor;

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &ProcessContext,
    ) {
        let num_samples = buffer.num_samples();
        let num_channels = buffer.num_output_channels();

        // Process mono output from synth
        let mut mono_output = vec![0.0f32; num_samples];
        self.processor.process(&mut mono_output);

        let volume = self.parameters.volume.get() as f32;

        // Write to all output channels
        for ch in 0..num_channels {
            let out = buffer.output(ch);
            for sample_idx in 0..num_samples {
                out[sample_idx] = mono_output[sample_idx] * volume;
            }
        }
    }

    fn process_midi(&mut self, input: &[MidiEvent], _output: &mut MidiBuffer) {
        for event in input {
            match &event.event {
                MidiEventKind::NoteOn(note) if note.velocity > 0.0 => {
                    let freq = midi_note_to_freq(note.pitch);
                    self.processor.note_on(note.pitch, freq, note.velocity);
                }
                MidiEventKind::NoteOff(note) => {
                    self.processor.note_off(note.pitch);
                }
                MidiEventKind::ControlChange(cc) => {
                    match cc.controller {
                        1 => {
                            // Mod wheel (already 0.0-1.0)
                            self.processor.set_mod_wheel(cc.value);
                        }
                        64 => {
                            // Sustain pedal (already 0.0-1.0)
                            self.processor.set_sustain(cc.value >= 0.5);
                        }
                        _ => {}
                    }
                }
                MidiEventKind::PitchBend(pb) => {
                    // Pitch bend is already -1.0 to 1.0
                    self.processor.set_pitch_bend(pb.value);
                }
                _ => {}
            }
        }
    }

    fn wants_midi(&self) -> bool {
        true
    }

    fn tail_samples(&self) -> u32 {
        0
    }
}
