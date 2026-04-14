//! CZ-101 Phase Distortion synthesizer — CLAP/VST3/AUv2 plugin
//!
//! Uses clack-plugin for the CLAP plugin interface and clap-wrapper for VST3/AUv2 export.
//! The DSP engine lives in the `cz-synth` crate.

mod gui;

use clack_extensions::audio_ports::*;
use clack_extensions::gui::*;
use clack_extensions::note_ports::*;
use clack_extensions::params::*;
use clack_plugin::events::spaces::CoreEventSpace;
use clack_plugin::plugin::features::*;
use clack_plugin::prelude::*;
use crossbeam::channel::{Receiver, Sender};
use cz_synth::params::{
    ChorusParams, DelayParams, FilterParams, FilterType, LfoParams, LfoTarget, LfoWaveform,
    LineParams, LineSelect, ModMode, PolyMode, PortamentoMode, ReverbParams, StepEnvData,
    SynthParams, VelocityTarget, VibratoParams, WarpAlgo, WaveformId,
};
use cz_synth::processor::Cz101Processor;
use std::fmt::Write as FmtWrite;
use std::io::Write as _;
use std::sync::{Arc, Mutex};

// ─── Window handle bridge ─────────────────────────────────────────────────────
//
// clack-extensions (with raw-window-handle_06 feature) implements the
// *deprecated* HasRawWindowHandle trait from rwh 0.6, but wry 0.51 requires the
// newer HasWindowHandle trait.  This thin wrapper converts between the two.

#[allow(deprecated)]
struct RwhBridge(raw_window_handle::RawWindowHandle);

#[allow(deprecated)]
impl raw_window_handle::HasWindowHandle for RwhBridge {
    fn window_handle(
        &self,
    ) -> Result<raw_window_handle::WindowHandle<'_>, raw_window_handle::HandleError> {
        // SAFETY: The clack Window guarantees the handle is valid for the
        //         lifetime of the GUI (until destroy() is called).
        unsafe { Ok(raw_window_handle::WindowHandle::borrow_raw(self.0)) }
    }
}

// ─── Plugin logging ───────────────────────────────────────────────────────────
//
// In a DAW plugin process stdout/stderr go nowhere.  All diagnostic output is
// appended to /tmp/cz101-plugin.log so it survives DAW crashes and can be
// tailed in a terminal while the DAW is running:
//
//   tail -f /tmp/cz101-plugin.log
//
// Usage inside the plugin:
//   plugin_log!("GUI opened at {}x{}", w, h);

const LOG_PATH: &str = "/tmp/cz101-plugin.log";

macro_rules! plugin_log {
    ($($arg:tt)*) => {{
        crate::append_log(&format!($($arg)*));
    }};
}

fn append_log(msg: &str) {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(LOG_PATH)
    {
        let _ = writeln!(f, "[{ts}] cz101-plugin: {msg}");
    }
}

/// Install a panic hook that writes the panic info to the log file instead of
/// unwinding into the DAW process and triggering a silent crash or hang.
fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let location = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown location".into());
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "non-string panic payload".into()
        };
        append_log(&format!("PANIC at {location}: {payload}"));
    }));
}

// ─── Custom protocol helpers ─────────────────────────────────────────────────

