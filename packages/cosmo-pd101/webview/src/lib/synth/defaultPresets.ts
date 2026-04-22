import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";

/**
 * Built-in factory presets for the CZ-101 PD synthesizer lab.
 * Converted to canonical SynthPresetV1 format.
 */
export const DEFAULT_SYNTH_PRESETS: Record<string, SynthPresetV1> = {
  "Wow": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1+L2",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "sync",
        "algo2": null,
        "algoBlend": 0.015,
        "dcwComp": 0.5408333333333334,
        "window": "off",
        "dcaBase": 0.9375,
        "dcwBase": 0.96875,
        "dcoDepth": 12,
        "modulation": 0,
        "detuneCents": 4,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 0.7482429786659466,
              "rate": 43.25
            },
            {
              "level": 0.31875,
              "rate": 28.5625
            },
            {
              "level": 0.25,
              "rate": 7.7375
            },
            {
              "level": 0,
              "rate": 14.475
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.749392384553065,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 47.125
            },
            {
              "level": 1,
              "rate": 48.1625
            },
            {
              "level": 1,
              "rate": 24.275
            },
            {
              "level": 0,
              "rate": 42.0375
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "sinePulse",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 0.98,
        "dcwBase": 1,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 12,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 0.7482429786659466,
              "rate": 43.25
            },
            {
              "level": 0.31875,
              "rate": 28.5625
            },
            {
              "level": 0.25,
              "rate": 7.7375
            },
            {
              "level": 0,
              "rate": 14.475
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.749392384553065,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 47.125
            },
            {
              "level": 1,
              "rate": 48.1625
            },
            {
              "level": 1,
              "rate": 24.275
            },
            {
              "level": 0,
              "rate": 42.0375
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 4,
      "extPmAmount": 0,
      "pmPre": true,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "amp",
      "chorus": {
        "rate": 2.1,
        "depth": 1,
        "mix": 0
      },
      "delay": {
        "time": 0.3,
        "feedback": 0.35,
        "mix": 0
      },
      "reverb": {
        "size": 0,
        "mix": 0
      },
      "vibrato": {
        "enabled": false,
        "waveform": 1,
        "rate": 30,
        "depth": 30,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "sine",
        "rate": 5,
        "depth": 0,
        "offset": 0,
        "target": "pitch"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Soft Piano": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "pinch",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 1,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 12,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.35681152343750006,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.21803476165892277,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 3,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 78.751611328125
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 70.754638671875
            }
          ],
          "sustainStep": 1,
          "stepCount": 3,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "pinch",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 1,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 12,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.42500000000000004,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.21803476165892277,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 3,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 78.751611328125
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 70.754638671875
            }
          ],
          "sustainStep": 1,
          "stepCount": 3,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 1.9931265024038458,
      "extPmAmount": 0,
      "pmPre": true,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "off",
      "chorus": {
        "rate": 1.0637961647727274,
        "depth": 0.5464311079545454,
        "mix": 0.24906782670454547
      },
      "delay": {
        "time": 0.5631665039062499,
        "feedback": 0.14724469866071424,
        "mix": 0.265625
      },
      "reverb": {
        "size": 0.5,
        "mix": 0
      },
      "vibrato": {
        "enabled": false,
        "waveform": 1,
        "rate": 30,
        "depth": 30,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": true,
        "waveform": "sine",
        "rate": 0.4674183238636367,
        "depth": 0.14038085937499994,
        "offset": 0,
        "target": "dcw"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Retro": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1+L2",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "pulse",
        "algo2": "pulse2",
        "algoBlend": 0.81,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 1,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 1,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 51
            },
            {
              "level": 0.49,
              "rate": 34
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "saw",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 1,
        "window": "off",
        "dcaBase": 0,
        "dcwBase": 0.82,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": -6,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 80
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 2,
      "extPmAmount": 0,
      "pmPre": true,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "amp",
      "chorus": {
        "rate": 0.8,
        "depth": 3,
        "mix": 0
      },
      "delay": {
        "time": 0.3,
        "feedback": 0.35,
        "mix": 0
      },
      "reverb": {
        "size": 0.5,
        "mix": 0
      },
      "vibrato": {
        "enabled": false,
        "waveform": 1,
        "rate": 30,
        "depth": 30,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "sine",
        "rate": 5,
        "depth": 0,
        "offset": 0,
        "target": "pitch"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Plucking": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L2",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "bend",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0.52,
        "window": "off",
        "dcaBase": 0.40960693359375006,
        "dcwBase": 1,
        "dcoDepth": 12,
        "modulation": 0,
        "detuneCents": 4,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 66.17
            },
            {
              "level": 1,
              "rate": 45.1
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 2,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 57.84
            },
            {
              "level": 0.35,
              "rate": 67.64
            },
            {
              "level": 0.6018181818181818,
              "rate": 36.28
            },
            {
              "level": 0.3618181818181818,
              "rate": 54.41
            },
            {
              "level": 0.5700000000000001,
              "rate": 22.07
            },
            {
              "level": 0.1752197265625,
              "rate": 25.569863281250008
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 4,
          "stepCount": 6,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 31.34642578124999
            },
            {
              "level": 0,
              "rate": 32.454267578125
            },
            {
              "level": 0,
              "rate": 1
            },
            {
              "level": 0,
              "rate": 1
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 0,
          "stepCount": 2,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "pinch",
        "algo2": "fold",
        "algoBlend": 0.4666796875,
        "dcwComp": 0.4158935546875,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 1,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 12,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 0.48587857263656353,
              "rate": 53.602685546875
            },
            {
              "level": 0.22470703125,
              "rate": 45.470849609375
            },
            {
              "level": 0.2910536106883139,
              "rate": 36.527392578125
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.4425841366480636,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 3,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 66.009619140625
            },
            {
              "level": 0.8755284965330628,
              "rate": 36.9365234375
            },
            {
              "level": 0,
              "rate": 23.291650390624998
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 3,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 0.5,
      "extPmAmount": 0,
      "pmPre": false,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "off",
      "chorus": {
        "rate": 2.1,
        "depth": 0.6099520596590908,
        "mix": 1
      },
      "delay": {
        "time": 0.554091796875,
        "feedback": 0.3257254464285714,
        "mix": 0
      },
      "reverb": {
        "size": 0.5,
        "mix": 0
      },
      "vibrato": {
        "enabled": true,
        "waveform": 1,
        "rate": 8.93701171875,
        "depth": 12.68994140625,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "triangle",
        "rate": 0.5260120738636367,
        "depth": 0.8219549005681819,
        "offset": 0,
        "target": "filter"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 2969.007457386366,
        "resonance": 0.6904296875,
        "envAmount": 0.7230113636363636
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Clav": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1+L2'",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "saw",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 1,
        "dcoDepth": 12,
        "modulation": 0,
        "detuneCents": 0,
        "octave": -2,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 1,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 0.5353535353535354,
              "rate": 82
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 94
            },
            {
              "level": 1,
              "rate": 83
            },
            {
              "level": 0,
              "rate": 33
            },
            {
              "level": 0,
              "rate": 60
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "keyFollow": 9,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "saw",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 0,
        "dcwBase": 1,
        "dcoDepth": 12,
        "modulation": 0,
        "detuneCents": 4624,
        "octave": 0,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 1,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 0.40404040404040403,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 2,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 0.5757575757575758,
              "rate": 99
            },
            {
              "level": 0.7676767676767676,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 38
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 2,
          "stepCount": 3,
          "loop": false
        },
        "keyFollow": 9,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 2,
      "extPmAmount": 0,
      "pmPre": true,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "amp",
      "chorus": {
        "rate": 0.8,
        "depth": 1,
        "mix": 0
      },
      "delay": {
        "time": 0.3,
        "feedback": 0.35,
        "mix": 0
      },
      "reverb": {
        "size": 0.5,
        "mix": 0
      },
      "vibrato": {
        "enabled": false,
        "waveform": 1,
        "rate": 30,
        "depth": 30,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "sine",
        "rate": 5,
        "depth": 0,
        "offset": 0,
        "target": "pitch"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Chants": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1+L2",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "pinch",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 0.98,
        "dcwBase": 0.96,
        "dcoDepth": 2,
        "modulation": 0,
        "detuneCents": 0,
        "octave": 0,
        "dcoEnv": {
          "steps": [
            {
              "level": 0.69,
              "rate": 56
            },
            {
              "level": 0.72,
              "rate": 74
            },
            {
              "level": 0,
              "rate": 51
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 2,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 0.65,
              "rate": 80
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 0.71,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "multiSine",
        "algo2": null,
        "algoBlend": 0.37,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 0.42,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 6,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 43
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 2.5,
      "extPmAmount": 0,
      "pmPre": false,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "amp",
      "chorus": {
        "rate": 0.8,
        "depth": 3,
        "mix": 0.61
      },
      "delay": {
        "time": 0.41,
        "feedback": 0.35,
        "mix": 0.27
      },
      "reverb": {
        "size": 0.5,
        "mix": 0
      },
      "vibrato": {
        "enabled": false,
        "waveform": 1,
        "rate": 30,
        "depth": 30,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "sine",
        "rate": 5,
        "depth": 0,
        "offset": 0,
        "target": "pitch"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Bright Changes": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1+L2",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "twist",
        "algo2": null,
        "algoBlend": 0.55732421875,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 0.9942626953125,
        "dcwBase": 1,
        "dcoDepth": 24,
        "modulation": 0,
        "detuneCents": 0,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0.8704833984375,
              "rate": 27.378173828125
            },
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 21.159863281249997
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.718609960260421,
              "rate": 15.238232421875
            },
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 16.707275390625
            }
          ],
          "sustainStep": 7,
          "stepCount": 1,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 30.172656250000003
            },
            {
              "level": 0.20935763127404458,
              "rate": 24.5783203125
            },
            {
              "level": 0.8268368986217975,
              "rate": 25.145849609375002
            },
            {
              "level": 0,
              "rate": 24.9927734375
            },
            {
              "level": 0.567092246554494,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 4,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 75
            },
            {
              "level": 0.8,
              "rate": 80
            },
            {
              "level": 0.8,
              "rate": 83.610888671875
            },
            {
              "level": 0,
              "rate": 8.543798828125
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "keyFollow": 8,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "pinch",
        "algo2": "fold",
        "algoBlend": 0.55732421875,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 0.68115234375,
        "dcwBase": 1,
        "dcoDepth": 24,
        "modulation": 0,
        "detuneCents": 5,
        "octave": 0,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0.8704833984375,
              "rate": 27.378173828125
            },
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 21.159863281249997
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0.718609960260421,
              "rate": 15.238232421875
            },
            {
              "level": 0,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 16.707275390625
            }
          ],
          "sustainStep": 7,
          "stepCount": 1,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 30.172656250000003
            },
            {
              "level": 0.20935763127404458,
              "rate": 24.5783203125
            },
            {
              "level": 0.8268368986217975,
              "rate": 25.145849609375002
            },
            {
              "level": 0,
              "rate": 24.9927734375
            },
            {
              "level": 0.567092246554494,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 4,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 75
            },
            {
              "level": 0.8,
              "rate": 80
            },
            {
              "level": 0.8,
              "rate": 83.610888671875
            },
            {
              "level": 0,
              "rate": 8.543798828125
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 2,
          "stepCount": 4,
          "loop": false
        },
        "keyFollow": 9,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 2,
      "extPmAmount": 0,
      "pmPre": true,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "amp",
      "chorus": {
        "rate": 1.3945556640625,
        "depth": 0.325039950284091,
        "mix": 0
      },
      "delay": {
        "time": 0.3,
        "feedback": 0.35,
        "mix": 0.3723810369318182
      },
      "reverb": {
        "size": 0.7802734375,
        "mix": 0
      },
      "vibrato": {
        "enabled": true,
        "waveform": 1,
        "rate": 7.436279296875,
        "depth": 15.68701171875,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "sine",
        "rate": 5,
        "depth": 0,
        "offset": 0,
        "target": "pitch"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  },
  "Bliss": {
    "schemaVersion": 1,
    "params": {
      "lineSelect": "L1+L2",
      "modMode": "normal",
      "octave": 0,
      "line1": {
        "algo": "bend",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0.52,
        "window": "off",
        "dcaBase": 1,
        "dcwBase": 1,
        "dcoDepth": 12,
        "modulation": 0,
        "detuneCents": 4,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 66.17
            },
            {
              "level": 1,
              "rate": 45.1
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 2,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 57.84
            },
            {
              "level": 0.35,
              "rate": 67.64
            },
            {
              "level": 0.6018181818181818,
              "rate": 36.28
            },
            {
              "level": 0.3618181818181818,
              "rate": 54.41
            },
            {
              "level": 0.5700000000000001,
              "rate": 22.07
            },
            {
              "level": 0,
              "rate": 27.46
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 4,
          "stepCount": 6,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 47.86
            },
            {
              "level": 0,
              "rate": 16.68
            },
            {
              "level": 0,
              "rate": 1
            },
            {
              "level": 0,
              "rate": 1
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 0,
          "stepCount": 2,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "line2": {
        "algo": "saw",
        "algo2": null,
        "algoBlend": 0,
        "dcwComp": 0,
        "window": "off",
        "dcaBase": 0.98,
        "dcwBase": 0.46,
        "dcoDepth": 0,
        "modulation": 0,
        "detuneCents": 12,
        "octave": -1,
        "dcoEnv": {
          "steps": [
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            },
            {
              "level": 0,
              "rate": 50
            }
          ],
          "sustainStep": 0,
          "stepCount": 8,
          "loop": false
        },
        "dcwEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 80
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "dcaEnv": {
          "steps": [
            {
              "level": 1,
              "rate": 90
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 1,
              "rate": 99
            },
            {
              "level": 0,
              "rate": 60
            }
          ],
          "sustainStep": 1,
          "stepCount": 8,
          "loop": false
        },
        "keyFollow": 0,
        "cz": {
          "slotAWaveform": "saw",
          "slotBWaveform": "saw",
          "window": "off"
        }
      },
      "intPmAmount": 0,
      "intPmRatio": 4,
      "extPmAmount": 0,
      "pmPre": true,
      "frequency": 440,
      "volume": 1,
      "polyMode": "poly8",
      "legato": false,
      "velocityTarget": "amp",
      "chorus": {
        "rate": 2.1,
        "depth": 1,
        "mix": 0.54
      },
      "delay": {
        "time": 0.3,
        "feedback": 0.35,
        "mix": 0.17
      },
      "reverb": {
        "size": 0.5,
        "mix": 0
      },
      "vibrato": {
        "enabled": false,
        "waveform": 1,
        "rate": 30,
        "depth": 30,
        "delay": 0
      },
      "portamento": {
        "enabled": false,
        "mode": "rate",
        "rate": 50,
        "time": 0.5
      },
      "lfo": {
        "enabled": false,
        "waveform": "sine",
        "rate": 5,
        "depth": 0,
        "offset": 0,
        "target": "pitch"
      },
      "filter": {
        "enabled": false,
        "type": "lp",
        "cutoff": 5000,
        "resonance": 0,
        "envAmount": 0
      },
      "pitchBendRange": 2,
      "modWheelVibratoDepth": 0
    }
  }
};
