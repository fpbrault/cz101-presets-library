//! CZ-101 Phase Distortion synthesizer — CLAP/VST3/AUv2 plugin
//!
//! Uses clap-clap for the CLAP plugin interface and clap-wrapper for VST3/AUv2 export.
//! The DSP engine lives in the `cz-synth` crate.

use clap_clap::events::NoteKind;
use clap_clap::ext::params::{InfoFlags, ParamInfo, Params};
use clap_clap::prelude::*;
use cz_synth::params::{
    ChorusParams, DelayParams, FilterParams, FilterType, LfoParams, LfoTarget, LfoWaveform,
    LineParams, LineSelect, ModMode, PolyMode, PortamentoMode, ReverbParams, StepEnvData,
    SynthParams, VelocityTarget, VibratoParams, WarpAlgo, WaveformId,
};
use cz_synth::processor::Cz101Processor;
use std::sync::{Arc, Mutex};

// ─── Param ID constants ──────────────────────────────────────────────────────

// Global
const P_VOLUME: u32 = 0;
const P_OCTAVE: u32 = 1;
const P_LINE_SELECT: u32 = 2;
const P_MOD_MODE: u32 = 3;
const P_POLY_MODE: u32 = 4;
const P_LEGATO: u32 = 5;
const P_VEL_TARGET: u32 = 6;
const P_INT_PM_AMOUNT: u32 = 7;
const P_INT_PM_RATIO: u32 = 8;
const P_EXT_PM_AMOUNT: u32 = 9;
const P_PM_PRE: u32 = 10;

// Line 1 (100-series)
const P_L1_WAVEFORM: u32 = 100;
const P_L1_WARP_ALGO: u32 = 101;
const P_L1_DCW_BASE: u32 = 102;
const P_L1_DCA_BASE: u32 = 103;
const P_L1_DCO_DEPTH: u32 = 104;
const P_L1_OCTAVE: u32 = 105;
const P_L1_DETUNE: u32 = 106;
const P_L1_DCW_COMP: u32 = 107;
const P_L1_KEY_FOLLOW: u32 = 108;
const P_L1_MODULATION: u32 = 109;
const P_L1_ALGO_BLEND: u32 = 110;

// Line 2 (200-series)
const P_L2_WAVEFORM: u32 = 200;
const P_L2_WARP_ALGO: u32 = 201;
const P_L2_DCW_BASE: u32 = 202;
const P_L2_DCA_BASE: u32 = 203;
const P_L2_DCO_DEPTH: u32 = 204;
const P_L2_OCTAVE: u32 = 205;
const P_L2_DETUNE: u32 = 206;
const P_L2_DCW_COMP: u32 = 207;
const P_L2_KEY_FOLLOW: u32 = 208;
const P_L2_MODULATION: u32 = 209;
const P_L2_ALGO_BLEND: u32 = 210;

// Vibrato (300-series)
const P_VIB_ENABLED: u32 = 300;
const P_VIB_WAVEFORM: u32 = 301;
const P_VIB_RATE: u32 = 302;
const P_VIB_DEPTH: u32 = 303;
const P_VIB_DELAY: u32 = 304;

// Chorus (400-series)
const P_CHO_MIX: u32 = 400;
const P_CHO_RATE: u32 = 401;
const P_CHO_DEPTH: u32 = 402;

// Delay (500-series)
const P_DEL_MIX: u32 = 500;
const P_DEL_TIME: u32 = 501;
const P_DEL_FEEDBACK: u32 = 502;

// Reverb (600-series)
const P_REV_MIX: u32 = 600;
const P_REV_SIZE: u32 = 601;

// LFO (700-series)
const P_LFO_ENABLED: u32 = 700;
const P_LFO_WAVEFORM: u32 = 701;
const P_LFO_RATE: u32 = 702;
const P_LFO_DEPTH: u32 = 703;
const P_LFO_TARGET: u32 = 704;

// Filter (800-series)
const P_FIL_ENABLED: u32 = 800;
const P_FIL_CUTOFF: u32 = 801;
const P_FIL_RESONANCE: u32 = 802;
const P_FIL_ENV_AMOUNT: u32 = 803;
const P_FIL_TYPE: u32 = 804;

// Portamento (900-series)
const P_PORT_ENABLED: u32 = 900;
const P_PORT_MODE: u32 = 901;
const P_PORT_TIME: u32 = 902;

// ─── Parameter table ─────────────────────────────────────────────────────────

struct ParamDef {
    id: u32,
    name: &'static str,
    module: &'static str,
    min: f64,
    max: f64,
    default: f64,
    stepped: bool,
}

