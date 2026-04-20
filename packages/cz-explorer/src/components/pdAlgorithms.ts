import {
	algoRefKey,
	isAlgoRefEqual,
	isWarpAlgo,
	resolveAlgoRef,
} from "@/lib/synth/algoRef";
import type {
	AlgoRefV1,
	CzWaveform,
	StepEnvData,
	WindowType,
} from "@/lib/synth/bindings/synth";
import { ALGO_UI_CATALOG_V1 } from "@/lib/synth/bindings/synth";

const N = 1024;
const TAU = Math.PI * 2;

export type PdAlgo = AlgoRefV1;

type PdAlgoDef = {
	value: PdAlgo;
	label: string;
	waveform: CzWaveform;
	algo: string;
	key: string;
	icon: string;
};

/**
 * Generates an SVG path by sampling a function
 * x: 4 to 20, y: 4 to 20 (center 12)
 */
const generatePath = (fn: (phase: number) => number, res = 64): string => {
	const steps = [];
	for (let i = 0; i <= res; i++) {
		const phase = i / res; // 0 to 1
		const amplitude = Math.max(-1, Math.min(1, fn(phase)));

		const x = 4 + phase * 16;
		const y = 12 - amplitude * 8;
		steps.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
	}
	return steps.join("");
};

const sampleAlgoFullDcw = (algo: PdAlgo, phase: number): number => {
	const resolved = resolveAlgoRef(algo);
	if (resolved.warpAlgo === "cz101") {
		const raw = czWaveform(resolved.waveform, phase);
		const w = resolved.windowType ? applyWindow(phase, resolved.windowType) : 1;
		return raw * w;
	}

	const warpedPhase = applyPdAlgo(phase, 1, algo, resolved.waveform);
	return Math.sin(TAU * warpedPhase);
};

const getAlgoIcon = (algo: PdAlgo): string => {
	return generatePath((phase) => sampleAlgoFullDcw(algo, phase));
};

export const PD_ALGOS: PdAlgoDef[] = [
	...ALGO_UI_CATALOG_V1.filter((entry) => entry.visible).map((entry) => {
		const resolved = resolveAlgoRef(entry.id);
		return {
			value: entry.id,
			label: entry.label,
			waveform: resolved.waveform,
			algo: resolved.warpAlgo,
			key: algoRefKey(entry.id),
			icon: getAlgoIcon(entry.id),
		};
	}),
];

export function getPdAlgoDef(algo: PdAlgo): PdAlgoDef | undefined {
	return PD_ALGOS.find((entry) => isAlgoRefEqual(entry.value, algo));
}

export const DEFAULT_DCA_ENV: StepEnvData = {
	steps: [
		{ level: 1, rate: 75 },
		{ level: 0.8, rate: 80 },
		{ level: 0.8, rate: 75 },
		{ level: 0, rate: 40 },
		{ level: 0, rate: 50 },
		{ level: 0, rate: 50 },
		{ level: 0, rate: 50 },
		{ level: 0, rate: 50 },
	],
	sustainStep: 2,
	stepCount: 4,
	loop: false,
};

export const DEFAULT_DCW_ENV: StepEnvData = {
	steps: [
		{ level: 1, rate: 75 },
		{ level: 1, rate: 80 },
		{ level: 1, rate: 75 },
		{ level: 0, rate: 40 },
		{ level: 0, rate: 50 },
		{ level: 0, rate: 50 },
		{ level: 0, rate: 50 },
		{ level: 0, rate: 50 },
	],
	sustainStep: 2,
	stepCount: 4,
	loop: false,
};

export const DEFAULT_DCO_ENV: StepEnvData = {
	steps: [
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
		{ level: 0, rate: 0 },
	],
	sustainStep: 1,
	stepCount: 2,
	loop: false,
};

export const PC_KEY_TO_NOTE: Record<string, number> = {
	a: 60,
	s: 62,
	d: 64,
	f: 65,
	g: 67,
	h: 69,
	j: 71,
	k: 72,
};

