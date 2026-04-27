import type { LfoWaveform } from "@/lib/synth/bindings/synth";

export type ModulePresetModule =
	| "chorus"
	| "delay"
	| "reverb"
	| "phaser"
	| "vibrato"
	| "phaseMod"
	| "lfo1"
	| "lfo2"
	| "modEnv";

export type ModulePresetPatch = Record<string, unknown>;

export type ModulePresetDefinition<TPatch extends ModulePresetPatch> = {
	id: string;
	label: string;
	patch: TPatch;
};

export const CHORUS_PRESETS: ModulePresetDefinition<{
	chorus: { enabled: boolean; rate: number; depth: number; mix: number };
}>[] = [
	{
		id: "classicWide",
		label: "Classic Wide",
		patch: {
			chorus: { enabled: true, rate: 0.9, depth: 1.2, mix: 0.38 },
		},
	},
	{
		id: "slowShimmer",
		label: "Slow Shimmer",
		patch: {
			chorus: { enabled: true, rate: 0.35, depth: 2.1, mix: 0.44 },
		},
	},
	{
		id: "ensembleThick",
		label: "Ensemble Thick",
		patch: {
			chorus: { enabled: true, rate: 1.8, depth: 2.6, mix: 0.56 },
		},
	},
];

export const DELAY_PRESETS: ModulePresetDefinition<{
	delay: {
		enabled: boolean;
		time: number;
		feedback: number;
		mix: number;
		tapeMode: boolean;
		warmth: number;
	};
}>[] = [
	{
		id: "digitalSlap",
		label: "Digital Slap",
		patch: {
			delay: {
				enabled: true,
				time: 0.11,
				feedback: 0.22,
				mix: 0.27,
				tapeMode: false,
				warmth: 0.2,
			},
		},
	},
	{
		id: "tapeEcho",
		label: "Tape Echo",
		patch: {
			delay: {
				enabled: true,
				time: 0.34,
				feedback: 0.46,
				mix: 0.35,
				tapeMode: true,
				warmth: 0.72,
			},
		},
	},
	{
		id: "dubFeedback",
		label: "Dub Feedback",
		patch: {
			delay: {
				enabled: true,
				time: 0.52,
				feedback: 0.68,
				mix: 0.4,
				tapeMode: true,
				warmth: 0.55,
			},
		},
	},
];

export const REVERB_PRESETS: ModulePresetDefinition<{
	reverb: {
		enabled: boolean;
		mix: number;
		space: number;
		predelay: number;
		distance: number;
		character: number;
	};
}>[] = [
	{
		id: "smallRoom",
		label: "Small Room",
		patch: {
			reverb: {
				enabled: true,
				mix: 0.22,
				space: 0.32,
				predelay: 0.006,
				distance: 0.28,
				character: 0.45,
			},
		},
	},
	{
		id: "plateAir",
		label: "Plate Air",
		patch: {
			reverb: {
				enabled: true,
				mix: 0.31,
				space: 0.58,
				predelay: 0.012,
				distance: 0.4,
				character: 0.74,
			},
		},
	},
	{
		id: "cathedral",
		label: "Cathedral",
		patch: {
			reverb: {
				enabled: true,
				mix: 0.47,
				space: 0.9,
				predelay: 0.03,
				distance: 0.68,
				character: 0.66,
			},
		},
	},
];

export const PHASER_PRESETS: ModulePresetDefinition<{
	phaser: {
		enabled: boolean;
		rate: number;
		depth: number;
		feedback: number;
		mix: number;
	};
}>[] = [
	{
		id: "gentleSweep",
		label: "Gentle Sweep",
		patch: {
			phaser: {
				enabled: true,
				rate: 0.35,
				depth: 0.45,
				feedback: 0.2,
				mix: 0.25,
			},
		},
	},
	{
		id: "jetWash",
		label: "Jet Wash",
		patch: {
			phaser: {
				enabled: true,
				rate: 0.9,
				depth: 0.78,
				feedback: 0.55,
				mix: 0.43,
			},
		},
	},
	{
		id: "wideNotch",
		label: "Wide Notch",
		patch: {
			phaser: {
				enabled: true,
				rate: 0.18,
				depth: 1,
				feedback: 0.72,
				mix: 0.52,
			},
		},
	},
];

