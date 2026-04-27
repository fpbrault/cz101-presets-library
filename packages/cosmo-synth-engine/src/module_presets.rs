use crate::params::{LfoWaveform, SynthParams};

pub fn apply_module_preset(params: &mut SynthParams, module: &str, preset: &str) -> bool {
    match module {
        "chorus" => apply_chorus_preset(params, preset),
        "delay" => apply_delay_preset(params, preset),
        "reverb" => apply_reverb_preset(params, preset),
        "phaser" => apply_phaser_preset(params, preset),
        "vibrato" => apply_vibrato_preset(params, preset),
        "phaseMod" => apply_phase_mod_preset(params, preset),
        "lfo1" => apply_lfo_preset(params, preset, false),
        "lfo2" => apply_lfo_preset(params, preset, true),
        "modEnv" => apply_mod_env_preset(params, preset),
        _ => false,
    }
}

fn apply_chorus_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "classicWide" => {
            params.chorus.enabled = true;
            params.chorus.rate = 0.9;
            params.chorus.depth = 1.2;
            params.chorus.mix = 0.38;
            true
        }
        "slowShimmer" => {
            params.chorus.enabled = true;
            params.chorus.rate = 0.35;
            params.chorus.depth = 2.1;
            params.chorus.mix = 0.44;
            true
        }
        "ensembleThick" => {
            params.chorus.enabled = true;
            params.chorus.rate = 1.8;
            params.chorus.depth = 2.6;
            params.chorus.mix = 0.56;
            true
        }
        _ => false,
    }
}

fn apply_delay_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "digitalSlap" => {
            params.delay.enabled = true;
            params.delay.time = 0.11;
            params.delay.feedback = 0.22;
            params.delay.mix = 0.27;
            params.delay.tape_mode = false;
            params.delay.warmth = 0.2;
            true
        }
        "tapeEcho" => {
            params.delay.enabled = true;
            params.delay.time = 0.34;
            params.delay.feedback = 0.46;
            params.delay.mix = 0.35;
            params.delay.tape_mode = true;
            params.delay.warmth = 0.72;
            true
        }
        "dubFeedback" => {
            params.delay.enabled = true;
            params.delay.time = 0.52;
            params.delay.feedback = 0.68;
            params.delay.mix = 0.4;
            params.delay.tape_mode = true;
            params.delay.warmth = 0.55;
            true
        }
        _ => false,
    }
}

fn apply_reverb_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "smallRoom" => {
            params.reverb.enabled = true;
            params.reverb.mix = 0.22;
            params.reverb.space = 0.32;
            params.reverb.predelay = 0.006;
            params.reverb.distance = 0.28;
            params.reverb.character = 0.45;
            true
        }
        "plateAir" => {
            params.reverb.enabled = true;
            params.reverb.mix = 0.31;
            params.reverb.space = 0.58;
            params.reverb.predelay = 0.012;
            params.reverb.distance = 0.4;
            params.reverb.character = 0.74;
            true
        }
        "cathedral" => {
            params.reverb.enabled = true;
            params.reverb.mix = 0.47;
            params.reverb.space = 0.9;
            params.reverb.predelay = 0.03;
            params.reverb.distance = 0.68;
            params.reverb.character = 0.66;
            true
        }
        _ => false,
    }
}

fn apply_phaser_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "gentleSweep" => {
            params.phaser.enabled = true;
            params.phaser.rate = 0.35;
            params.phaser.depth = 0.45;
            params.phaser.feedback = 0.2;
            params.phaser.mix = 0.25;
            true
        }
        "jetWash" => {
            params.phaser.enabled = true;
            params.phaser.rate = 0.9;
            params.phaser.depth = 0.78;
            params.phaser.feedback = 0.55;
            params.phaser.mix = 0.43;
            true
        }
        "wideNotch" => {
            params.phaser.enabled = true;
            params.phaser.rate = 0.18;
            params.phaser.depth = 1.0;
            params.phaser.feedback = 0.72;
            params.phaser.mix = 0.52;
            true
        }
        _ => false,
    }
}