function wrap01(value: number): number {
	const wrapped = value % 1;
	return wrapped < 0 ? wrapped + 1 : wrapped;
}

function pdBend(phase: number, amount: number): number {
	if (amount === 0) return phase;
	return phase < amount
		? (phase / amount) * 0.5
		: 0.5 + ((phase - amount) / (1 - amount)) * 0.5;
}

function pdSync(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const n = 1 + amount * 7;
	return (phase * n) % 1;
}

function pdPinch(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const center = 0.5;
	const a = amount * 0.98 + 0.01;
	return (
		center + (phase - center) * (Math.abs(phase - center) / center) ** (a - 1)
	);
}

function pdFold(phase: number, amount: number): number {
	if (amount === 0) return phase;
	let p = phase;
	const folds = 1 + Math.floor(amount * 5);
	for (let i = 0; i < folds; ++i) {
		if (p > 0.5) p = 1 - p;
		p *= 2;
	}
	return p % 1;
}

function pdSkew(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const breakpoint = 0.2;
	const target =
		phase < breakpoint
			? (phase / breakpoint) * 0.5
			: 0.5 + ((phase - breakpoint) / (1 - breakpoint)) * 0.5;
	return phase + (target - phase) * amount;
}

function pdQuantize(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const levels = 2 + Math.floor(amount * 30);
	const target = Math.round(phase * levels) / levels;
	return phase + (target - phase) * amount;
}

function pdTwist(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const target = phase + amount * 0.2 * Math.sin(TAU * phase * 3);
	return wrap01(target);
}

function pdClip(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const gain = 1 + amount * 4;
	const x = (phase - 0.5) * gain;
	const clipped = Math.max(-0.5, Math.min(0.5, x));
	return clipped + 0.5;
}

function pdRipple(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const ripple = amount * 0.08 * Math.sin(TAU * phase * 10);
	return wrap01(phase + ripple);
}

function pdMirror(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const mirrored = 1 - phase;
	return phase + (mirrored - phase) * amount;
}

function pdTransfer(waveformId: CzWaveform, phi: number): number {
	switch (waveformId) {
		case "saw":
			return phi;
		case "square":
			return phi < 0.5 ? 0 : 1;
		case "pulse":
			return phi >= 0.25 && phi < 0.75 ? 1 : 0;
		case "null":
			return phi < 0.01 ? phi / 0.01 : 0;
		case "sinePulse":
			return phi < 0.15 ? phi / 0.15 : 0;
		case "sawPulse":
			return phi < 0.15 ? phi / 0.15 : phi;
		case "multiSine":
			return phi + 3 * Math.sin(TAU * phi) * Math.sin(Math.PI * phi);
		case "pulse2":
			return phi < 0.15 || (phi >= 0.5 && phi < 0.65) ? 1 : 0;
		default:
			return phi;
	}
}

function czWaveform(waveformId: CzWaveform, phi: number): number {
	const p = pdTransfer(waveformId, phi);
	switch (waveformId) {
		case "saw":
			return 2 * p - 1;
		case "square":
			return p === 1 ? 1 : -1;
		case "pulse":
			return p === 1 ? 1 : -1;
		case "null":
			return p * 2 - 1;
		case "sinePulse":
			return p * 2 - 1;
		case "sawPulse":
			return 2 * p - 1;
		case "multiSine":
			return Math.sin(TAU * p);
		case "pulse2":
			return p === 1 ? 1 : -1;
		default:
			return 2 * phi - 1;
	}
}

function pdCz101(phase: number, amount: number): number {
	if (amount === 0) return phase;
	const t = amount;
	if (t < 0.5) {
		return phase < t * 2
			? (phase / (t * 2)) * 0.5
			: 0.5 + ((phase - t * 2) / (2 - t * 2)) * 0.5;
	} else {
		return 0.5 - 0.5 * Math.cos(Math.PI * phase * (1 + (t - 0.5) * 2));
	}
}

