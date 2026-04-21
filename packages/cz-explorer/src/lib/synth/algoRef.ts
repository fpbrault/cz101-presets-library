import {
	ALGO_DEFINITIONS_V1,
	type Algo,
	type CzWaveform,
	type WindowType,
} from "@/lib/synth/bindings/synth";

const WARP_ALGOS = [
	"cz101",
	"bend",
	"sync",
	"pinch",
	"fold",
	"skew",
	"quantize",
	"twist",
	"clip",
	"ripple",
	"mirror",
	"fof",
	"karpunk",
	"sine",
] as const;
type WarpAlgo = (typeof WARP_ALGOS)[number];

const WAVEFORMS = [
	"saw",
	"square",
	"pulse",
	"null",
	"sinePulse",
	"sawPulse",
	"multiSine",
	"pulse2",
] as const;
type WaveformId = (typeof WAVEFORMS)[number];

// Maps legacy CZ preset alias names (from old AlgoRefV1) to the waveform they implied
const LEGACY_CZ_ALGO_TO_WAVEFORM: Record<string, WaveformId> = {
	czSaw: "saw",
	czSquare: "square",
	czPulse: "pulse",
	czDoubleSine: "sinePulse",
	czSawPulse: "sawPulse",
	czReso1: "multiSine",
	czReso2: "multiSine",
	czReso3: "multiSine",
};

const WAVEFORM_NAME_TO_LEGACY: Record<WaveformId, number> = {
	saw: 1,
	square: 2,
	pulse: 3,
	null: 4,
	sinePulse: 5,
	sawPulse: 6,
	multiSine: 7,
	pulse2: 8,
};

const WAVEFORM_ORDER: CzWaveform[] = [
	"saw",
	"square",
	"pulse",
	"null",
	"sinePulse",
	"sawPulse",
	"multiSine",
	"pulse2",
];

const WINDOW_ORDER: WindowType[] = [
	"off",
	"saw",
	"triangle",
	"trapezoid",
	"pulse",
	"doubleSaw",
];

type AlgoControlRuntime = {
	id: string;
	kind?: "number" | "select" | "toggle";
	default?: number | null;
};

type AlgoDefinitionRuntime = {
	id: Algo;
	controls: AlgoControlRuntime[];
};

const ALGO_DEFINITIONS = ALGO_DEFINITIONS_V1 as AlgoDefinitionRuntime[];

export type LegacyPdAlgo = Algo;

export const DEFAULT_ALGO_REF: Algo = "cz101";

export function isCzAlgo(value: unknown): value is "cz101" {
	return value === "cz101";
}

/** Returns the waveform implied by a legacy CZ preset alias (e.g. "czSaw" → "saw"), or null. */
export function legacyCzAlgoToWaveform(algo: string): WaveformId | null {
	return LEGACY_CZ_ALGO_TO_WAVEFORM[algo] ?? null;
}

export function isWarpAlgo(value: unknown): value is WarpAlgo {
	return (
		typeof value === "string" &&
		(WARP_ALGOS as readonly string[]).includes(value)
	);
}

export function isWaveformId(value: unknown): value is WaveformId {
	return (
		typeof value === "string" &&
		(WAVEFORMS as readonly string[]).includes(value)
	);
}

export function normalizeWaveformId(value: unknown): WaveformId {
	if (typeof value === "string") {
		if ((WAVEFORMS as readonly string[]).includes(value)) {
			return value as WaveformId;
		}
	}
	return "saw";
}

const ALL_ALGO_VALUES = [
	"saw", "square", "pulse", "null", "sinePulse", "sawPulse", "multiSine", "pulse2",
	"cz101", "bend", "sync", "pinch", "fold", "skew", "quantize", "twist", "clip",
	"ripple", "mirror", "fof", "karpunk", "sine",
] as const;

export function isAlgo(value: unknown): value is Algo {
	return typeof value === "string" && (ALL_ALGO_VALUES as readonly string[]).includes(value);
}

export function toAlgoRefV1(
	value: unknown,
	fallback: Algo = DEFAULT_ALGO_REF,
): Algo {
	// Legacy payloads may encode a CZ waveform directly in algo fields.
	// Coerce these to the canonical cz101 warp algo.
	if (isWaveformId(value)) {
		return "cz101";
	}

	// Handle legacy CZ preset alias names → map to cz101
	if (typeof value === "string" && value in LEGACY_CZ_ALGO_TO_WAVEFORM) {
		return "cz101";
	}

	if (isAlgo(value)) {
		return value;
	}

	return fallback;
}

export function algoRefKey(algo: Algo): string {
	return algo;
}

export function waveformIdToLegacyNumber(waveform: WaveformId): number {
	return WAVEFORM_NAME_TO_LEGACY[waveform];
}

export function isAlgoRefEqual(
	a: Algo | null,
	b: Algo | null,
): boolean {
	if (a === null || b === null) {
		return a === b;
	}
	return a === b;
}

export function resolveAlgoRef(algo: Algo): {
	waveform: WaveformId;
	warpAlgo: Algo;
	windowType: WindowType | null;
	isFrontPanelCzAlgo: boolean;
} {
	// For cz101, waveform comes from CzLineParams (not from algo).
	// Return "saw" as a fallback — callers should use line.cz.slotAWaveform.
	if (algo === "cz101") {
		return {
			waveform: "saw",
			warpAlgo: "cz101",
			windowType: null,
			isFrontPanelCzAlgo: false,
		};
	}

	if (isWaveformId(algo)) {
		return {
			waveform: algo,
			warpAlgo: algo,
			windowType: null,
			isFrontPanelCzAlgo: false,
		};
	}
	return {
		waveform: "saw",
		warpAlgo: algo,
		windowType: null,
		isFrontPanelCzAlgo: false,
	};
}

export function getCzPresetDefaults(algo: Algo): {
	waveform1: CzWaveform;
	waveform2: CzWaveform;
	windowFunction: WindowType;
} | null {
	const definition = ALGO_DEFINITIONS.find((entry) => entry.id === algo);
	if (!definition) {
		return null;
	}

	const waveform1Control = definition.controls.find(
		(control) => control.id === "waveform1",
	);
	const waveform2Control = definition.controls.find(
		(control) => control.id === "waveform2",
	);
	const windowControl = definition.controls.find(
		(control) => control.id === "windowFunction",
	);

	if (!waveform1Control || !waveform2Control || !windowControl) {
		return null;
	}

	const waveform1Index = Math.round(waveform1Control.default ?? 0);
	const waveform2Index = Math.round(waveform2Control.default ?? 0);
	const windowIndex = Math.round(windowControl.default ?? 0);

	return {
		waveform1: WAVEFORM_ORDER[waveform1Index] ?? "saw",
		waveform2: WAVEFORM_ORDER[waveform2Index] ?? "saw",
		windowFunction: WINDOW_ORDER[windowIndex] ?? "off",
	};
}
