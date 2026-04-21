import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
} from "@/components/pdAlgorithms";
import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";

const STORAGE_PREFIX = "cz101-preset-";
const CURRENT_STATE_KEY = "cz101-current-state";

function isSynthPresetV1(value: unknown): value is SynthPresetV1 {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<SynthPresetV1> & {
		params?: {
			volume?: unknown;
			line1?: unknown;
			line2?: unknown;
		};
	};
	if (typeof candidate.params !== "object" || candidate.params === null) {
		return false;
	}
	if (typeof candidate.params.volume !== "number") return false;
	if (typeof candidate.params.line1 !== "object" || candidate.params.line1 === null) {
		return false;
	}
	if (typeof candidate.params.line2 !== "object" || candidate.params.line2 === null) {
		return false;
	}
	return true;
}

export const DEFAULT_PRESET: SynthPresetV1 = {
	schemaVersion: 1,
	params: {
		lineSelect: "L1+L2",
		modMode: "normal",
		octave: 0,
		line1: {
			algo: "cz101",
			algo2: null,
			algoControls: [],
			algoBlend: 0,
			dcwComp: 0,
			window: "off",
			dcaBase: 1,
			dcwBase: 1,
			dcoDepth: 12,
			modulation: 0,
			detuneCents: 0,
			octave: 0,
			dcoEnv: DEFAULT_DCO_ENV,
			dcwEnv: DEFAULT_DCW_ENV,
			dcaEnv: DEFAULT_DCA_ENV,
			keyFollow: 0,
			cz: {
				slotAWaveform: "saw",
				slotBWaveform: "saw",
				window: "off",
			},
		},
		line2: {
			algo: "cz101",
			algo2: null,
			algoControls: [],
			algoBlend: 0,
			dcwComp: 0,
			window: "off",
			dcaBase: 1,
			dcwBase: 1,
			dcoDepth: 12,
			modulation: 0,
			detuneCents: 0,
			octave: 0,
			dcoEnv: DEFAULT_DCO_ENV,
			dcwEnv: DEFAULT_DCW_ENV,
			dcaEnv: DEFAULT_DCA_ENV,
			keyFollow: 0,
			cz: {
				slotAWaveform: "saw",
				slotBWaveform: "saw",
				window: "off",
			},
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
		modMatrix: { routes: [] },
	},
};

export function savePreset(name: string, data: SynthPresetV1): void {
	localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
}

export function loadPreset(name: string): SynthPresetV1 | null {
	const raw = localStorage.getItem(STORAGE_PREFIX + name);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return isSynthPresetV1(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function listPresets(): string[] {
	const names: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith(STORAGE_PREFIX)) {
			names.push(key.slice(STORAGE_PREFIX.length));
		}
	}
	return names.sort();
}

export function deletePreset(name: string): void {
	localStorage.removeItem(STORAGE_PREFIX + name);
}

export function renamePreset(oldName: string, newName: string): boolean {
	const data = loadPreset(oldName);
	if (!data) return false;
	if (oldName === newName) return true;
	savePreset(newName, data);
	deletePreset(oldName);
	return true;
}

export function exportPreset(name: string): string | null {
	const data = loadPreset(name);
	if (!data) return null;
	return JSON.stringify(data, null, 2);
}

export function importPreset(json: string): SynthPresetV1 | null {
	try {
		const parsed = JSON.parse(json);
		return isSynthPresetV1(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function saveCurrentState(data: SynthPresetV1): void {
	localStorage.setItem(CURRENT_STATE_KEY, JSON.stringify(data));
}

export function loadCurrentState(): SynthPresetV1 | null {
	const raw = localStorage.getItem(CURRENT_STATE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (isSynthPresetV1(parsed)) {
			return parsed;
		}
		localStorage.removeItem(CURRENT_STATE_KEY);
		return null;
	} catch {
		localStorage.removeItem(CURRENT_STATE_KEY);
		return null;
	}
}