function applyPdAlgo(
	phase: number,
	amount: number,
	algo: PdAlgo,
	_waveformId: CzWaveform,
): number {
	switch (isWarpAlgo(algo) ? algo : "cz101") {
		case "bend":
			return pdBend(phase, amount);
		case "sync":
			return pdSync(phase, amount);
		case "pinch":
			return pdPinch(phase, amount);
		case "fold":
			return pdFold(phase, amount);
		case "cz101":
			return pdCz101(phase, amount);
		case "skew":
			return pdSkew(phase, amount);
		case "quantize":
			return pdQuantize(phase, amount);
		case "twist":
			return pdTwist(phase, amount);
		case "clip":
			return pdClip(phase, amount);
		case "ripple":
			return pdRipple(phase, amount);
		case "mirror":
			return pdMirror(phase, amount);
		case "karpunk":
			// Stateless approximation: decaying resonant phase distortion
			return wrap01(
				phase + amount * Math.sin(TAU * phase * 3) * Math.exp(-phase * 2.5),
			);
		case "fof":
			// Stateless approximation: gaussian-windowed harmonic carrier
			return wrap01(
				phase * 5.0 * (1 - amount * 0.8) +
					amount * 0.5 * Math.exp(-20 * (phase - 0.5) ** 2),
			);
		default:
			return phase;
	}
}