/// Simple percent-decoder for URI path segments.
/// Handles the common cases (%20, %2F, etc.) without pulling in a full URL library.
fn percent_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (
                (bytes[i + 1] as char).to_digit(16),
                (bytes[i + 2] as char).to_digit(16),
            ) {
                out.push((h * 16 + l) as u8 as char);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

/// Return a MIME type string based on the file extension.
fn mime_for_path(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") | Some("mjs") => "application/javascript",
        Some("css") => "text/css",
        Some("json") => "application/json",
        Some("wasm") => "application/wasm",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("svg") => "image/svg+xml",
        Some("ico") => "image/x-icon",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("ttf") => "font/ttf",
        _ => "application/octet-stream",
    }
}

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
const P_L1_WARP_ALGO2: u32 = 111;

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
const P_L2_WARP_ALGO2: u32 = 211;

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
    ParamDef {
        id: P_L1_WARP_ALGO2,
        name: "Warp Algo 2",
        module: "Line 1",
        min: -1.0,
        max: 13.0,
        default: -1.0,
        stepped: true,
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
    ParamDef {
        id: P_L2_WARP_ALGO2,
        name: "Warp Algo 2",
        module: "Line 2",
        min: -1.0,
        max: 13.0,
        default: -1.0,
        stepped: true,
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
        P_L1_WARP_ALGO2 => match params.line1.algo2 {
            None => -1.0,
            Some(a) => warp_algo_to_f64(a),
        },
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
        P_L2_WARP_ALGO2 => match params.line2.algo2 {
            None => -1.0,
            Some(a) => warp_algo_to_f64(a),
        },
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
        P_CHO_DEPTH => (params.chorus.depth as f64) * 1000.0,
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
        P_L1_WARP_ALGO2 => {
            params.line1.algo2 = if v < 0.0 {
                None
            } else {
                Some(f64_to_warp_algo(v))
            };
        }
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
        P_L2_WARP_ALGO2 => {
            params.line2.algo2 = if v < 0.0 {
                None
            } else {
                Some(f64_to_warp_algo(v))
            };
        }
        // Vibrato
        P_VIB_ENABLED => params.vibrato.enabled = v >= 0.5,
        P_VIB_WAVEFORM => params.vibrato.waveform = v as u8,
        P_VIB_RATE => params.vibrato.rate = v as f32,
        P_VIB_DEPTH => params.vibrato.depth = v as f32,
        P_VIB_DELAY => params.vibrato.delay = v as f32,
        // Chorus
        P_CHO_MIX => params.chorus.mix = v as f32,
        P_CHO_RATE => params.chorus.rate = v as f32,
        // The UI stores chorus depth in ms-scale (0-20 range); the Rust fx.rs
        // expects a fractional seconds value (same as the web AudioWorklet which
        // divides by 1000 before passing to the worklet).
        P_CHO_DEPTH => params.chorus.depth = (v / 1000.0) as f32,
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

/// Apply a step envelope update from the GUI IPC.
/// `id` is one of: "l1_dco", "l1_dcw", "l1_dca", "l2_dco", "l2_dcw", "l2_dca"
fn apply_envelope(params: &mut SynthParams, id: &str, env: cz_synth::params::StepEnvData) {
    match id {
        "l1_dco" => params.line1.dco_env = env,
        "l1_dcw" => params.line1.dcw_env = env,
        "l1_dca" => params.line1.dca_env = env,
        "l2_dco" => params.line2.dco_env = env,
        "l2_dcw" => params.line2.dcw_env = env,
        "l2_dca" => params.line2.dca_env = env,
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

// ─── Helper name functions ─────────────────────────────────────────────────

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

// ─── Shared state ─────────────────────────────────────────────────────────────

/// Capacity of the scope ring buffer (samples).  At 44.1 kHz this is ~186 ms.
const SCOPE_BUF_CAP: usize = 8192;
/// Target push interval for scope data: 33 ms ≈ 30 fps.
const SCOPE_PUSH_INTERVAL_MS: u128 = 33;

/// State shared between the main thread, audio thread, and GUI.
pub struct CzShared {
    /// Shadow copy of params for main-thread queries (get_value, flush).
    /// The audio thread has its own copy inside `Cz101Processor`.
    params: Mutex<SynthParams>,
    /// IPC channel: messages from the WebView GUI are sent here.
    ipc_sender: Sender<serde_json::Value>,
    ipc_receiver: Receiver<serde_json::Value>,
    /// Calls `host->request_callback()` — used by the IPC thread to schedule
    /// `on_main_thread()` after a GUI parameter change.
    request_callback: Arc<dyn Fn() + Send + Sync>,
    /// Ring buffer of PCM samples captured in process() for the oscilloscope.
    /// The audio thread appends here; on_main_thread() drains and pushes to JS.
    scope_buf: Mutex<Vec<f32>>,
    /// Timestamp of the last scope data push to the WebView.
    scope_last_push: Mutex<std::time::Instant>,
    /// Timestamp of the last request_callback() call for scope scheduling.
    /// Tracked on the audio thread to throttle how often we wake the main thread.
    scope_request_last: Mutex<std::time::Instant>,
    /// Sample rate set during activate(); 0.0 means not yet activated.
    scope_sample_rate: Mutex<f32>,
    /// Frequency (Hz) of the most recently active voice, for scope cycles math.
    scope_active_hz: Mutex<f32>,
}

impl PluginShared<'_> for CzShared {}

// ─── Main thread ──────────────────────────────────────────────────────────────

pub struct CzMainThread<'a> {
    shared: &'a CzShared,
    gui: gui::CzGui,
    /// The active audio processor (shared Arc so flush can reach it).
    processor: Option<Arc<Mutex<Cz101Processor>>>,
}

impl<'a> PluginMainThread<'a, CzShared> for CzMainThread<'a> {
    fn on_main_thread(&mut self) {
        // Drain IPC messages from the GUI and apply them to the shadow params.
        while let Ok(msg) = self.shared.ipc_receiver.try_recv() {
            // ── Scalar param: {parameter_id: u64, value: f64} ──────────────
            if let (Some(pid), Some(val)) = (
                msg.get("parameter_id").and_then(|v| v.as_u64()),
                msg.get("value").and_then(|v| v.as_f64()),
            ) {
                {
                    let mut shadow = self.shared.params.lock().unwrap();
                    apply_param(&mut shadow, pid as u32, val);
                }
                if let Some(ref proc_arc) = self.processor {
                    if let Ok(mut proc) = proc_arc.lock() {
                        apply_param(&mut proc.params, pid as u32, val);
                        // FX chain must be re-synced when any FX param changes.
                        proc.update_fx();
                    }
                }
                continue;
            }

            // ── Envelope blob: {envelope_id: str, data: StepEnvData} ────────
            if let (Some(env_id), Some(data_val)) = (
                msg.get("envelope_id").and_then(|v| v.as_str()),
                msg.get("data"),
            ) {
                match serde_json::from_value::<cz_synth::params::StepEnvData>(data_val.clone()) {
                    Ok(env) => {
                        let mut shadow = self.shared.params.lock().unwrap();
                        apply_envelope(&mut shadow, env_id, env.clone());
                        drop(shadow);
                        if let Some(ref proc_arc) = self.processor {
                            if let Ok(mut proc) = proc_arc.lock() {
                                apply_envelope(&mut proc.params, env_id, env);
                            }
                        }
                    }
                    Err(e) => {
                        plugin_log!("on_main_thread: envelope parse error: {}", e);
                    }
                }
                continue;
            }

            plugin_log!("on_main_thread: unrecognised IPC message: {}", msg);
        }

        // ── Oscilloscope: push buffered PCM to the WebView ~30 fps ───────────
        if let Some(ref wv) = self.gui.web_view {
            let now = std::time::Instant::now();
            let should_push = {
                if let Ok(last) = self.shared.scope_last_push.try_lock() {
                    now.duration_since(*last).as_millis() >= SCOPE_PUSH_INTERVAL_MS
                } else {
                    false
                }
            };
            if should_push {
                // Drain the scope buffer under lock.
                let samples: Vec<f32> = {
                    if let Ok(mut scope) = self.shared.scope_buf.try_lock() {
                        let drained: Vec<f32> = scope.drain(..).collect();
                        drained
                    } else {
                        Vec::new()
                    }
                };
                if !samples.is_empty() {
                    // Encode as a compact JSON array of f32s.
                    // We send the full buffer (up to SCOPE_BUF_CAP) and let JS
                    // pick viewSamples via cycles math — no Rust-side decimation.
                    let json_vals: Vec<String> =
                        samples.iter().map(|v| format!("{:.4}", v)).collect();
                    let json_array = format!("[{}]", json_vals.join(","));
                    let sr = self
                        .shared
                        .scope_sample_rate
                        .try_lock()
                        .map(|g| *g)
                        .unwrap_or(44100.0);
                    let hz = self
                        .shared
                        .scope_active_hz
                        .try_lock()
                        .map(|g| *g)
                        .unwrap_or(220.0);
                    let js = format!(
                        "if(window.__czOnScope){{window.__czOnScope({json_array},{sr:.1},{hz:.4})}}"
                    );
                    let _ = wv.evaluate_script(&js);
                }
                // Update timestamp regardless (avoids hammering when silent).
                if let Ok(mut last) = self.shared.scope_last_push.try_lock() {
                    *last = now;
                }
            }
        }
    }
}

// ─── Audio processor ──────────────────────────────────────────────────────────

pub struct CzAudioProcessor<'a> {
    processor: Arc<Mutex<Cz101Processor>>,
    shared: &'a CzShared,
}

impl<'a> PluginAudioProcessor<'a, CzShared, CzMainThread<'a>> for CzAudioProcessor<'a> {
    fn activate(
        _host: HostAudioProcessorHandle<'a>,
        main_thread: &mut CzMainThread<'a>,
        shared: &'a CzShared,
        audio_config: PluginAudioConfiguration,
    ) -> Result<Self, PluginError> {
        plugin_log!("activate: sample_rate={}", audio_config.sample_rate);
        let snap = shared.params.lock().unwrap().clone();
        let mut proc = Cz101Processor::new(audio_config.sample_rate as f32);
        proc.set_params(snap);
        let proc = Arc::new(Mutex::new(proc));
        // Store sample rate for scope cycles math.
        if let Ok(mut sr) = shared.scope_sample_rate.try_lock() {
            *sr = audio_config.sample_rate as f32;
        }
        // Give main thread a handle so IPC-driven param changes reach the audio thread.
        main_thread.processor = Some(Arc::clone(&proc));
        Ok(Self {
            processor: proc,
            shared,
        })
    }

    fn process(
        &mut self,
        _process: Process,
        mut audio: Audio,
        events: Events,
    ) -> Result<ProcessStatus, PluginError> {
        let nframes = audio.frames_count() as usize;

        // Process events (params + MIDI/notes)
        {
            let mut proc = self.processor.lock().unwrap();
            for event in events.input {
                match event.as_core_event() {
                    Some(CoreEventSpace::ParamValue(pv)) => {
                        if let Some(pid) = pv.param_id().map(|id| id.get()) {
                            apply_param(&mut proc.params, pid, pv.value());
                            proc.update_fx();
                            // Keep shadow in sync.
                            if let Ok(mut shadow) = self.shared.params.try_lock() {
                                apply_param(&mut shadow, pid, pv.value());
                            }
                        }
                    }
                    Some(CoreEventSpace::NoteOn(note)) => {
                        let key = note.key().into_specific().unwrap_or(0) as u8;
                        let vel = note.velocity() as f32;
                        let freq = midi_note_to_freq(key);
                        if vel > 0.0 {
                            proc.note_on(key, freq, vel);
                        } else {
                            proc.note_off(key);
                        }
                    }
                    Some(CoreEventSpace::NoteOff(note)) => {
                        let key = note.key().into_specific().unwrap_or(0) as u8;
                        proc.note_off(key);
                    }
                    Some(CoreEventSpace::NoteChoke(note)) => {
                        let key = note.key().into_specific().unwrap_or(0) as u8;
                        proc.note_off(key);
                    }
                    Some(CoreEventSpace::Midi(midi_ev)) => {
                        let data = midi_ev.data();
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
                    _ => {}
                }
            }
        }

        // Render audio into a mono buffer
        let mut buf = vec![0.0f32; nframes];
        {
            let mut proc = self.processor.lock().unwrap();
            proc.process(&mut buf);
            // Track the frequency of the highest-amplitude active voice for scope.
            let active_hz = proc
                .voices
                .iter()
                .filter(|v| !v.is_silent && v.note.is_some())
                .map(|v| v.target_freq)
                .filter(|&f| f > 0.0)
                .fold(0.0f32, f32::max);
            if active_hz > 0.0 {
                if let Ok(mut hz) = self.shared.scope_active_hz.try_lock() {
                    *hz = active_hz;
                }
            }
        }

        // Feed rendered samples into the scope ring buffer for on_main_thread()
        // to push to the WebView oscilloscope.  We cap the buffer at SCOPE_BUF_CAP
        // to prevent unbounded growth if the main thread falls behind.
        if let Ok(mut scope) = self.shared.scope_buf.try_lock() {
            let remaining = SCOPE_BUF_CAP.saturating_sub(scope.len());
            let to_copy = buf.len().min(remaining);
            scope.extend_from_slice(&buf[..to_copy]);
        }

        // Request on_main_thread() ~30 fps so scope data is pushed to the WebView
        // even when no GUI IPC messages are in flight.
        {
            let now = std::time::Instant::now();
            let should_request = if let Ok(mut last) = self.shared.scope_request_last.try_lock() {
                if now.duration_since(*last).as_millis() >= SCOPE_PUSH_INTERVAL_MS {
                    *last = now;
                    true
                } else {
                    false
                }
            } else {
                false
            };
            if should_request {
                (self.shared.request_callback)();
            }
        }

        // Write mono to stereo output port 0 (L + R identical)
        if let Some(mut output_port) = audio.output_port(0) {
            if let Ok(channels) = output_port.channels() {
                if let Some(mut f32_channels) = channels.into_f32() {
                    for ch_idx in 0..f32_channels.channel_count() {
                        if let Some(ch) = f32_channels.channel_mut(ch_idx) {
                            ch[..nframes].copy_from_slice(&buf[..nframes]);
                        }
                    }
                }
            }
        }

        Ok(ProcessStatus::ContinueIfNotQuiet)
    }
}

// ─── Extension implementations (on CzMainThread) ─────────────────────────────

// Audio ports: stereo in + stereo out
impl PluginAudioPortsImpl for CzMainThread<'_> {
    fn count(&mut self, _is_input: bool) -> u32 {
        1
    }

    fn get(&mut self, index: u32, is_input: bool, writer: &mut AudioPortInfoWriter) {
        if index == 0 {
            writer.set(&AudioPortInfo {
                id: ClapId::new(if is_input { 0 } else { 1 }),
                name: b"main",
                channel_count: 2,
                flags: AudioPortFlags::IS_MAIN,
                port_type: Some(AudioPortType::STEREO),
                in_place_pair: None,
            });
        }
    }
}

// Note ports: one MIDI input
impl PluginNotePortsImpl for CzMainThread<'_> {
    fn count(&mut self, is_input: bool) -> u32 {
        if is_input {
            1
        } else {
            0
        }
    }

    fn get(&mut self, index: u32, is_input: bool, writer: &mut NotePortInfoWriter) {
        if is_input && index == 0 {
            writer.set(&NotePortInfo {
                id: ClapId::new(0),
                name: b"MIDI In",
                preferred_dialect: Some(NoteDialect::Midi),
                supported_dialects: NoteDialects::CLAP | NoteDialects::MIDI,
            });
        }
    }
}