const PARAM_TABLE: &[ParamDef] = &[
    // Global
    ParamDef {
        id: P_VOLUME,
        name: "Volume",
        module: "Global",
        min: 0.0,
        max: 1.0,
        default: 0.4,
        stepped: false,
    },
    ParamDef {
        id: P_OCTAVE,
        name: "Octave",
        module: "Global",
        min: -2.0,
        max: 2.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_LINE_SELECT,
        name: "Line Select",
        module: "Global",
        min: 0.0,
        max: 4.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_MOD_MODE,
        name: "Mod Mode",
        module: "Global",
        min: 0.0,
        max: 2.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_POLY_MODE,
        name: "Poly Mode",
        module: "Global",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_LEGATO,
        name: "Legato",
        module: "Global",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_VEL_TARGET,
        name: "Velocity Target",
        module: "Global",
        min: 0.0,
        max: 3.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_INT_PM_AMOUNT,
        name: "Int PM Amount",
        module: "Global/PM",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_INT_PM_RATIO,
        name: "Int PM Ratio",
        module: "Global/PM",
        min: 0.0,
        max: 8.0,
        default: 1.0,
        stepped: false,
    },
    ParamDef {
        id: P_EXT_PM_AMOUNT,
        name: "Ext PM Amount",
        module: "Global/PM",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_PM_PRE,
        name: "PM Pre",
        module: "Global/PM",
        min: 0.0,
        max: 1.0,
        default: 1.0,
        stepped: true,
    },
    // Line 1
    ParamDef {
        id: P_L1_WAVEFORM,
        name: "Waveform",
        module: "Line 1",
        min: 1.0,
        max: 8.0,
        default: 1.0,
        stepped: true,
    },
    ParamDef {
        id: P_L1_WARP_ALGO,
        name: "Warp Algo",
        module: "Line 1",
        min: 0.0,
        max: 13.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_L1_DCW_BASE,
        name: "DCW Amount",
        module: "Line 1",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_DCA_BASE,
        name: "Level",
        module: "Line 1",
        min: 0.0,
        max: 1.0,
        default: 1.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_DCO_DEPTH,
        name: "DCO Depth",
        module: "Line 1",
        min: 0.0,
        max: 24.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_OCTAVE,
        name: "Octave",
        module: "Line 1",
        min: -2.0,
        max: 2.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_L1_DETUNE,
        name: "Detune (cents)",
        module: "Line 1",
        min: -100.0,
        max: 100.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_DCW_COMP,
        name: "DCW Comp",
        module: "Line 1",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_KEY_FOLLOW,
        name: "Key Follow",
        module: "Line 1",
        min: 0.0,
        max: 10.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_MODULATION,
        name: "Modulation",
        module: "Line 1",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L1_ALGO_BLEND,
        name: "Algo Blend",
        module: "Line 1",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    // Line 2
    ParamDef {
        id: P_L2_WAVEFORM,
        name: "Waveform",
        module: "Line 2",
        min: 1.0,
        max: 8.0,
        default: 1.0,
        stepped: true,
    },
    ParamDef {
        id: P_L2_WARP_ALGO,
        name: "Warp Algo",
        module: "Line 2",
        min: 0.0,
        max: 13.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_L2_DCW_BASE,
        name: "DCW Amount",
        module: "Line 2",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_DCA_BASE,
        name: "Level",
        module: "Line 2",
        min: 0.0,
        max: 1.0,
        default: 1.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_DCO_DEPTH,
        name: "DCO Depth",
        module: "Line 2",
        min: 0.0,
        max: 24.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_OCTAVE,
        name: "Octave",
        module: "Line 2",
        min: -2.0,
        max: 2.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_L2_DETUNE,
        name: "Detune (cents)",
        module: "Line 2",
        min: -100.0,
        max: 100.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_DCW_COMP,
        name: "DCW Comp",
        module: "Line 2",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_KEY_FOLLOW,
        name: "Key Follow",
        module: "Line 2",
        min: 0.0,
        max: 10.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_MODULATION,
        name: "Modulation",
        module: "Line 2",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_L2_ALGO_BLEND,
        name: "Algo Blend",
        module: "Line 2",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    // Vibrato
    ParamDef {
        id: P_VIB_ENABLED,
        name: "Enabled",
        module: "Vibrato",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_VIB_WAVEFORM,
        name: "Waveform",
        module: "Vibrato",
        min: 1.0,
        max: 4.0,
        default: 1.0,
        stepped: true,
    },
    ParamDef {
        id: P_VIB_RATE,
        name: "Rate (Hz)",
        module: "Vibrato",
        min: 0.1,
        max: 20.0,
        default: 30.0,
        stepped: false,
    },
    ParamDef {
        id: P_VIB_DEPTH,
        name: "Depth",
        module: "Vibrato",
        min: 0.0,
        max: 100.0,
        default: 30.0,
        stepped: false,
    },
    ParamDef {
        id: P_VIB_DELAY,
        name: "Delay (ms)",
        module: "Vibrato",
        min: 0.0,
        max: 2000.0,
        default: 0.0,
        stepped: false,
    },
    // Chorus
    ParamDef {
        id: P_CHO_MIX,
        name: "Mix",
        module: "Chorus",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_CHO_RATE,
        name: "Rate (Hz)",
        module: "Chorus",
        min: 0.1,
        max: 10.0,
        default: 0.8,
        stepped: false,
    },
    ParamDef {
        id: P_CHO_DEPTH,
        name: "Depth",
        module: "Chorus",
        min: 0.0,
        max: 0.02,
        default: 0.003,
        stepped: false,
    },
    // Delay
    ParamDef {
        id: P_DEL_MIX,
        name: "Mix",
        module: "Delay",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_DEL_TIME,
        name: "Time (s)",
        module: "Delay",
        min: 0.01,
        max: 2.0,
        default: 0.3,
        stepped: false,
    },
    ParamDef {
        id: P_DEL_FEEDBACK,
        name: "Feedback",
        module: "Delay",
        min: 0.0,
        max: 1.0,
        default: 0.35,
        stepped: false,
    },
    // Reverb
    ParamDef {
        id: P_REV_MIX,
        name: "Mix",
        module: "Reverb",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_REV_SIZE,
        name: "Size",
        module: "Reverb",
        min: 0.0,
        max: 1.0,
        default: 0.5,
        stepped: false,
    },
    // LFO
    ParamDef {
        id: P_LFO_ENABLED,
        name: "Enabled",
        module: "LFO",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_LFO_WAVEFORM,
        name: "Waveform",
        module: "LFO",
        min: 0.0,
        max: 3.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_LFO_RATE,
        name: "Rate (Hz)",
        module: "LFO",
        min: 0.01,
        max: 20.0,
        default: 5.0,
        stepped: false,
    },
    ParamDef {
        id: P_LFO_DEPTH,
        name: "Depth",
        module: "LFO",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_LFO_TARGET,
        name: "Target",
        module: "LFO",
        min: 0.0,
        max: 3.0,
        default: 0.0,
        stepped: true,
    },
    // Filter
    ParamDef {
        id: P_FIL_ENABLED,
        name: "Enabled",
        module: "Filter",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_FIL_CUTOFF,
        name: "Cutoff (Hz)",
        module: "Filter",
        min: 20.0,
        max: 20000.0,
        default: 5000.0,
        stepped: false,
    },
    ParamDef {
        id: P_FIL_RESONANCE,
        name: "Resonance",
        module: "Filter",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_FIL_ENV_AMOUNT,
        name: "Env Amount",
        module: "Filter",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: false,
    },
    ParamDef {
        id: P_FIL_TYPE,
        name: "Type",
        module: "Filter",
        min: 0.0,
        max: 2.0,
        default: 0.0,
        stepped: true,
    },
    // Portamento
    ParamDef {
        id: P_PORT_ENABLED,
        name: "Enabled",
        module: "Portamento",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_PORT_MODE,
        name: "Mode",
        module: "Portamento",
        min: 0.0,
        max: 1.0,
        default: 0.0,
        stepped: true,
    },
    ParamDef {
        id: P_PORT_TIME,
        name: "Time (s)",
        module: "Portamento",
        min: 0.0,
        max: 2.0,
        default: 0.5,
        stepped: false,
    },
];

// ─── Param read/write helpers ─────────────────────────────────────────────────

fn read_param(params: &SynthParams, pid: u32) -> Option<f64> {
    let v = match pid {
        P_VOLUME => params.volume as f64,
        P_OCTAVE => params.octave as f64,
        P_LINE_SELECT => line_select_to_f64(params.line_select),
        P_MOD_MODE => mod_mode_to_f64(params.mod_mode),
        P_POLY_MODE => poly_mode_to_f64(params.poly_mode),
        P_LEGATO => {
            if params.legato {
                1.0
            } else {
                0.0
            }
        }
        P_VEL_TARGET => vel_target_to_f64(params.velocity_target),
        P_INT_PM_AMOUNT => params.int_pm_amount as f64,
        P_INT_PM_RATIO => params.int_pm_ratio as f64,
        P_EXT_PM_AMOUNT => params.ext_pm_amount as f64,
        P_PM_PRE => {
            if params.pm_pre {
                1.0
            } else {
                0.0
            }
        }
        // Line 1
        P_L1_WAVEFORM => params.line1.waveform as u8 as f64,
        P_L1_WARP_ALGO => warp_algo_to_f64(params.line1.warp_algo),
        P_L1_DCW_BASE => params.line1.dcw_base as f64,
        P_L1_DCA_BASE => params.line1.dca_base as f64,
        P_L1_DCO_DEPTH => params.line1.dco_depth as f64,
        P_L1_OCTAVE => params.line1.octave as f64,
        P_L1_DETUNE => params.line1.detune_cents as f64,
        P_L1_DCW_COMP => params.line1.dcw_comp as f64,
        P_L1_KEY_FOLLOW => params.line1.key_follow as f64,
        P_L1_MODULATION => params.line1.modulation as f64,
        P_L1_ALGO_BLEND => params.line1.algo_blend as f64,
        // Line 2
        P_L2_WAVEFORM => params.line2.waveform as u8 as f64,
        P_L2_WARP_ALGO => warp_algo_to_f64(params.line2.warp_algo),
        P_L2_DCW_BASE => params.line2.dcw_base as f64,
        P_L2_DCA_BASE => params.line2.dca_base as f64,
        P_L2_DCO_DEPTH => params.line2.dco_depth as f64,
        P_L2_OCTAVE => params.line2.octave as f64,
        P_L2_DETUNE => params.line2.detune_cents as f64,
        P_L2_DCW_COMP => params.line2.dcw_comp as f64,
        P_L2_KEY_FOLLOW => params.line2.key_follow as f64,
        P_L2_MODULATION => params.line2.modulation as f64,
        P_L2_ALGO_BLEND => params.line2.algo_blend as f64,
        // Vibrato
        P_VIB_ENABLED => {
            if params.vibrato.enabled {
                1.0
            } else {
                0.0
            }
        }
        P_VIB_WAVEFORM => params.vibrato.waveform as f64,
        P_VIB_RATE => params.vibrato.rate as f64,
        P_VIB_DEPTH => params.vibrato.depth as f64,
        P_VIB_DELAY => params.vibrato.delay as f64,
        // Chorus
        P_CHO_MIX => params.chorus.mix as f64,
        P_CHO_RATE => params.chorus.rate as f64,
        P_CHO_DEPTH => params.chorus.depth as f64,
        // Delay
        P_DEL_MIX => params.delay.mix as f64,
        P_DEL_TIME => params.delay.time as f64,
        P_DEL_FEEDBACK => params.delay.feedback as f64,
        // Reverb
        P_REV_MIX => params.reverb.mix as f64,
        P_REV_SIZE => params.reverb.size as f64,
        // LFO
        P_LFO_ENABLED => {
            if params.lfo.enabled {
                1.0
            } else {
                0.0
            }
        }
        P_LFO_WAVEFORM => lfo_waveform_to_f64(params.lfo.waveform),
        P_LFO_RATE => params.lfo.rate as f64,
        P_LFO_DEPTH => params.lfo.depth as f64,
        P_LFO_TARGET => lfo_target_to_f64(params.lfo.target),
        // Filter
        P_FIL_ENABLED => {
            if params.filter.enabled {
                1.0
            } else {
                0.0
            }
        }
        P_FIL_CUTOFF => params.filter.cutoff as f64,
        P_FIL_RESONANCE => params.filter.resonance as f64,
        P_FIL_ENV_AMOUNT => params.filter.env_amount as f64,
        P_FIL_TYPE => filter_type_to_f64(params.filter.filter_type),
        // Portamento
        P_PORT_ENABLED => {
            if params.portamento.enabled {
                1.0
            } else {
                0.0
            }
        }
        P_PORT_MODE => port_mode_to_f64(params.portamento.mode),
        P_PORT_TIME => params.portamento.time as f64,
        _ => return None,
    };
    Some(v)
}

fn apply_param(params: &mut SynthParams, pid: u32, v: f64) {
    match pid {
        P_VOLUME => params.volume = v as f32,
        P_OCTAVE => params.octave = v as f32,
        P_LINE_SELECT => params.line_select = f64_to_line_select(v),
        P_MOD_MODE => params.mod_mode = f64_to_mod_mode(v),
        P_POLY_MODE => params.poly_mode = f64_to_poly_mode(v),
        P_LEGATO => params.legato = v >= 0.5,
        P_VEL_TARGET => params.velocity_target = f64_to_vel_target(v),
        P_INT_PM_AMOUNT => params.int_pm_amount = v as f32,
        P_INT_PM_RATIO => params.int_pm_ratio = v as f32,
        P_EXT_PM_AMOUNT => params.ext_pm_amount = v as f32,
        P_PM_PRE => params.pm_pre = v >= 0.5,
        // Line 1
        P_L1_WAVEFORM => params.line1.waveform = WaveformId::from_u8(v as u8),
        P_L1_WARP_ALGO => params.line1.warp_algo = f64_to_warp_algo(v),
        P_L1_DCW_BASE => params.line1.dcw_base = v as f32,
        P_L1_DCA_BASE => params.line1.dca_base = v as f32,
        P_L1_DCO_DEPTH => params.line1.dco_depth = v as f32,
        P_L1_OCTAVE => params.line1.octave = v as f32,
        P_L1_DETUNE => params.line1.detune_cents = v as f32,
        P_L1_DCW_COMP => params.line1.dcw_comp = v as f32,
        P_L1_KEY_FOLLOW => params.line1.key_follow = v as f32,
        P_L1_MODULATION => params.line1.modulation = v as f32,
        P_L1_ALGO_BLEND => params.line1.algo_blend = v as f32,
        // Line 2
        P_L2_WAVEFORM => params.line2.waveform = WaveformId::from_u8(v as u8),
        P_L2_WARP_ALGO => params.line2.warp_algo = f64_to_warp_algo(v),
        P_L2_DCW_BASE => params.line2.dcw_base = v as f32,
        P_L2_DCA_BASE => params.line2.dca_base = v as f32,
        P_L2_DCO_DEPTH => params.line2.dco_depth = v as f32,
        P_L2_OCTAVE => params.line2.octave = v as f32,
        P_L2_DETUNE => params.line2.detune_cents = v as f32,
        P_L2_DCW_COMP => params.line2.dcw_comp = v as f32,
        P_L2_KEY_FOLLOW => params.line2.key_follow = v as f32,
        P_L2_MODULATION => params.line2.modulation = v as f32,
        P_L2_ALGO_BLEND => params.line2.algo_blend = v as f32,
        // Vibrato
        P_VIB_ENABLED => params.vibrato.enabled = v >= 0.5,
        P_VIB_WAVEFORM => params.vibrato.waveform = v as u8,
        P_VIB_RATE => params.vibrato.rate = v as f32,
        P_VIB_DEPTH => params.vibrato.depth = v as f32,
        P_VIB_DELAY => params.vibrato.delay = v as f32,
        // Chorus
        P_CHO_MIX => params.chorus.mix = v as f32,
        P_CHO_RATE => params.chorus.rate = v as f32,
        P_CHO_DEPTH => params.chorus.depth = v as f32,
        // Delay
        P_DEL_MIX => params.delay.mix = v as f32,
        P_DEL_TIME => params.delay.time = v as f32,
        P_DEL_FEEDBACK => params.delay.feedback = v as f32,
        // Reverb
        P_REV_MIX => params.reverb.mix = v as f32,
        P_REV_SIZE => params.reverb.size = v as f32,
        // LFO
        P_LFO_ENABLED => params.lfo.enabled = v >= 0.5,
        P_LFO_WAVEFORM => params.lfo.waveform = f64_to_lfo_waveform(v),
        P_LFO_RATE => params.lfo.rate = v as f32,
        P_LFO_DEPTH => params.lfo.depth = v as f32,
        P_LFO_TARGET => params.lfo.target = f64_to_lfo_target(v),
        // Filter
        P_FIL_ENABLED => params.filter.enabled = v >= 0.5,
        P_FIL_CUTOFF => params.filter.cutoff = v as f32,
        P_FIL_RESONANCE => params.filter.resonance = v as f32,
        P_FIL_ENV_AMOUNT => params.filter.env_amount = v as f32,
        P_FIL_TYPE => params.filter.filter_type = f64_to_filter_type(v),
        // Portamento
        P_PORT_ENABLED => params.portamento.enabled = v >= 0.5,
        P_PORT_MODE => params.portamento.mode = f64_to_port_mode(v),
        P_PORT_TIME => params.portamento.time = v as f32,
        _ => {}
    }
}

// ─── Enum ↔ f64 conversions ───────────────────────────────────────────────────

fn line_select_to_f64(v: LineSelect) -> f64 {
    match v {
        LineSelect::L1PlusL2 => 0.0,
        LineSelect::L1 => 1.0,
        LineSelect::L2 => 2.0,
        LineSelect::L1PlusL1Prime => 3.0,
        LineSelect::L1PlusL2Prime => 4.0,
    }
}
fn f64_to_line_select(v: f64) -> LineSelect {
    match v as u32 {
        1 => LineSelect::L1,
        2 => LineSelect::L2,
        3 => LineSelect::L1PlusL1Prime,
        4 => LineSelect::L1PlusL2Prime,
        _ => LineSelect::L1PlusL2,
    }
}

fn mod_mode_to_f64(v: ModMode) -> f64 {
    match v {
        ModMode::Normal => 0.0,
        ModMode::Ring => 1.0,
        ModMode::Noise => 2.0,
    }
}
fn f64_to_mod_mode(v: f64) -> ModMode {
    match v as u32 {
        1 => ModMode::Ring,
        2 => ModMode::Noise,
        _ => ModMode::Normal,
    }
}

fn poly_mode_to_f64(v: PolyMode) -> f64 {
    match v {
        PolyMode::Poly8 => 0.0,
        PolyMode::Mono => 1.0,
    }
}
fn f64_to_poly_mode(v: f64) -> PolyMode {
    if v >= 0.5 {
        PolyMode::Mono
    } else {
        PolyMode::Poly8
    }
}

fn vel_target_to_f64(v: VelocityTarget) -> f64 {
    match v {
        VelocityTarget::Amp => 0.0,
        VelocityTarget::Dcw => 1.0,
        VelocityTarget::Both => 2.0,
        VelocityTarget::Off => 3.0,
    }
}
fn f64_to_vel_target(v: f64) -> VelocityTarget {
    match v as u32 {
        1 => VelocityTarget::Dcw,
        2 => VelocityTarget::Both,
        3 => VelocityTarget::Off,
        _ => VelocityTarget::Amp,
    }
}

fn warp_algo_to_f64(v: WarpAlgo) -> f64 {
    match v {
        WarpAlgo::Cz101 => 0.0,
        WarpAlgo::Bend => 1.0,
        WarpAlgo::Sync => 2.0,
        WarpAlgo::Pinch => 3.0,
        WarpAlgo::Fold => 4.0,
        WarpAlgo::Skew => 5.0,
        WarpAlgo::Quantize => 6.0,
        WarpAlgo::Twist => 7.0,
        WarpAlgo::Clip => 8.0,
        WarpAlgo::Ripple => 9.0,
        WarpAlgo::Mirror => 10.0,
        WarpAlgo::Fof => 11.0,
        WarpAlgo::Karpunk => 12.0,
        WarpAlgo::Sine => 13.0,
    }
}
fn f64_to_warp_algo(v: f64) -> WarpAlgo {
    match v as u32 {
        1 => WarpAlgo::Bend,
        2 => WarpAlgo::Sync,
        3 => WarpAlgo::Pinch,
        4 => WarpAlgo::Fold,
        5 => WarpAlgo::Skew,
        6 => WarpAlgo::Quantize,
        7 => WarpAlgo::Twist,
        8 => WarpAlgo::Clip,
        9 => WarpAlgo::Ripple,
        10 => WarpAlgo::Mirror,
        11 => WarpAlgo::Fof,
        12 => WarpAlgo::Karpunk,
        13 => WarpAlgo::Sine,
        _ => WarpAlgo::Cz101,
    }
}

fn lfo_waveform_to_f64(v: LfoWaveform) -> f64 {
    match v {
        LfoWaveform::Sine => 0.0,
        LfoWaveform::Triangle => 1.0,
        LfoWaveform::Square => 2.0,
        LfoWaveform::Saw => 3.0,
    }
}
fn f64_to_lfo_waveform(v: f64) -> LfoWaveform {
    match v as u32 {
        1 => LfoWaveform::Triangle,
        2 => LfoWaveform::Square,
        3 => LfoWaveform::Saw,
        _ => LfoWaveform::Sine,
    }
}

fn lfo_target_to_f64(v: LfoTarget) -> f64 {
    match v {
        LfoTarget::Pitch => 0.0,
        LfoTarget::Dcw => 1.0,
        LfoTarget::Dca => 2.0,
        LfoTarget::Filter => 3.0,
    }
}
fn f64_to_lfo_target(v: f64) -> LfoTarget {
    match v as u32 {
        1 => LfoTarget::Dcw,
        2 => LfoTarget::Dca,
        3 => LfoTarget::Filter,
        _ => LfoTarget::Pitch,
    }
}

fn filter_type_to_f64(v: FilterType) -> f64 {
    match v {
        FilterType::Lp => 0.0,
        FilterType::Hp => 1.0,
        FilterType::Bp => 2.0,
    }
}
fn f64_to_filter_type(v: f64) -> FilterType {
    match v as u32 {
        1 => FilterType::Hp,
        2 => FilterType::Bp,
        _ => FilterType::Lp,
    }
}

fn port_mode_to_f64(v: PortamentoMode) -> f64 {
    match v {
        PortamentoMode::Rate => 0.0,
        PortamentoMode::Time => 1.0,
    }
}
fn f64_to_port_mode(v: f64) -> PortamentoMode {
    if v >= 0.5 {
        PortamentoMode::Time
    } else {
        PortamentoMode::Rate
    }
}

// ─── CzParams extension ───────────────────────────────────────────────────────

struct CzParams;

impl Params<CzPlugin> for CzParams {
    fn count(_plugin: &CzPlugin) -> u32 {
        PARAM_TABLE.len() as u32
    }

    fn get_info(_plugin: &CzPlugin, param_index: u32) -> Option<ParamInfo> {
        let def = PARAM_TABLE.get(param_index as usize)?;
        let mut flags = InfoFlags::Automatable as u32;
        if def.stepped {
            flags |= InfoFlags::Stepped as u32;
        }
        Some(ParamInfo {
            id: ClapId::from(def.id as u16),
            flags,
            name: def.name.to_string(),
            module: def.module.to_string(),
            min_value: def.min,
            max_value: def.max,
            default_value: def.default,
        })
    }

    fn get_value(plugin: &CzPlugin, param_id: ClapId) -> Option<f64> {
        let pid: u32 = param_id.into();
        let params = plugin.params.lock().ok()?;
        read_param(&params, pid)
    }

    fn value_to_text(
        _plugin: &CzPlugin,
        param_id: ClapId,
        value: f64,
        out_buf: &mut [u8],
    ) -> Result<(), clap_clap::Error> {
        let pid: u32 = param_id.into();
        let text = match pid {
            P_LINE_SELECT => match value as u32 {
                0 => "L1+L2",
                1 => "L1",
                2 => "L2",
                3 => "L1+L1'",
                4 => "L1+L2'",
                _ => "?",
            }
            .to_string(),
            P_MOD_MODE => match value as u32 {
                0 => "Normal",
                1 => "Ring",
                2 => "Noise",
                _ => "?",
            }
            .to_string(),
            P_POLY_MODE => if value >= 0.5 { "Mono" } else { "Poly8" }.to_string(),
            P_VEL_TARGET => match value as u32 {
                0 => "Amp",
                1 => "DCW",
                2 => "Both",
                3 => "Off",
                _ => "?",
            }
            .to_string(),
            P_L1_WARP_ALGO | P_L2_WARP_ALGO => warp_algo_name(value as u32).to_string(),
            P_LFO_WAVEFORM => match value as u32 {
                0 => "Sine",
                1 => "Triangle",
                2 => "Square",
                3 => "Saw",
                _ => "?",
            }
            .to_string(),
            P_LFO_TARGET => match value as u32 {
                0 => "Pitch",
                1 => "DCW",
                2 => "DCA",
                3 => "Filter",
                _ => "?",
            }
            .to_string(),
            P_FIL_TYPE => match value as u32 {
                0 => "LP",
                1 => "HP",
                2 => "BP",
                _ => "?",
            }
            .to_string(),
            P_PORT_MODE => if value >= 0.5 { "Time" } else { "Rate" }.to_string(),
            P_LEGATO | P_PM_PRE | P_VIB_ENABLED | P_LFO_ENABLED | P_FIL_ENABLED
            | P_PORT_ENABLED => if value >= 0.5 { "On" } else { "Off" }.to_string(),
            P_L1_WAVEFORM | P_L2_WAVEFORM => waveform_name(value as u8).to_string(),
            P_VIB_WAVEFORM => match value as u32 {
                1 => "Sine",
                2 => "Triangle",
                3 => "Square",
                4 => "Saw",
                _ => "?",
            }
            .to_string(),
            _ => format!("{:.3}", value),
        };
        let bytes = text.as_bytes();
        let len = bytes.len().min(out_buf.len());
        out_buf[..len].copy_from_slice(&bytes[..len]);
        Ok(())
    }

    fn text_to_value(
        _plugin: &CzPlugin,
        _param_id: ClapId,
        param_value_text: &str,
    ) -> Result<f64, clap_clap::Error> {
        param_value_text.parse::<f64>().map_err(|_| {
            clap_clap::ext::Error::Params(clap_clap::ext::params::Error::ParseFloat(None)).into()
        })
    }

    fn flush_inactive(plugin: &CzPlugin, in_events: &InputEvents, _out_events: &OutputEvents) {
        let mut shadow = plugin.params.lock().unwrap();
        for i in 0..in_events.size() {
            let header = in_events.get(i);
            if let Ok(pv) = header.param_value() {
                let pid: u32 = pv.param_id().into();
                apply_param(&mut shadow, pid, pv.value());
            }
        }
    }

    fn flush(audio_thread: &CzAudioThread, in_events: &InputEvents, _out_events: &OutputEvents) {
        let mut proc = audio_thread.processor.lock().unwrap();
        for i in 0..in_events.size() {
            let header = in_events.get(i);
            if let Ok(pv) = header.param_value() {
                let pid: u32 = pv.param_id().into();
                apply_param(&mut proc.params, pid, pv.value());
            }
        }
    }
}

fn warp_algo_name(v: u32) -> &'static str {
    match v {
        0 => "CZ-101",
        1 => "Bend",
        2 => "Sync",
        3 => "Pinch",
        4 => "Fold",
        5 => "Skew",
        6 => "Quantize",
        7 => "Twist",
        8 => "Clip",
        9 => "Ripple",
        10 => "Mirror",
        11 => "FOF",
        12 => "Karpunk",
        13 => "Sine",
        _ => "?",
    }
}

fn waveform_name(v: u8) -> &'static str {
    match v {
        1 => "Saw",
        2 => "Square",
        3 => "Pulse",
        4 => "Null",
        5 => "Sine Pulse",
        6 => "Saw Pulse",
        7 => "Multi Sine",
        8 => "Pulse 2",
        _ => "?",
    }
}

