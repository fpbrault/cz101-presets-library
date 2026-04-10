import type { StepEnvData } from "@/components/pdAlgorithms";

const STORAGE_PREFIX = "cz101-preset-";
const CURRENT_STATE_KEY = "cz101-current-state";

export interface SynthPresetData {
	warpAAmount: number;
	warpBAmount: number;
	warpAAlgo: string;
	warpBAlgo: string;
	algo2A: string | null;
	algo2B: string | null;
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