// Params
impl PluginMainThreadParams for CzMainThread<'_> {
    fn count(&mut self) -> u32 {
        PARAM_TABLE.len() as u32
    }

    fn get_info(&mut self, param_index: u32, info: &mut ParamInfoWriter) {
        let Some(def) = PARAM_TABLE.get(param_index as usize) else {
            return;
        };
        let mut flags = ParamInfoFlags::IS_AUTOMATABLE;
        if def.stepped {
            flags |= ParamInfoFlags::IS_STEPPED;
        }
        info.set(&ParamInfo {
            id: ClapId::new(def.id),
            flags,
            cookie: Default::default(),
            name: def.name.as_bytes(),
            module: def.module.as_bytes(),
            min_value: def.min,
            max_value: def.max,
            default_value: def.default,
        });
    }

    fn get_value(&mut self, param_id: ClapId) -> Option<f64> {
        let pid = param_id.get();
        let params = self.shared.params.lock().ok()?;
        read_param(&params, pid)
    }

    fn value_to_text(
        &mut self,
        param_id: ClapId,
        value: f64,
        writer: &mut ParamDisplayWriter,
    ) -> std::fmt::Result {
        let pid = param_id.get();
        match pid {
            P_LINE_SELECT => write!(
                writer,
                "{}",
                match value as u32 {
                    0 => "L1+L2",
                    1 => "L1",
                    2 => "L2",
                    3 => "L1+L1'",
                    4 => "L1+L2'",
                    _ => "?",
                }
            ),
            P_MOD_MODE => write!(
                writer,
                "{}",
                match value as u32 {
                    0 => "Normal",
                    1 => "Ring",
                    2 => "Noise",
                    _ => "?",
                }
            ),
            P_POLY_MODE => write!(writer, "{}", if value >= 0.5 { "Mono" } else { "Poly8" }),
            P_VEL_TARGET => write!(
                writer,
                "{}",
                match value as u32 {
                    0 => "Amp",
                    1 => "DCW",
                    2 => "Both",
                    3 => "Off",
                    _ => "?",
                }
            ),
            P_L1_WARP_ALGO | P_L2_WARP_ALGO => {
                write!(writer, "{}", warp_algo_name(value as u32))
            }
            P_LFO_WAVEFORM => write!(
                writer,
                "{}",
                match value as u32 {
                    0 => "Sine",
                    1 => "Triangle",
                    2 => "Square",
                    3 => "Saw",
                    _ => "?",
                }
            ),
            P_LFO_TARGET => write!(
                writer,
                "{}",
                match value as u32 {
                    0 => "Pitch",
                    1 => "DCW",
                    2 => "DCA",
                    3 => "Filter",
                    _ => "?",
                }
            ),
            P_FIL_TYPE => write!(
                writer,
                "{}",
                match value as u32 {
                    0 => "LP",
                    1 => "HP",
                    2 => "BP",
                    _ => "?",
                }
            ),
            P_PORT_MODE => write!(writer, "{}", if value >= 0.5 { "Time" } else { "Rate" }),
            P_LEGATO | P_PM_PRE | P_VIB_ENABLED | P_LFO_ENABLED | P_FIL_ENABLED
            | P_PORT_ENABLED => {
                write!(writer, "{}", if value >= 0.5 { "On" } else { "Off" })
            }
            P_L1_WAVEFORM | P_L2_WAVEFORM => write!(writer, "{}", waveform_name(value as u8)),
            P_VIB_WAVEFORM => write!(
                writer,
                "{}",
                match value as u32 {
                    1 => "Sine",
                    2 => "Triangle",
                    3 => "Square",
                    4 => "Saw",
                    _ => "?",
                }
            ),
            _ => write!(writer, "{:.3}", value),
        }
    }

    fn text_to_value(&mut self, _param_id: ClapId, text: &std::ffi::CStr) -> Option<f64> {
        text.to_str().ok()?.parse::<f64>().ok()
    }

    fn flush(
        &mut self,
        input_parameter_changes: &InputEvents,
        _output_parameter_changes: &mut OutputEvents,
    ) {
        let mut shadow = self.shared.params.lock().unwrap();
        for event in input_parameter_changes {
            if let Some(CoreEventSpace::ParamValue(pv)) = event.as_core_event() {
                if let Some(pid) = pv.param_id().map(|id| id.get()) {
                    apply_param(&mut shadow, pid, pv.value());
                }
            }
        }
    }
}