// ─── Factory presets ──────────────────────────────────────────────────────────

fn make_env(steps: &[(f32, u8)], sustain_step: usize, step_count: usize) -> StepEnvData {
    let mut out = StepEnvData::default();
    out.sustain_step = sustain_step;
    out.step_count = step_count;
    out.loop_ = false;
    for (i, &(level, rate)) in steps.iter().enumerate().take(8) {
        out.steps[i] = cz_synth::params::EnvStep { level, rate };
    }
    out
}

fn default_dco_env() -> StepEnvData {
    make_env(
        &[
            (0.0, 50),
            (0.0, 50),
            (0.0, 50),
            (0.0, 50),
            (0.0, 50),
            (0.0, 50),
            (0.0, 50),
            (0.0, 50),
        ],
        0,
        8,
    )
}

fn preset_wow() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 1.0;
    p.int_pm_amount = 0.0;
    p.int_pm_ratio = 4.0;
    p.pm_pre = true;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Sync,
        dcw_base: 0.96875,
        dca_base: 0.9375,
        octave: -1.0,
        detune_cents: 4.0,
        dco_depth: 12.0,
        dcw_comp: 0.5408333,
        algo_blend: 0.015,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (0.748, 43),
                (0.319, 29),
                (0.25, 8),
                (0.0, 14),
                (1.0, 99),
                (0.749, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            2,
            4,
        ),
        dca_env: make_env(
            &[
                (1.0, 47),
                (1.0, 48),
                (1.0, 24),
                (0.0, 42),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            2,
            4,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::SinePulse,
        warp_algo: WarpAlgo::Cz101,
        dcw_base: 1.0,
        dca_base: 0.98,
        octave: -1.0,
        detune_cents: 12.0,
        dco_depth: 0.0,
        dcw_comp: 0.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (0.748, 43),
                (0.319, 29),
                (0.25, 8),
                (0.0, 14),
                (1.0, 99),
                (0.749, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            2,
            4,
        ),
        dca_env: make_env(
            &[
                (1.0, 47),
                (1.0, 48),
                (1.0, 24),
                (0.0, 42),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            2,
            4,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 2.1,
        depth: 1.0,
        mix: 0.0,
    };
    p
}

fn preset_soft_piano() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 0.8723;
    p.int_pm_ratio = 1.993;
    p.pm_pre = true;
    p.line_select = LineSelect::L1;
    p.velocity_target = VelocityTarget::Off;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Pinch,
        dcw_base: 1.0,
        dca_base: 1.0,
        octave: -1.0,
        detune_cents: 12.0,
        dco_depth: 0.0,
        dcw_comp: 0.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (1.0, 99),
                (0.357, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.218, 60),
            ],
            1,
            3,
        ),
        dca_env: make_env(
            &[
                (1.0, 90),
                (1.0, 99),
                (0.0, 79),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 71),
            ],
            1,
            3,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Pinch,
        dcw_base: 1.0,
        dca_base: 1.0,
        octave: -1.0,
        detune_cents: 12.0,
        dco_depth: 0.0,
        dcw_comp: 0.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (1.0, 99),
                (0.425, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.218, 60),
            ],
            1,
            3,
        ),
        dca_env: make_env(
            &[
                (1.0, 90),
                (1.0, 99),
                (0.0, 79),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 71),
            ],
            1,
            3,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 1.064,
        depth: 0.546,
        mix: 0.249,
    };
    p.delay = DelayParams {
        time: 0.563,
        feedback: 0.147,
        mix: 0.266,
    };
    p.reverb = ReverbParams {
        size: 0.5,
        mix: 0.0,
    };
    p.lfo = LfoParams {
        enabled: true,
        waveform: LfoWaveform::Sine,
        rate: 0.467,
        depth: 0.140,
        target: LfoTarget::Dcw,
    };
    p
}