export const VIBRATO_PRESETS: ModulePresetDefinition<{
	vibrato: {
		enabled: boolean;
		waveform: number;
		rate: number;
		depth: number;
		delay: number;
	};
}>[] = [
	{
		id: "subtle",
		label: "Subtle",
		patch: {
			vibrato: { enabled: true, waveform: 1, rate: 20, depth: 6, delay: 160 },
		},
	},
	{
		id: "chorused",
		label: "Chorused",
		patch: {
			vibrato: { enabled: true, waveform: 2, rate: 38, depth: 14, delay: 80 },
		},
	},
	{
		id: "warble",
		label: "Warble",
		patch: {
			vibrato: { enabled: true, waveform: 4, rate: 62, depth: 26, delay: 20 },
		},
	},
];

export const PHASE_MOD_PRESETS: ModulePresetDefinition<{
	intPmEnabled: boolean;
	intPmAmount: number;
	intPmRatio: number;
	pmPre: boolean;
}>[] = [
	{
		id: "glassBell",
		label: "Glass Bell",
		patch: {
			intPmEnabled: true,
			intPmAmount: 0.06,
			intPmRatio: 2.0,
			pmPre: true,
		},
	},
	{
		id: "metalFold",
		label: "Metal Fold",
		patch: {
			intPmEnabled: true,
			intPmAmount: 0.11,
			intPmRatio: 2.7,
			pmPre: true,
		},
	},
	{
		id: "aggressiveSync",
		label: "Aggressive Sync",
		patch: {
			intPmEnabled: true,
			intPmAmount: 0.18,
			intPmRatio: 3.4,
			pmPre: false,
		},
	},
];

export const LFO_PRESETS: ModulePresetDefinition<{
	waveform: LfoWaveform;
	rate: number;
	depth: number;
	symmetry: number;
	retrigger: boolean;
	offset: number;
}>[] = [
	{
		id: "slowSine",
		label: "Slow Sine",
		patch: {
			waveform: "sine",
			rate: 0.6,
			depth: 0.23,
			symmetry: 0.5,
			retrigger: false,
			offset: 0,
		},
	},
	{
		id: "tempoTri",
		label: "Tempo Tri",
		patch: {
			waveform: "triangle",
			rate: 2.25,
			depth: 0.48,
			symmetry: 0.5,
			retrigger: true,
			offset: 0,
		},
	},
	{
		id: "randomDrift",
		label: "Random Drift",
		patch: {
			waveform: "random",
			rate: 4.4,
			depth: 0.36,
			symmetry: 0.5,
			retrigger: false,
			offset: 0,
		},
	},
];

export const MOD_ENV_PRESETS: ModulePresetDefinition<{
	modEnv: { attack: number; decay: number; sustain: number; release: number };
}>[] = [
	{
		id: "pluck",
		label: "Pluck",
		patch: {
			modEnv: { attack: 0.005, decay: 0.16, sustain: 0.08, release: 0.14 },
		},
	},
	{
		id: "pad",
		label: "Pad",
		patch: {
			modEnv: { attack: 0.7, decay: 1.2, sustain: 0.75, release: 1.5 },
		},
	},
	{
		id: "reverseSwell",
		label: "Reverse Swell",
		patch: {
			modEnv: { attack: 1.8, decay: 0.28, sustain: 0.66, release: 0.95 },
		},
	},
];

export function getLfoModulePatch(id: 1 | 2, patch: Record<string, unknown>) {
	return id === 1 ? { lfo: patch } : { lfo2: patch };
}