// AudioProcessor-side params flush (when audio thread is active)
impl PluginAudioProcessorParams for CzAudioProcessor<'_> {
    fn flush(
        &mut self,
        input_parameter_changes: &InputEvents,
        _output_parameter_changes: &mut OutputEvents,
    ) {
        let mut proc = self.processor.lock().unwrap();
        for event in input_parameter_changes {
            if let Some(CoreEventSpace::ParamValue(pv)) = event.as_core_event() {
                if let Some(pid) = pv.param_id().map(|id| id.get()) {
                    apply_param(&mut proc.params, pid, pv.value());
                }
            }
        }
    }
}

// GUI
impl PluginGuiImpl for CzMainThread<'_> {
    fn is_api_supported(&mut self, configuration: GuiConfiguration) -> bool {
        !configuration.is_floating
            && GuiApiType::default_for_current_platform()
                .map(|api| api == configuration.api_type)
                .unwrap_or(false)
    }

    fn get_preferred_api(&mut self) -> Option<GuiConfiguration<'_>> {
        Some(GuiConfiguration {
            api_type: GuiApiType::default_for_current_platform()?,
            is_floating: false,
        })
    }

    fn create(&mut self, _configuration: GuiConfiguration) -> Result<(), PluginError> {
        Ok(())
    }

    fn destroy(&mut self) {
        self.gui.web_view.take();
        self.gui.pending_ns_view = None;
    }

    fn set_scale(&mut self, scale: f64) -> Result<(), PluginError> {
        self.gui.scale_factor = scale;
        Ok(())
    }

    fn get_size(&mut self) -> Option<GuiSize> {
        Some(GuiSize {
            width: self.gui.size.width as u32,
            height: self.gui.size.height as u32,
        })
    }

    fn can_resize(&mut self) -> bool {
        true
    }

    fn get_resize_hints(&mut self) -> Option<GuiResizeHints> {
        Some(GuiResizeHints {
            can_resize_horizontally: true,
            can_resize_vertically: true,
            strategy: AspectRatioStrategy::Disregard,
        })
    }

    fn adjust_size(&mut self, size: GuiSize) -> Option<GuiSize> {
        Some(GuiSize {
            width: size.width.clamp(gui::MIN_WIDTH, gui::MAX_WIDTH),
            height: size.height.clamp(gui::MIN_HEIGHT, gui::MAX_HEIGHT),
        })
    }

    fn set_size(&mut self, size: GuiSize) -> Result<(), PluginError> {
        self.gui.size = wry::dpi::LogicalSize {
            width: size.width as f64,
            height: size.height as f64,
        };
        if let Some(ref wv) = self.gui.web_view {
            let _ = wv.set_bounds(wry::Rect {
                position: wry::dpi::LogicalPosition::new(0.0, 0.0).into(),
                size: wry::dpi::LogicalSize::new(size.width as f64, size.height as f64).into(),
            });
        }
        Ok(())
    }

    fn set_parent(&mut self, window: Window) -> Result<(), PluginError> {
        plugin_log!(
            "set_parent: {}x{}",
            self.gui.size.width,
            self.gui.size.height
        );

        // Extract the NSView pointer and store it for deferred use in show().
        // We cannot build the WebView here because the NSView isn't yet attached
        // to an NSWindow (ns_view.window() is None), which causes wry to panic.
        #[allow(deprecated)]
        use raw_window_handle::HasRawWindowHandle as _;
        #[allow(deprecated)]
        let raw = window
            .raw_window_handle()
            .map_err(|_| PluginError::Message("Unsupported window API"))?;

        #[allow(deprecated)]
        let ns_view_ptr = match raw {
            raw_window_handle::RawWindowHandle::AppKit(h) => {
                h.ns_view.as_ptr() as *mut std::ffi::c_void
            }
            _ => return Err(PluginError::Message("Expected AppKit window handle")),
        };

        self.gui.pending_ns_view = Some(ns_view_ptr);
        Ok(())
    }

    fn set_transient(&mut self, _window: Window) -> Result<(), PluginError> {
        Ok(())
    }

    fn show(&mut self) -> Result<(), PluginError> {
        // If we have a pending parent NSView and no WebView yet, build it now.
        // At show() time the view should be attached to an NSWindow.
        if self.gui.web_view.is_none() {
            if let Some(ns_view_ptr) = self.gui.pending_ns_view {
                plugin_log!("show: building WebView for parent NSView {:?}", ns_view_ptr);
                let ipc_sender = self.shared.ipc_sender.clone();
                // Clone the request_callback Arc so the IPC closure (background thread)
                // can schedule on_main_thread() after each param message.
                let request_cb = self.shared.request_callback.clone();
                let size = self.gui.size;

                // Reconstruct the RawWindowHandle from the stored pointer.
                #[allow(deprecated)]
                let raw = {
                    use raw_window_handle::AppKitWindowHandle;
                    let ptr = std::ptr::NonNull::new(ns_view_ptr)
                        .ok_or(PluginError::Message("null NSView pointer"))?;
                    #[allow(deprecated)]
                    raw_window_handle::RawWindowHandle::AppKit(AppKitWindowHandle::new(ptr))
                };
                let bridge = RwhBridge(raw);

                use wry::WebViewBuilder;

                // Use a custom protocol ("cz://") to serve the React bundle from
                // the bundle's Resources/ui/ directory.  This avoids all file://
                // cross-origin security restrictions that WKWebView imposes.
                let resource_dir = gui::plugin_resource_dir();
                let resource_dir_clone = resource_dir.clone();

                match WebViewBuilder::new()
                    .with_custom_protocol("cz".into(), move |_webview_id, req| {
                        // Strip the cz://localhost/ prefix to get a relative path.
                        let path_str = req.uri().path().trim_start_matches('/');
                        // Decode %20 etc. (simple decoder for common cases).
                        let decoded = percent_decode(path_str);
                        // Resolve against the resource directory.
                        let full_path = if let Some(ref dir) = resource_dir_clone {
                            dir.join(&decoded)
                        } else {
                            std::path::PathBuf::from(&decoded)
                        };
                        match std::fs::read(&full_path) {
                            Ok(bytes) => {
                                let mime = mime_for_path(&full_path);
                                let body: std::borrow::Cow<'static, [u8]> =
                                    std::borrow::Cow::Owned(bytes);
                                wry::http::Response::builder()
                                    .header("Content-Type", mime)
                                    .header("Access-Control-Allow-Origin", "*")
                                    .body(body)
                                    .unwrap_or_else(|_| {
                                        wry::http::Response::builder()
                                            .status(500)
                                            .body(std::borrow::Cow::Owned(Vec::<u8>::new()))
                                            .unwrap()
                                    })
                            }
                            Err(_) => {
                                plugin_log!("custom_protocol: 404 {}", full_path.display());
                                wry::http::Response::builder()
                                    .status(404)
                                    .body(std::borrow::Cow::Owned(Vec::<u8>::new()))
                                    .unwrap()
                            }
                        }
                    })
                    .with_url("cz://localhost/plugin.html")
                    .with_ipc_handler(move |req: wry::http::Request<String>| {
                        let body = req.into_body();
                        append_log(&format!("ipc_handler: raw body = {body}"));
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&body) {
                            let _ = ipc_sender.send(val);
                            // Tell the host to schedule on_main_thread() so the
                            // param change is applied on the correct thread.
                            request_cb();
                        } else {
                            append_log(&format!("ipc_handler: JSON parse failed for: {body}"));
                        }
                    })
                    .with_initialization_script(r#"
                        // Diagnostic: confirm window.ipc availability after page load
                        window.addEventListener('load', function() {
                            if (window.ipc) {
                                window.ipc.postMessage(JSON.stringify({__diag: "ipc_ready"}));
                            } else {
                                // window.ipc not available - try webkit handler directly
                                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ipc) {
                                    window.webkit.messageHandlers.ipc.postMessage(JSON.stringify({__diag: "webkit_ipc_ready"}));
                                }
                            }
                        });
                    "#)
                    .with_bounds(wry::Rect {
                        position: wry::dpi::LogicalPosition::new(0.0, 0.0).into(),
                        size: wry::dpi::LogicalSize::new(size.width, size.height).into(),
                    })
                    .build_as_child(&bridge)
                {
                    Ok(wv) => {
                        plugin_log!("show: WebView created successfully");
                        self.gui.web_view = Some(wv);
                    }
                    Err(e) => {
                        plugin_log!("show: WebView build error: {e}");
                        // Don't return an error — some hosts call show() before the
                        // view is in a window; a blank GUI is better than a crash.
                    }
                }
            }
        }
        Ok(())
    }

    fn hide(&mut self) -> Result<(), PluginError> {
        Ok(())
    }
}

