import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";

/**
 * Built-in factory presets for the CZ-101 PD synthesizer lab.
 * Converted to canonical SynthPresetV1 format.
 */
export const DEFAULT_SYNTH_PRESETS: Record<string, SynthPresetV1> = {
	Clav2: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2'",
			modMode: "ring",
			octave: 0,
			line1: {
				algo: "pinch",
				algo2: "karpunk",
				algoBlend: 0.2,
				dcwComp: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				dcoDepth: 12,
				modulation: 0,
				detuneCents: 0,
				octave: -2,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 1,
					stepCount: 4,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 22,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 79,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 71,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 9,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
				algoControls: [
					{
						id: "pinchFocus",
						value: 0.38006591796875,
					},
					{
						id: "pinchAsym",
						value: 0,
					},
					{
						id: "pinchCurve",
						value: 0.5058797200520834,
					},
					{
						id: "pinchDrive",
						value: 0.12292480468749999,
					},
				],
			},
			line2: {
				algo: "cz101",
				algo2: "bend",
				algoBlend: 0.61,
				dcwComp: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				dcoDepth: 12,
				modulation: 0,
				detuneCents: 4624,
				octave: 0,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 1,
					stepCount: 4,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 22,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 79,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 71,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 9,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
				algoControls: [],
			},
			intPmAmount: 0,
			intPmRatio: 2,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "off",
			chorus: {
				rate: 0.8,
				depth: 1,
				mix: 0,
			},
			delay: {
				time: 0.3,
				feedback: 0.35,
				mix: 0,
			},
			reverb: {
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0.28284801136363635,
				offset: 0,
				target: "filter",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
			modMatrix: {
				routes: [
					{
						source: "velocity",
						destination: "line1AlgoParam4",
						amount: 0.79,
						enabled: true,
					},
				],
			},
		},
	},
	Fas: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "fold",
				algo2: null,
				algoBlend: 0,
				dcwComp: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				dcoDepth: 12,
				modulation: 0,
				detuneCents: 0,
				octave: 0,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 1,
					stepCount: 4,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 22,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 79,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 71,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
				algoControls: [
					{
						id: "foldStages",
						value: 0.75,
					},
					{
						id: "foldTilt",
						value: 0.3,
					},
					{
						id: "foldSymmetry",
						value: 0.29,
					},
					{
						id: "foldSoftness",
						value: 0.81,
					},
				],
			},
			line2: {
				algo: "cz101",
				algo2: null,
				algoBlend: 0,
				dcwComp: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				dcoDepth: 12,
				modulation: 0,
				detuneCents: 0,
				octave: 0,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 1,
					stepCount: 4,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 22,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 79,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 71,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
				algoControls: [],
			},
			intPmAmount: 0,
			intPmRatio: 2,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				rate: 0.8,
				depth: 1,
				mix: 0,
			},
			delay: {
				time: 0.3,
				feedback: 0.35,
				mix: 0,
			},
			reverb: {
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	Wow: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "sync",
				algo2: null,
				algoBlend: 0.015,
				window: "off",
				dcaBase: 0.9375,
				dcwBase: 0.96875,
				modulation: 0,
				detuneCents: 4,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 74,
							rate: 43,
						},
						{
							level: 32,
							rate: 29,
						},
						{
							level: 25,
							rate: 8,
						},
						{
							level: 0,
							rate: 14,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 74,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 47,
						},
						{
							level: 99,
							rate: 48,
						},
						{
							level: 99,
							rate: 24,
						},
						{
							level: 0,
							rate: 42,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "sinePulse",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 0.98,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 12,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 74,
							rate: 43,
						},
						{
							level: 32,
							rate: 29,
						},
						{
							level: 25,
							rate: 8,
						},
						{
							level: 0,
							rate: 14,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 74,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 47,
						},
						{
							level: 99,
							rate: 48,
						},
						{
							level: 99,
							rate: 24,
						},
						{
							level: 0,
							rate: 42,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 4,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				enabled: false,
				rate: 2.1,
				depth: 1,
				mix: 0,
			},
			delay: {
				enabled: false,
				time: 0.3,
				feedback: 0.35,
				mix: 0,
			},
			reverb: {
				enabled: false,
				size: 0,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	"Soft Piano": {
		schemaVersion: 1,
		params: {
			lineSelect: "L1",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "pinch",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 12,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 99,
						},
						{
							level: 35,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 22,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 79,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 71,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "pinch",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 12,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 99,
						},
						{
							level: 42,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 22,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 79,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 71,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 1.9931265024038458,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "off",
			chorus: {
				enabled: false,
				rate: 1.0637961647727274,
				depth: 0.5464311079545454,
				mix: 0.24906782670454547,
			},
			delay: {
				enabled: false,
				time: 0.5631665039062499,
				feedback: 0.14724469866071424,
				mix: 0.265625,
			},
			reverb: {
				enabled: false,
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: true,
				waveform: "sine",
				rate: 0.4674183238636367,
				depth: 0.14038085937499994,
				offset: 0,
				target: "dcw",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	Retro: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "pulse",
				algo2: "pulse2",
				algoBlend: 0.81,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 1,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 51,
						},
						{
							level: 49,
							rate: 34,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "saw",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 0,
				dcwBase: 0.82,
				modulation: 0,
				detuneCents: -6,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 80,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 2,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				enabled: false,
				rate: 0.8,
				depth: 3,
				mix: 0,
			},
			delay: {
				enabled: false,
				time: 0.3,
				feedback: 0.35,
				mix: 0,
			},
			reverb: {
				enabled: false,
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	Plucking: {
		schemaVersion: 1,
		params: {
			lineSelect: "L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "bend",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 0.40960693359375006,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 4,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 99,
							rate: 66,
						},
						{
							level: 99,
							rate: 45,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 2,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 58,
						},
						{
							level: 35,
							rate: 68,
						},
						{
							level: 60,
							rate: 36,
						},
						{
							level: 36,
							rate: 54,
						},
						{
							level: 56,
							rate: 22,
						},
						{
							level: 17,
							rate: 26,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 4,
					stepCount: 6,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 31,
						},
						{
							level: 0,
							rate: 32,
						},
						{
							level: 0,
							rate: 1,
						},
						{
							level: 0,
							rate: 1,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 0,
					stepCount: 2,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "pinch",
				algo2: "fold",
				algoBlend: 0.4666796875,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 12,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 48,
							rate: 54,
						},
						{
							level: 22,
							rate: 45,
						},
						{
							level: 29,
							rate: 37,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 44,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 66,
						},
						{
							level: 87,
							rate: 37,
						},
						{
							level: 0,
							rate: 23,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 0.5,
			extPmAmount: 0,
			pmPre: false,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "off",
			chorus: {
				enabled: false,
				rate: 2.1,
				depth: 0.6099520596590908,
				mix: 1,
			},
			delay: {
				enabled: false,
				time: 0.554091796875,
				feedback: 0.3257254464285714,
				mix: 0,
			},
			reverb: {
				enabled: false,
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: true,
				waveform: 1,
				rate: 8.93701171875,
				depth: 12.68994140625,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "triangle",
				rate: 0.5260120738636367,
				depth: 0.8219549005681819,
				offset: 0,
				target: "filter",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 2969.007457386366,
				resonance: 0.6904296875,
				envAmount: 0.7230113636363636,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	Clav: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2'",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "saw",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 0,
				octave: -2,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 1,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 53,
							rate: 82,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 94,
						},
						{
							level: 99,
							rate: 83,
						},
						{
							level: 0,
							rate: 33,
						},
						{
							level: 0,
							rate: 60,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				keyFollow: 9,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "saw",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 0,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 4624,
				octave: 0,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 1,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 40,
							rate: 99,
						},
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 2,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 57,
							rate: 99,
						},
						{
							level: 76,
							rate: 99,
						},
						{
							level: 0,
							rate: 38,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 2,
					stepCount: 3,
					loop: false,
				},
				keyFollow: 9,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 2,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				enabled: false,
				rate: 0.8,
				depth: 1,
				mix: 0,
			},
			delay: {
				enabled: false,
				time: 0.3,
				feedback: 0.35,
				mix: 0,
			},
			reverb: {
				enabled: false,
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	Chants: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "pinch",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 0.98,
				dcwBase: 0.96,
				modulation: 0,
				detuneCents: 0,
				octave: 0,
				dcoEnv: {
					steps: [
						{
							level: 68,
							rate: 56,
						},
						{
							level: 71,
							rate: 74,
						},
						{
							level: 0,
							rate: 51,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 2,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 64,
							rate: 80,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 70,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "multiSine",
				algo2: null,
				algoBlend: 0.37,
				window: "off",
				dcaBase: 1,
				dcwBase: 0.42,
				modulation: 0,
				detuneCents: 6,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 43,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 2.5,
			extPmAmount: 0,
			pmPre: false,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				enabled: false,
				rate: 0.8,
				depth: 3,
				mix: 0.61,
			},
			delay: {
				enabled: false,
				time: 0.41,
				feedback: 0.35,
				mix: 0.27,
			},
			reverb: {
				enabled: false,
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	"Bright Changes": {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "twist",
				algo2: null,
				algoBlend: 0.55732421875,
				window: "off",
				dcaBase: 0.9942626953125,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 0,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 99,
						},
						{
							level: 86,
							rate: 27,
						},
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 21,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 71,
							rate: 15,
						},
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 17,
						},
					],
					sustainStep: 7,
					stepCount: 1,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 30,
						},
						{
							level: 21,
							rate: 25,
						},
						{
							level: 82,
							rate: 25,
						},
						{
							level: 0,
							rate: 25,
						},
						{
							level: 56,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 4,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 75,
						},
						{
							level: 79,
							rate: 80,
						},
						{
							level: 79,
							rate: 84,
						},
						{
							level: 0,
							rate: 9,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				keyFollow: 8,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "pinch",
				algo2: "fold",
				algoBlend: 0.55732421875,
				window: "off",
				dcaBase: 0.68115234375,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 5,
				octave: 0,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 99,
						},
						{
							level: 86,
							rate: 27,
						},
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 21,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 71,
							rate: 15,
						},
						{
							level: 0,
							rate: 99,
						},
						{
							level: 0,
							rate: 17,
						},
					],
					sustainStep: 7,
					stepCount: 1,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 30,
						},
						{
							level: 21,
							rate: 25,
						},
						{
							level: 82,
							rate: 25,
						},
						{
							level: 0,
							rate: 25,
						},
						{
							level: 56,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 4,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 75,
						},
						{
							level: 79,
							rate: 80,
						},
						{
							level: 79,
							rate: 84,
						},
						{
							level: 0,
							rate: 9,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 2,
					stepCount: 4,
					loop: false,
				},
				keyFollow: 9,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 2,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				enabled: false,
				rate: 1.3945556640625,
				depth: 0.325039950284091,
				mix: 0,
			},
			delay: {
				enabled: false,
				time: 0.3,
				feedback: 0.35,
				mix: 0.3723810369318182,
			},
			reverb: {
				enabled: false,
				size: 0.7802734375,
				mix: 0,
			},
			vibrato: {
				enabled: true,
				waveform: 1,
				rate: 7.436279296875,
				depth: 15.68701171875,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
	Bliss: {
		schemaVersion: 1,
		params: {
			lineSelect: "L1+L2",
			modMode: "normal",
			octave: 0,
			line1: {
				algo: "bend",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 1,
				dcwBase: 1,
				modulation: 0,
				detuneCents: 4,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 99,
							rate: 66,
						},
						{
							level: 99,
							rate: 45,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 2,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 58,
						},
						{
							level: 35,
							rate: 68,
						},
						{
							level: 60,
							rate: 36,
						},
						{
							level: 36,
							rate: 54,
						},
						{
							level: 56,
							rate: 22,
						},
						{
							level: 0,
							rate: 27,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 4,
					stepCount: 6,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 48,
						},
						{
							level: 0,
							rate: 17,
						},
						{
							level: 0,
							rate: 1,
						},
						{
							level: 0,
							rate: 1,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 0,
					stepCount: 2,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			line2: {
				algo: "saw",
				algo2: null,
				algoBlend: 0,
				window: "off",
				dcaBase: 0.98,
				dcwBase: 0.46,
				modulation: 0,
				detuneCents: 12,
				octave: -1,
				dcoEnv: {
					steps: [
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
						{
							level: 0,
							rate: 50,
						},
					],
					sustainStep: 0,
					stepCount: 8,
					loop: false,
				},
				dcwEnv: {
					steps: [
						{
							level: 99,
							rate: 80,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				dcaEnv: {
					steps: [
						{
							level: 99,
							rate: 90,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 99,
							rate: 99,
						},
						{
							level: 0,
							rate: 60,
						},
					],
					sustainStep: 1,
					stepCount: 8,
					loop: false,
				},
				keyFollow: 0,
				cz: {
					slotAWaveform: "saw",
					slotBWaveform: "saw",
					window: "off",
				},
			},
			intPmEnabled: false,
			intPmAmount: 0,
			intPmRatio: 4,
			extPmAmount: 0,
			pmPre: true,
			frequency: 440,
			volume: 1,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: {
				enabled: false,
				rate: 2.1,
				depth: 1,
				mix: 0.54,
			},
			delay: {
				enabled: false,
				time: 0.3,
				feedback: 0.35,
				mix: 0.17,
			},
			reverb: {
				enabled: false,
				size: 0.5,
				mix: 0,
			},
			vibrato: {
				enabled: false,
				waveform: 1,
				rate: 30,
				depth: 30,
				delay: 0,
			},
			portamento: {
				enabled: false,
				mode: "rate",
				rate: 50,
				time: 0.5,
			},
			lfo: {
				enabled: false,
				waveform: "sine",
				rate: 5,
				depth: 0,
				offset: 0,
				target: "pitch",
			},
			filter: {
				enabled: false,
				type: "lp",
				cutoff: 5000,
				resonance: 0,
				envAmount: 0,
			},
			pitchBendRange: 2,
			modWheelVibratoDepth: 0,
		},
	},
};
