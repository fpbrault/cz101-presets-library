import type { AlgoRefV1 } from "@/lib/synth/bindings/synth";

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

export const DEFAULT_ALGO_REF: AlgoRefV1 = "saw";

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
} {
	if (isWaveformId(algo)) {
		return {
			waveform: algo,
			warpAlgo: "cz101",
		};
	}
	return {
		waveform: "saw",
		warpAlgo: algo,
	};
}