fn apply_vibrato_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "subtle" => {
            params.vibrato.enabled = true;
            params.vibrato.waveform = 1;
            params.vibrato.rate = 20.0;
            params.vibrato.depth = 6.0;
            params.vibrato.delay = 160.0;
            true
        }
        "chorused" => {
            params.vibrato.enabled = true;
            params.vibrato.waveform = 2;
            params.vibrato.rate = 38.0;
            params.vibrato.depth = 14.0;
            params.vibrato.delay = 80.0;
            true
        }
        "warble" => {
            params.vibrato.enabled = true;
            params.vibrato.waveform = 4;
            params.vibrato.rate = 62.0;
            params.vibrato.depth = 26.0;
            params.vibrato.delay = 20.0;
            true
        }
        _ => false,
    }
}

fn apply_phase_mod_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "glassBell" => {
            params.int_pm_enabled = true;
            params.pm_pre = true;
            params.int_pm_amount = 0.06;
            params.int_pm_ratio = 2.0;
            true
        }
        "metalFold" => {
            params.int_pm_enabled = true;
            params.pm_pre = true;
            params.int_pm_amount = 0.11;
            params.int_pm_ratio = 2.7;
            true
        }
        "aggressiveSync" => {
            params.int_pm_enabled = true;
            params.pm_pre = false;
            params.int_pm_amount = 0.18;
            params.int_pm_ratio = 3.4;
            true
        }
        _ => false,
    }
}

fn apply_lfo_preset(params: &mut SynthParams, preset: &str, secondary: bool) -> bool {
    let lfo = if secondary {
        &mut params.lfo2
    } else {
        &mut params.lfo
    };

    match preset {
        "slowSine" => {
            lfo.waveform = LfoWaveform::Sine;
            lfo.rate = 0.6;
            lfo.depth = 0.23;
            lfo.symmetry = 0.5;
            lfo.retrigger = false;
            lfo.offset = 0.0;
            true
        }
        "tempoTri" => {
            lfo.waveform = LfoWaveform::Triangle;
            lfo.rate = 2.25;
            lfo.depth = 0.48;
            lfo.symmetry = 0.5;
            lfo.retrigger = true;
            lfo.offset = 0.0;
            true
        }
        "randomDrift" => {
            lfo.waveform = LfoWaveform::Random;
            lfo.rate = 4.4;
            lfo.depth = 0.36;
            lfo.symmetry = 0.5;
            lfo.retrigger = false;
            lfo.offset = 0.0;
            true
        }
        _ => false,
    }
}

fn apply_mod_env_preset(params: &mut SynthParams, preset: &str) -> bool {
    match preset {
        "pluck" => {
            params.mod_env.attack = 0.005;
            params.mod_env.decay = 0.16;
            params.mod_env.sustain = 0.08;
            params.mod_env.release = 0.14;
            true
        }
        "pad" => {
            params.mod_env.attack = 0.7;
            params.mod_env.decay = 1.2;
            params.mod_env.sustain = 0.75;
            params.mod_env.release = 1.5;
            true
        }
        "reverseSwell" => {
            params.mod_env.attack = 1.8;
            params.mod_env.decay = 0.28;
            params.mod_env.sustain = 0.66;
            params.mod_env.release = 0.95;
            true
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_known_presets() {
        let mut params = SynthParams::default();

        assert!(apply_module_preset(&mut params, "chorus", "classicWide"));
        assert!(params.chorus.enabled);

        assert!(apply_module_preset(&mut params, "delay", "tapeEcho"));
        assert!(params.delay.tape_mode);

        assert!(apply_module_preset(&mut params, "reverb", "cathedral"));
        assert!(params.reverb.mix > 0.4);

        assert!(apply_module_preset(&mut params, "phaser", "wideNotch"));
        assert!(params.phaser.depth > 0.9);

        assert!(apply_module_preset(&mut params, "vibrato", "warble"));
        assert_eq!(params.vibrato.waveform, 4);

        assert!(apply_module_preset(&mut params, "phaseMod", "metalFold"));
        assert!(params.int_pm_enabled);

        assert!(apply_module_preset(&mut params, "lfo1", "randomDrift"));
        assert_eq!(params.lfo.waveform, LfoWaveform::Random);

        assert!(apply_module_preset(&mut params, "lfo2", "tempoTri"));
        assert_eq!(params.lfo2.waveform, LfoWaveform::Triangle);

        assert!(apply_module_preset(&mut params, "modEnv", "pad"));
        assert!(params.mod_env.sustain > 0.7);
    }

    #[test]
    fn rejects_unknown_module_or_preset() {
        let mut params = SynthParams::default();
        assert!(!apply_module_preset(&mut params, "unknown", "x"));
        assert!(!apply_module_preset(&mut params, "chorus", "unknown"));
    }
}