fn preset_retro() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 0.97;
    p.int_pm_ratio = 2.0;
    p.pm_pre = true;
    p.line1 = LineParams {
        waveform: WaveformId::Pulse,
        warp_algo: WarpAlgo::Cz101,
        algo2: None,
        algo_blend: 0.81,
        dcw_base: 1.0,
        dca_base: 1.0,
        octave: -1.0,
        detune_cents: 1.0,
        dco_depth: 0.0,
        dcw_comp: 0.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (1.0, 51),
                (0.49, 34),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        dca_env: make_env(
            &[
                (1.0, 90),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Cz101,
        dcw_base: 0.82,
        dca_base: 0.0,
        octave: -1.0,
        detune_cents: -6.0,
        dco_depth: 0.0,
        dcw_comp: 1.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (1.0, 80),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        dca_env: make_env(
            &[
                (1.0, 90),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 0.8,
        depth: 3.0,
        mix: 0.0,
    };
    p
}

fn preset_plucking() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 0.637;
    p.int_pm_ratio = 0.5;
    p.pm_pre = false;
    p.line_select = LineSelect::L2;
    p.velocity_target = VelocityTarget::Off;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Bend,
        dcw_base: 1.0,
        dca_base: 0.410,
        octave: -1.0,
        detune_cents: 4.0,
        dco_depth: 12.0,
        dcw_comp: 0.52,
        dco_env: make_env(
            &[
                (1.0, 66),
                (1.0, 45),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            2,
        ),
        dcw_env: make_env(
            &[
                (1.0, 58),
                (0.35, 68),
                (0.602, 36),
                (0.362, 54),
                (0.570, 22),
                (0.175, 26),
                (1.0, 99),
                (0.0, 60),
            ],
            4,
            6,
        ),
        dca_env: make_env(
            &[
                (1.0, 31),
                (0.0, 32),
                (0.0, 1),
                (0.0, 1),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            0,
            2,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Pinch,
        algo2: Some(WarpAlgo::Fold),
        algo_blend: 0.467,
        dcw_base: 1.0,
        dca_base: 1.0,
        octave: -1.0,
        detune_cents: 12.0,
        dco_depth: 0.0,
        dcw_comp: 0.416,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (0.486, 54),
                (0.225, 45),
                (0.291, 37),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.443, 60),
            ],
            1,
            3,
        ),
        dca_env: make_env(
            &[
                (1.0, 66),
                (0.876, 37),
                (0.0, 23),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            3,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 2.1,
        depth: 0.610,
        mix: 1.0,
    };
    p.delay = DelayParams {
        time: 0.554,
        feedback: 0.326,
        mix: 0.0,
    };
    p.vibrato = VibratoParams {
        enabled: true,
        waveform: 1,
        rate: 8.937,
        depth: 12.69,
        delay: 0.0,
    };
    p.lfo = LfoParams {
        enabled: false,
        waveform: LfoWaveform::Triangle,
        rate: 0.526,
        depth: 0.822,
        target: LfoTarget::Filter,
    };
    p.filter = FilterParams {
        enabled: false,
        filter_type: FilterType::Lp,
        cutoff: 2969.0,
        resonance: 0.690,
        env_amount: 0.723,
    };
    p
}

fn preset_clav() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 1.0;
    p.int_pm_ratio = 2.0;
    p.pm_pre = true;
    p.line_select = LineSelect::L1PlusL2Prime;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Cz101,
        dcw_base: 1.0,
        dca_base: 1.0,
        octave: -2.0,
        detune_cents: 0.0,
        dco_depth: 12.0,
        dcw_comp: 0.0,
        key_follow: 9.0,
        dco_env: make_env(
            &[
                (0.0, 99),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            1,
        ),
        dcw_env: make_env(
            &[
                (0.535, 82),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            8,
        ),
        dca_env: make_env(
            &[
                (1.0, 94),
                (1.0, 83),
                (0.0, 33),
                (0.0, 60),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            2,
            4,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Cz101,
        dcw_base: 1.0,
        dca_base: 0.0,
        octave: 0.0,
        detune_cents: 4624.0,
        dco_depth: 12.0,
        dcw_comp: 0.0,
        key_follow: 9.0,
        dco_env: make_env(
            &[
                (0.0, 99),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            1,
        ),
        dcw_env: make_env(
            &[
                (0.404, 99),
                (0.0, 99),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            2,
        ),
        dca_env: make_env(
            &[
                (0.576, 99),
                (0.768, 99),
                (0.0, 38),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            2,
            3,
        ),
        ..LineParams::default()
    };
    p
}

fn preset_chants() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 0.77;
    p.int_pm_ratio = 2.5;
    p.pm_pre = false;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Pinch,
        dcw_base: 0.96,
        dca_base: 0.98,
        octave: 0.0,
        detune_cents: 0.0,
        dco_depth: 2.0,
        dcw_comp: 0.0,
        dco_env: make_env(
            &[
                (0.69, 56),
                (0.72, 74),
                (0.0, 51),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            2,
            8,
        ),
        dcw_env: make_env(
            &[
                (0.65, 80),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        dca_env: make_env(
            &[
                (0.71, 90),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::MultiSine,
        warp_algo: WarpAlgo::Cz101,
        algo_blend: 0.37,
        dcw_base: 0.42,
        dca_base: 1.0,
        octave: -1.0,
        detune_cents: 6.0,
        dco_depth: 0.0,
        dcw_comp: 0.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (1.0, 43),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        dca_env: make_env(
            &[
                (1.0, 90),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 0.8,
        depth: 3.0,
        mix: 0.61,
    };
    p.delay = DelayParams {
        time: 0.41,
        feedback: 0.35,
        mix: 0.27,
    };
    p
}

fn preset_bright_changes() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 1.0;
    p.int_pm_ratio = 2.0;
    p.pm_pre = true;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Twist,
        algo_blend: 0.557,
        dcw_base: 1.0,
        dca_base: 0.994,
        octave: -1.0,
        detune_cents: 0.0,
        dco_depth: 24.0,
        dcw_comp: 0.0,
        key_follow: 8.0,
        dco_env: make_env(
            &[
                (0.0, 99),
                (0.870, 27),
                (0.0, 99),
                (0.0, 21),
                (1.0, 99),
                (0.719, 15),
                (0.0, 99),
                (0.0, 17),
            ],
            7,
            1,
        ),
        dcw_env: make_env(
            &[
                (1.0, 30),
                (0.209, 25),
                (0.827, 25),
                (0.0, 25),
                (0.567, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            4,
        ),
        dca_env: make_env(
            &[
                (1.0, 75),
                (0.8, 80),
                (0.8, 84),
                (0.0, 9),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            2,
            4,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Pinch,
        algo2: Some(WarpAlgo::Fold),
        algo_blend: 0.557,
        dcw_base: 1.0,
        dca_base: 0.681,
        octave: 0.0,
        detune_cents: 5.0,
        dco_depth: 24.0,
        dcw_comp: 0.0,
        key_follow: 9.0,
        dco_env: make_env(
            &[
                (0.0, 99),
                (0.870, 27),
                (0.0, 99),
                (0.0, 21),
                (1.0, 99),
                (0.719, 15),
                (0.0, 99),
                (0.0, 17),
            ],
            7,
            1,
        ),
        dcw_env: make_env(
            &[
                (1.0, 30),
                (0.209, 25),
                (0.827, 25),
                (0.0, 25),
                (0.567, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            4,
        ),
        dca_env: make_env(
            &[
                (1.0, 75),
                (0.8, 80),
                (0.8, 84),
                (0.0, 9),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            2,
            4,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 1.395,
        depth: 0.325,
        mix: 0.0,
    };
    p.delay = DelayParams {
        time: 0.3,
        feedback: 0.35,
        mix: 0.372,
    };
    p.reverb = ReverbParams {
        size: 0.780,
        mix: 0.0,
    };
    p.vibrato = VibratoParams {
        enabled: true,
        waveform: 1,
        rate: 7.436,
        depth: 15.687,
        delay: 0.0,
    };
    p
}

fn preset_bliss() -> SynthParams {
    let mut p = SynthParams::default();
    p.volume = 0.95;
    p.int_pm_ratio = 4.0;
    p.pm_pre = true;
    p.line1 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Bend,
        dcw_base: 1.0,
        dca_base: 1.0,
        octave: -1.0,
        detune_cents: 4.0,
        dco_depth: 12.0,
        dcw_comp: 0.52,
        dco_env: make_env(
            &[
                (1.0, 66),
                (1.0, 45),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
                (0.0, 50),
            ],
            0,
            2,
        ),
        dcw_env: make_env(
            &[
                (1.0, 58),
                (0.35, 68),
                (0.602, 36),
                (0.362, 54),
                (0.570, 22),
                (0.0, 27),
                (1.0, 99),
                (0.0, 60),
            ],
            4,
            6,
        ),
        dca_env: make_env(
            &[
                (1.0, 48),
                (0.0, 17),
                (0.0, 1),
                (0.0, 1),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            0,
            2,
        ),
        ..LineParams::default()
    };
    p.line2 = LineParams {
        waveform: WaveformId::Saw,
        warp_algo: WarpAlgo::Cz101,
        dcw_base: 0.46,
        dca_base: 0.98,
        octave: -1.0,
        detune_cents: 12.0,
        dco_depth: 0.0,
        dcw_comp: 0.0,
        dco_env: default_dco_env(),
        dcw_env: make_env(
            &[
                (1.0, 80),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        dca_env: make_env(
            &[
                (1.0, 90),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (1.0, 99),
                (0.0, 60),
            ],
            1,
            8,
        ),
        ..LineParams::default()
    };
    p.chorus = ChorusParams {
        rate: 2.1,
        depth: 1.0,
        mix: 0.54,
    };
    p.delay = DelayParams {
        time: 0.3,
        feedback: 0.35,
        mix: 0.17,
    };
    p
}

/// Returns all 8 factory presets indexed 0..7
pub fn factory_presets() -> [(&'static str, SynthParams); 8] {
    [
        ("Wow", preset_wow()),
        ("Soft Piano", preset_soft_piano()),
        ("Retro", preset_retro()),
        ("Plucking", preset_plucking()),
        ("Clav", preset_clav()),
        ("Chants", preset_chants()),
        ("Bright Changes", preset_bright_changes()),
        ("Bliss", preset_bliss()),
    ]
}

// ─── AudioThread ─────────────────────────────────────────────────────────────

/// State that lives on the audio thread.
pub struct CzAudioThread {
    processor: Arc<Mutex<Cz101Processor>>,
}

impl AudioThread<CzPlugin> for CzAudioThread {
    fn process(&mut self, process: &mut Process) -> Result<Status, Error> {
        let nframes = process.frames_count() as usize;

        // Process MIDI/note and param events
        {
            let mut proc = self.processor.lock().unwrap();
            let in_events = process.in_events();
            for i in 0..in_events.size() {
                let header = in_events.get(i);

                // Param value events
                if let Ok(pv) = header.param_value() {
                    let pid: u32 = pv.param_id().into();
                    apply_param(&mut proc.params, pid, pv.value());
                }

                // CLAP native note events
                if let Ok(note) = header.note() {
                    let key = note.key() as u8;
                    let vel = note.velocity() as f32;
                    let freq = midi_note_to_freq(key);
                    match note.kind {
                        NoteKind::On => {
                            if vel > 0.0 {
                                proc.note_on(key, freq, vel);
                            } else {
                                proc.note_off(key);
                            }
                        }
                        NoteKind::Off | NoteKind::Choke | NoteKind::End => {
                            proc.note_off(key);
                        }
                    }
                }

                // Raw MIDI bytes (for hosts that prefer MIDI dialect)
                if let Ok(midi) = header.midi() {
                    let data = midi.data();
                    let status = data[0] & 0xF0;
                    let key = data[1];
                    let vel = data[2];
                    match status {
                        0x90 if vel > 0 => {
                            proc.note_on(key, midi_note_to_freq(key), vel as f32 / 127.0);
                        }
                        0x80 | 0x90 => {
                            proc.note_off(key);
                        }
                        0xB0 if key == 64 => {
                            proc.set_sustain(vel >= 64);
                        }
                        _ => {}
                    }
                }
            }
        }

        // Render audio into a mono buffer
        let mut buf = vec![0.0f32; nframes];
        {
            let mut proc = self.processor.lock().unwrap();
            proc.process(&mut buf);
        }

        // Write mono to stereo output port 0 (L + R identical)
        if process.audio_outputs_count() > 0 {
            let mut out = process.audio_outputs(0);
            let n_ch = out.channel_count();
            if n_ch >= 1 {
                out.data32(0)[..nframes].copy_from_slice(&buf);
            }
            if n_ch >= 2 {
                out.data32(1)[..nframes].copy_from_slice(&buf);
            }
        }

        Ok(Continue)
    }

    fn reset(&mut self) {}
}

// ─── Note ports extension ────────────────────────────────────────────────────

struct CzNotePorts;

impl NotePorts<CzPlugin> for CzNotePorts {
    fn count(_plugin: &CzPlugin, is_input: bool) -> u32 {
        if is_input {
            1
        } else {
            0
        }
    }

    fn get(_plugin: &CzPlugin, index: u32, is_input: bool) -> Option<NotePortInfo> {
        if index == 0 && is_input {
            Some(NotePortInfo {
                id: ClapId::from(0u16),
                name: "MIDI In".to_string(),
                supported_dialects: NoteDialect::all(),
                preferred_dialect: NoteDialect::Midi as u32,
            })
        } else {
            None
        }
    }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

/// Main plugin struct (lives on the main thread).
pub struct CzPlugin {
    /// Shadow copy of params for main-thread queries (get_value, flush_inactive).
    params: Arc<Mutex<SynthParams>>,
    _processor: Option<Arc<Mutex<Cz101Processor>>>,
}

impl Default for CzPlugin {
    fn default() -> Self {
        Self {
            params: Arc::new(Mutex::new(SynthParams::default())),
            _processor: None,
        }
    }
}

impl Extensions<CzPlugin> for CzPlugin {
    fn audio_ports() -> Option<impl AudioPorts<CzPlugin>> {
        Some(StereoPorts::<1, 1>)
    }

    fn note_ports() -> Option<impl NotePorts<CzPlugin>> {
        Some(CzNotePorts)
    }

    fn params() -> Option<impl Params<CzPlugin>> {
        Some(CzParams)
    }
}

impl Plugin for CzPlugin {
    type AudioThread = CzAudioThread;

    const ID: &'static str = "com.github.fpbrault.cz101-synth";
    const NAME: &'static str = "CZ-101 Phase Distortion";
    const VENDOR: &'static str = "Felix Perron-Brault";
    const URL: &'static str = "https://github.com/fpbrault/cz101-presets-library";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");
    const DESCRIPTION: &'static str = "Casio CZ-101 Phase Distortion synthesizer";

    fn features() -> impl Iterator<Item = &'static str> {
        "instrument synthesizer stereo".split_whitespace()
    }

    fn activate(
        &mut self,
        sample_rate: f64,
        _min_frames: u32,
        _max_frames: u32,
    ) -> Result<Self::AudioThread, Error> {
        // Clone current shadow params into processor
        let snap = self.params.lock().unwrap().clone();
        let mut proc = Cz101Processor::new(sample_rate as f32);
        proc.set_params(snap);
        let proc = Arc::new(Mutex::new(proc));
        self._processor = Some(Arc::clone(&proc));
        Ok(CzAudioThread { processor: proc })
    }
}

// ─── Entry + format exports ──────────────────────────────────────────────────

clap_clap::entry!(CzPlugin);
clap_wrapper::export_vst3!();
clap_wrapper::export_auv2!();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// MIDI note number → frequency (Hz)
#[inline]
fn midi_note_to_freq(note: u8) -> f32 {
    440.0 * libm::powf(2.0, (note as f32 - 69.0) / 12.0)
}
