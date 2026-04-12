import type { PdAlgo, StepEnvData } from "@/components/pdAlgorithms";
import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
} from "@/components/pdAlgorithms";

const STORAGE_PREFIX = "cz101-preset-";
const CURRENT_STATE_KEY = "cz101-current-state";

export const DEFAULT_PRESET: SynthPresetData = {
	warpAAmount: 1,
	warpBAmount: 1,
	warpAAlgo: 1,
	warpBAlgo: 1,
	algo2A: null,
	algo2B: null,
	algoBlendA: 0,
	algoBlendB: 0,
	intPmAmount: 0,
	intPmRatio: 2,
	pmPre: true,
	windowType: "off",
	volume: 1,
	line1Level: 1,
	line2Level: 1,
	line1Octave: 0,
	line2Octave: 0,
	line1Detune: 0,
	line2Detune: 0,
	line1DcoDepth: 12,
	line2DcoDepth: 12,
	line1DcwComp: 0,
	line2DcwComp: 0,
	line1DcoEnv: DEFAULT_DCO_ENV,
	line1DcwEnv: DEFAULT_DCW_ENV,
	line1DcaEnv: DEFAULT_DCA_ENV,
	line2DcoEnv: DEFAULT_DCO_ENV,
	line2DcwEnv: DEFAULT_DCW_ENV,
	line2DcaEnv: DEFAULT_DCA_ENV,
	polyMode: "poly8",
	legato: false,
	velocityTarget: "amp",
	chorusRate: 0.8,
	chorusDepth: 1,
	chorusMix: 0,
	delayTime: 0.3,
	delayFeedback: 0.35,
	delayMix: 0,
	reverbSize: 0.5,
	reverbMix: 0,
};

export interface SynthPresetData {
	warpAAmount: number;
	warpBAmount: number;
	warpAAlgo: PdAlgo;
	warpBAlgo: PdAlgo;
	algo2A: PdAlgo | null;
	algo2B: PdAlgo | null;
	algoBlendA: number;
	algoBlendB: number;
	intPmAmount: number;
	intPmRatio: number;
	pmPre: boolean;
	windowType: string;
	volume: number;
	line1Level: number;
	line2Level: number;
	line1Octave: number;
	line2Octave: number;
	line1Detune: number;
	line2Detune: number;
	line1DcoDepth: number;
	line2DcoDepth: number;
	line1DcwComp: number;
	line2DcwComp: number;
	line1DcoEnv: StepEnvData;
	line1DcwEnv: StepEnvData;
	line1DcaEnv: StepEnvData;
	line2DcoEnv: StepEnvData;
	line2DcwEnv: StepEnvData;
	line2DcaEnv: StepEnvData;
	polyMode: string;
	legato: boolean;
	velocityTarget: string;
	chorusRate: number;
	chorusDepth: number;
	chorusMix: number;
	delayTime: number;
	delayFeedback: number;
	delayMix: number;
	reverbSize: number;
	reverbMix: number;
}

export function savePreset(name: string, data: SynthPresetData): void {
	localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
}

export function loadPreset(name: string): SynthPresetData | null {
	const raw = localStorage.getItem(STORAGE_PREFIX + name);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SynthPresetData;
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

export function exportPreset(name: string): string | null {
	const data = loadPreset(name);
	if (!data) return null;
	return JSON.stringify(data, null, 2);
}

export function importPreset(json: string): SynthPresetData | null {
	try {
		const parsed = JSON.parse(json);
		if (
			typeof parsed.warpAAmount !== "number" ||
			typeof parsed.volume !== "number"
		) {
			return null;
		}
		return parsed as SynthPresetData;
	} catch {
		return null;
	}
}

export function saveCurrentState(data: SynthPresetData): void {
	localStorage.setItem(CURRENT_STATE_KEY, JSON.stringify(data));
}

export function loadCurrentState(): SynthPresetData | null {
	const raw = localStorage.getItem(CURRENT_STATE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SynthPresetData;
	} catch {
		return null;
	}
}