function applyWindow(phase: number, type: WindowType): number {
	if (type === "off") return 1;
	if (type === "saw") return phase;
	if (type === "triangle") return 1 - Math.abs(phase * 2 - 1);
	if (type === "trapezoid") return phase < 0.5 ? 1 : 2 * (1 - phase);
	if (type === "pulse") return phase < 0.5 ? 1 : 0;
	if (type === "doubleSaw") return 1 - Math.abs(2 * ((phase * 2) % 1) - 1);
	return 1;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function noteToFreq(note: number): number {
	return 440 * 2 ** ((note - 69) / 12);
}

interface WaveformData {
	out1: Float32Array;
	out2: Float32Array;
	phase: Float32Array;
}

export function computeWaveform(params: {
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
	extPmAmount: number;
	pmPre: boolean;
	windowType: WindowType;
	line1Level: number;
	line2Level: number;
}): WaveformData {
	const phasor = new Float32Array(N);
	for (let i = 0; i < N; ++i) phasor[i] = i / N;

	const pm = new Float32Array(N);
	for (let i = 0; i < N; ++i) {
		pm[i] =
			params.intPmAmount * Math.sin(TAU * params.intPmRatio * phasor[i]) +
			params.extPmAmount * Math.sin(TAU * 1.5 * phasor[i]);
	}

	if (params.pmPre) {
		for (let i = 0; i < N; ++i) phasor[i] = (phasor[i] + pm[i]) % 1;
	}

	const algoA = resolveAlgoRef(params.warpAAlgo);
	const algoB = resolveAlgoRef(params.warpBAlgo);
	const algo2A = params.algo2A ? resolveAlgoRef(params.algo2A) : null;
	const algo2B = params.algo2B ? resolveAlgoRef(params.algo2B) : null;
	const line1Window = algoA.windowType ?? params.windowType;
	const line2Window = algoB.windowType ?? params.windowType;

	if (!params.pmPre) {
		for (let i = 0; i < N; ++i) phasor[i] = (phasor[i] + pm[i]) % 1;
	}

	const phaseA = new Float32Array(N);
	const phaseB = new Float32Array(N);
	const out1 = new Float32Array(N);
	const out2 = new Float32Array(N);
	for (let i = 0; i < N; ++i) {
		phaseA[i] = applyPdAlgo(
			phasor[i],
			params.warpAAmount,
			params.warpAAlgo,
			algoA.waveform,
		);
		phaseB[i] = applyPdAlgo(
			phasor[i],
			params.warpBAmount,
			params.warpBAlgo,
			algoB.waveform,
		);
	}

	for (let i = 0; i < N; ++i) {
		const w1 = applyWindow(phasor[i], line1Window);
		const w2 = applyWindow(phasor[i], line2Window);

		if (algo2A && algoA.warpAlgo === "cz101" && algo2A.warpAlgo === "cz101") {
			const cyclePhase = (phasor[i] * 2) % 1;
			const useSecondary = phasor[i] >= 0.5;
			const active = useSecondary ? algo2A : algoA;
			out1[i] =
				lerp(
					Math.sin(TAU * cyclePhase),
					czWaveform(active.waveform, cyclePhase),
					params.warpAAmount,
				) *
				w1 *
				params.line1Level;
		} else if (algo2A) {
			const blendA = params.algoBlendA;
			const dcw1eff = params.warpAAmount * (1 - blendA);
			const dcw2A = params.warpAAmount * blendA;
			const sigA1 =
				algoA.warpAlgo === "cz101"
					? lerp(
							Math.sin(TAU * phasor[i]),
							czWaveform(algoA.waveform, phasor[i]),
							dcw1eff,
						)
					: Math.sin(TAU * phaseA[i]);
			const phaseA2 = applyPdAlgo(
				phasor[i],
				dcw2A,
				params.algo2A as PdAlgo,
				algo2A.waveform,
			);
			const sigA2 =
				algo2A.warpAlgo === "cz101"
					? lerp(
							Math.sin(TAU * phasor[i]),
							czWaveform(algo2A.waveform, phasor[i]),
							dcw2A,
						)
					: Math.sin(TAU * phaseA2);
			out1[i] = lerp(sigA1, sigA2, blendA) * w1 * params.line1Level;
		} else if (algoA.warpAlgo === "cz101") {
			out1[i] =
				lerp(
					Math.sin(TAU * phasor[i]),
					czWaveform(algoA.waveform, phasor[i]),
					params.warpAAmount,
				) *
				w1 *
				params.line1Level;
		} else {
			out1[i] = Math.sin(TAU * phaseA[i]) * w1 * params.line1Level;
		}

		if (algo2B && algoB.warpAlgo === "cz101" && algo2B.warpAlgo === "cz101") {
			const cyclePhase = (phasor[i] * 2) % 1;
			const useSecondary = phasor[i] >= 0.5;
			const active = useSecondary ? algo2B : algoB;
			out2[i] =
				lerp(
					Math.sin(TAU * cyclePhase),
					czWaveform(active.waveform, cyclePhase),
					params.warpBAmount,
				) *
				w2 *
				params.line2Level;
		} else if (algo2B) {
			const blendB = params.algoBlendB;
			const dcw1effB = params.warpBAmount * (1 - blendB);
			const dcw2B = params.warpBAmount * blendB;
			const sigB1 =
				algoB.warpAlgo === "cz101"
					? lerp(
							Math.sin(TAU * phasor[i]),
							czWaveform(algoB.waveform, phasor[i]),
							dcw1effB,
						)
					: Math.sin(TAU * phaseB[i]);
			const phaseB2 = applyPdAlgo(
				phasor[i],
				dcw2B,
				params.algo2B as PdAlgo,
				algo2B.waveform,
			);
			const sigB2 =
				algo2B.warpAlgo === "cz101"
					? lerp(
							Math.sin(TAU * phasor[i]),
							czWaveform(algo2B.waveform, phasor[i]),
							dcw2B,
						)
					: Math.sin(TAU * phaseB2);
			out2[i] = lerp(sigB1, sigB2, blendB) * w2 * params.line2Level;
		} else if (algoB.warpAlgo === "cz101") {
			out2[i] =
				lerp(
					Math.sin(TAU * phasor[i]),
					czWaveform(algoB.waveform, phasor[i]),
					params.warpBAmount,
				) *
				w2 *
				params.line2Level;
		} else {
			out2[i] = Math.sin(TAU * phaseB[i]) * w2 * params.line2Level;
		}
	}

	return { out1, out2, phase: phaseA };
}