// ─── Plugin struct ────────────────────────────────────────────────────────────

pub struct CzPlugin;

impl Plugin for CzPlugin {
    type AudioProcessor<'a> = CzAudioProcessor<'a>;
    type Shared<'a> = CzShared;
    type MainThread<'a> = CzMainThread<'a>;

    fn declare_extensions(builder: &mut PluginExtensions<Self>, _shared: Option<&CzShared>) {
        builder
            .register::<PluginAudioPorts>()
            .register::<PluginNotePorts>()
            .register::<PluginParams>()
            .register::<PluginGui>();
    }
}

impl DefaultPluginFactory for CzPlugin {
    fn get_descriptor() -> PluginDescriptor {
        PluginDescriptor::new("com.github.fpbrault.cz101-synth", "CZ-101 Phase Distortion")
            .with_vendor("Felix Perron-Brault")
            .with_features([SYNTHESIZER, STEREO, INSTRUMENT])
    }

    fn new_shared(host: HostSharedHandle) -> Result<CzShared, PluginError> {
        install_panic_hook();
        plugin_log!("CzPlugin created (version {})", env!("CARGO_PKG_VERSION"));
        let (ipc_sender, ipc_receiver) = crossbeam::channel::unbounded();

        // Store as usize (Send+Sync) so the closure can cross thread boundaries.
        // SAFETY: clap_host::request_callback is documented as thread-safe per
        // the CLAP spec, and the host pointer is valid for the plugin lifetime.
        let raw_host_usize: usize = host.as_raw() as *const _ as usize;
        let request_callback: Arc<dyn Fn() + Send + Sync> = Arc::new(move || {
            let ptr = raw_host_usize as *const clap_sys::host::clap_host;
            unsafe {
                if let Some(cb) = (*ptr).request_callback {
                    cb(ptr as *mut _);
                }
            }
        });

        Ok(CzShared {
            params: Mutex::new(SynthParams::default()),
            ipc_sender,
            ipc_receiver,
            request_callback,
            scope_buf: Mutex::new(Vec::with_capacity(SCOPE_BUF_CAP)),
            scope_last_push: Mutex::new(std::time::Instant::now()),
            scope_request_last: Mutex::new(std::time::Instant::now()),
            scope_sample_rate: Mutex::new(44100.0),
            scope_active_hz: Mutex::new(220.0),
        })
    }

    fn new_main_thread<'a>(
        _host: HostMainThreadHandle<'a>,
        shared: &'a CzShared,
    ) -> Result<CzMainThread<'a>, PluginError> {
        Ok(CzMainThread {
            shared,
            gui: gui::CzGui::new(),
            processor: None,
        })
    }
}

// ─── Entry + format exports ──────────────────────────────────────────────────

clack_export_entry!(SinglePluginEntry<CzPlugin>);
clap_wrapper::export_vst3!();
clap_wrapper::export_auv2!();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// MIDI note number → frequency (Hz)
#[inline]
fn midi_note_to_freq(note: u8) -> f32 {
    440.0 * libm::powf(2.0, (note as f32 - 69.0) / 12.0)
}
