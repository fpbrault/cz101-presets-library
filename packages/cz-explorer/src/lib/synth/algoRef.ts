import type { AlgoRefV1, WindowType } from "@/lib/synth/bindings/synth";

const CZ_FRONT_PANEL_ALGOS = [
	"czSaw",
	"czSquare",
	"czPulse",
	"czDoubleSine",
	"czSawPulse",
	"czReso1",
	"czReso2",
	"czReso3",
] as const;
type CzAlgo = (typeof CZ_FRONT_PANEL_ALGOS)[number];

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

const CZ_ALGO_TO_WAVEFORM: Record<CzAlgo, WaveformId> = {
	czSaw: "saw",
	czSquare: "square",
	czPulse: "pulse",
	czDoubleSine: "sinePulse",
	czSawPulse: "sawPulse",
	czReso1: "multiSine",
	czReso2: "multiSine",
	czReso3: "multiSine",
};

const CZ_ALGO_TO_WINDOW: Record<CzAlgo, WindowType> = {
	czSaw: "off",
	czSquare: "off",
	czPulse: "off",
	czDoubleSine: "off",
	czSawPulse: "off",
	czReso1: "saw",
	czReso2: "triangle",
	czReso3: "trapezoid",
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

export type LegacyPdAlgo = AlgoRefV1;

export const DEFAULT_ALGO_REF: AlgoRefV1 = "czSaw";

export function isCzAlgo(value: unknown): value is CzAlgo {
	return (
		typeof value === "string" &&
		(CZ_FRONT_PANEL_ALGOS as readonly string[]).includes(value)
	);
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

export function toAlgoRefV1(
	value: unknown,
	fallback: AlgoRefV1 = DEFAULT_ALGO_REF,
): AlgoRefV1 {
	if (isCzAlgo(value)) {
		return value;
	}

	if (isWaveformId(value)) {
		return value;
	}

	if (isWarpAlgo(value)) {
		return value;
	}

	return fallback;
}

export function algoRefKey(algo: AlgoRefV1): string {
	return algo;
}

export function waveformIdToLegacyNumber(waveform: WaveformId): number {
	return WAVEFORM_NAME_TO_LEGACY[waveform];
}

export function isAlgoRefEqual(
	a: AlgoRefV1 | null,
	b: AlgoRefV1 | null,
): boolean {
	if (a === null || b === null) {
		return a === b;
	}
	return a === b;
}

export function resolveAlgoRef(algo: AlgoRefV1): {
	waveform: WaveformId;
	warpAlgo: WarpAlgo;
	windowType: WindowType | null;
	isFrontPanelCzAlgo: boolean;
} {
	if (isCzAlgo(algo)) {
		return {
			waveform: CZ_ALGO_TO_WAVEFORM[algo],
			warpAlgo: "cz101",
			windowType: CZ_ALGO_TO_WINDOW[algo],
			isFrontPanelCzAlgo: true,
		};
	}

	if (isWaveformId(algo)) {
		return {
			waveform: algo,
			warpAlgo: "cz101",
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
