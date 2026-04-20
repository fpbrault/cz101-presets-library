import {
	algoRefKey,
	isAlgoRefEqual,
	isWarpAlgo,
	resolveAlgoRef,
} from "@/lib/synth/algoRef";
import type {
	AlgoRefV1,
	StepEnvData,
	WaveformId,
	WindowType,
} from "@/lib/synth/bindings/synth";

const N = 1024;
const TAU = Math.PI * 2;

export type PdAlgo = AlgoRefV1;

type PdAlgoDef = {
	value: PdAlgo;
	label: string;
	waveform: WaveformId;
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
		const amplitude = fn(phase); // Expected -1 to 1

		const x = 4 + phase * 16;
		const y = 12 - amplitude * 8;
		steps.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
	}
	return steps.join("");
};

const getWarpIcon = (algo: string): string => {
	const amt = 0.5; // The "preview" amount for the icon

	switch (algo) {
		case "bend":
			// Image_52db9f: Phase is exponential. Wave "bunches up" at the end.
			return generatePath((p) => Math.sin(2 * Math.PI * p ** (1 + amt * 3)));

		case "sync":
			// Image_52d85e: Phase resets multiple times.
			return generatePath((p) =>
				Math.sin(2 * Math.PI * ((p * (1 + amt * 2)) % 1)),
			);

		case "pinch":
			// Image_52d87c: Phase is pushed toward the center.
			return generatePath((p) => {
				const centered = (p - 0.5) * 2;
				const pinched =
					Math.sign(centered) * Math.abs(centered) ** (1 / (1 + amt * 4));
				return Math.sin(Math.PI * pinched);
			});

		case "fold":
			// Image_52d8b8: Wave mirrors back when exceeding 1.0/-1.0
			return generatePath((p) => {
				const v = Math.sin(2 * Math.PI * p) * (1 + amt * 2);
				return v > 1 ? 2 - v : v < -1 ? -2 - v : v;
			});

		case "twist":
			// Image_52dbac: Phase is warped by a sine function, creating an S-shaped curve
			return generatePath((p) => {
				const twisted = p + amt * 0.2 * Math.sin(TAU * p * 3);
				return Math.sin(2 * Math.PI * twisted);
			});

		case "skew":
			// Image_52dbbf: Saw-like tilt. Linear phase shift.
			return generatePath((p) => {
				const skew =
					p < 0.5 ? p / (0.5 + amt * 0.4) : 0.5 + (p - 0.5) / (0.5 - amt * 0.4);
				return Math.sin(2 * Math.PI * skew);
			});

		case "quantize":
			// Image_52dbde: Sample and hold (stepping)
			return generatePath((p) => {
				const steps = Math.floor(3 + (1 - amt) * 12);
				return Math.round(Math.sin(2 * Math.PI * p) * steps) / steps;
			});

		case "clip":
			// Image_52dc1c: Hard ceiling
			return generatePath((p) => {
				const limit = 1.1 - amt;
				return Math.max(Math.min(Math.sin(2 * Math.PI * p), limit), -limit);
			});

		case "ripple":
			// Image_52dc39: Sine + high freq sine
			return generatePath(
				(p) =>
					Math.sin(2 * Math.PI * p) +
					Math.sin(2 * Math.PI * p * 10) * amt * 0.3,
			);

		case "mirror":
			// Image_52dc76: Absolute value/rectification style
			return generatePath((p) => Math.abs(Math.sin(Math.PI * p)) * 2 - 1);

		case "karpunk":
			return generatePath((p) => Math.sin(TAU * p * 3) * Math.exp(-p * 2.2));

		case "fof":
			return generatePath((p) => {
				const carrier = Math.sin(TAU * p * 5);
				const window = Math.exp(-18 * (p - 0.5) ** 2);
				return carrier * window;
			});

		default:
			return generatePath((p) => Math.sin(2 * Math.PI * p));
	}
};

const getCzIcon = (waveform: WaveformId): string => {
	switch (waveform) {
		case "saw": // Saw: Ramp phase 0->1
			return generatePath((p) => 1 - p * 2);
		case "square": // Square: Sine but hard stepped
			return generatePath((p) => (p < 0.5 ? 1 : -1));
		case "pulse": // Pulse: Narrow high, wide low
			return generatePath((p) => (p < 0.2 ? 1 : -1));
		case "null": // Double Sine: Two humps per cycle
			return generatePath((p) => Math.sin(2 * Math.PI * p * 2));
		case "sinePulse": // Saw-Pulse: Saw that resets at 0.15
			return generatePath((p) => (p < 0.15 ? 1 - p * (2 / 0.15) : -1));
		case "sawPulse": // Reso: High frequency sine windowed by a ramp
			return generatePath((p) => Math.sin(2 * Math.PI * p * 8) * (1 - p));
		case "multiSine": // Reso 2: Sine with resonant shelf
			return generatePath(
				(p) => Math.sin(2 * Math.PI * p) + 0.5 * Math.sin(2 * Math.PI * p * 8),
			);
		case "pulse2": // Reso 3: Sine with formant-like peak
			return generatePath(
				(p) =>
					Math.sin(2 * Math.PI * p) *
					(p < 0.15 || (p >= 0.5 && p < 0.65) ? 1 : 0),
			);
		default:
			return generatePath((p) => Math.sin(2 * Math.PI * p));
	}
};

export const PD_ALGOS: PdAlgoDef[] = [
	// --- CZ (Casio) Specific Waveforms ---
	{
		value: "saw",
		label: "CZ Saw",
		waveform: "saw",
		algo: "cz101",
		key: algoRefKey("saw"),
		icon: getCzIcon("saw"), // Standard sawtooth
	},
	{
		value: "square",
		label: "CZ Square",
		waveform: "square",
		algo: "cz101",
		key: algoRefKey("square"),
		icon: getCzIcon("square"), // Single pulse cycle
	},
	{
		value: "pulse",
		label: "CZ Pulse",
		waveform: "pulse",
		algo: "cz101",
		key: algoRefKey("pulse"),
		icon: getCzIcon("pulse"), // Double thin pulse
	},
	{
		value: "null",
		label: "CZ null",
		waveform: "null",
		algo: "cz101",
		key: algoRefKey("null"),
		icon: getCzIcon("null"), // Two sine humps
	},
	{
		value: "sinePulse",
		label: "CZ Sine-Pulse",
		waveform: "sinePulse",
		algo: "cz101",
		key: algoRefKey("sinePulse"),
		icon: getCzIcon("sinePulse"), // Sawtooth then reset
	},
	{
		value: "sawPulse",
		label: "CZ Saw-Pulse",
		waveform: "sawPulse",
		algo: "cz101",
		key: algoRefKey("sawPulse"),
		icon: getCzIcon("sawPulse"), // Resonant spikes
	},
	{
		value: "multiSine",
		label: "CZ Multi-Sine",
		waveform: "multiSine",
		algo: "cz101",
		key: algoRefKey("multiSine"),
		icon: getCzIcon("multiSine"), // Sine with resonant shelf
	},
	{
		value: "pulse2",
		label: "CZ Pulse 2",
		waveform: "pulse2",
		algo: "cz101",
		key: algoRefKey("pulse2"),
		icon: getCzIcon("pulse2"), // Formant-style peak
	},
	// --- Generic Phase Distortion Algos ---
	{
		value: "bend",
		label: "Bend",
		waveform: "saw",
		algo: "bend",
		key: algoRefKey("bend"),
		icon: getWarpIcon("bend"), // Smooth curve (Current is good)
	},
	{
		value: "sync",
		label: "Sync",
		waveform: "saw",
		algo: "sync",
		key: algoRefKey("sync"),
		icon: getWarpIcon("sync"), // Hard reset steps
	},
	{
		value: "pinch",
		label: "Pinch",
		waveform: "saw",
		algo: "pinch",
		key: algoRefKey("pinch"),
		icon: getWarpIcon("pinch"), // Squeezed center
	},
	{
		value: "fold",
		label: "Fold",
		waveform: "saw",
		algo: "fold",
		key: algoRefKey("fold"),
		icon: getWarpIcon("fold"), // Triangle folding back
	},
	{
		value: "skew",
		label: "Skew",
		waveform: "saw",
		algo: "skew",
		key: algoRefKey("skew"),
		icon: getWarpIcon("skew"), // Peak shifted to the right
	},
	/* 	{
		value: "quantize",
		label: "Quantize",
		waveform: "saw",
		algo: "quantize",
		icon: getWarpIcon("quantize"), // Steps
	}, */
	{
		value: "twist",
		label: "Twist",
		waveform: "saw",
		algo: "twist",
		key: algoRefKey("twist"),
		icon: getWarpIcon("twist"), // S-curve rotation
	},
	{
		value: "clip",
		label: "Clip",
		waveform: "saw",
		algo: "clip",
		key: algoRefKey("clip"),
		icon: getWarpIcon("clip"), // Hard ceiling/floor
	},
	{
		value: "ripple",
		label: "Ripple",
		waveform: "saw",
		algo: "ripple",
		key: algoRefKey("ripple"),
		icon: getWarpIcon("ripple"), // Small sine oscillations
	},
	{
		value: "mirror",
		label: "Mirror",
		waveform: "saw",
		algo: "mirror",
		key: algoRefKey("mirror"),
		icon: getWarpIcon("mirror"), // Reflected peaks
	},
	{
		value: "karpunk",
		label: "Karpunk",
		waveform: "saw",
		algo: "karpunk",
		key: algoRefKey("karpunk"),
		icon: getWarpIcon("karpunk"),
	},
	{
		value: "fof",
		label: "FOF",
		waveform: "saw",
		algo: "fof",
		key: algoRefKey("fof"),
		icon: getWarpIcon("fof"),
	},
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

function pdTransfer(waveformId: WaveformId, phi: number): number {
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

function czWaveform(waveformId: WaveformId, phi: number): number {
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
	_waveformId: WaveformId,
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
		const w = applyWindow(phasor[i], params.windowType);

		if (algo2A) {
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
			out1[i] = lerp(sigA1, sigA2, blendA) * w * params.line1Level;
		} else if (algoA.warpAlgo === "cz101") {
			out1[i] =
				lerp(
					Math.sin(TAU * phasor[i]),
					czWaveform(algoA.waveform, phasor[i]),
					params.warpAAmount,
				) *
				w *
				params.line1Level;
		} else {
			out1[i] = Math.sin(TAU * phaseA[i]) * w * params.line1Level;
		}

		if (algo2B) {
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
			out2[i] = lerp(sigB1, sigB2, blendB) * w * params.line2Level;
		} else if (algoB.warpAlgo === "cz101") {
			out2[i] =
				lerp(
					Math.sin(TAU * phasor[i]),
					czWaveform(algoB.waveform, phasor[i]),
					params.warpBAmount,
				) *
				w *
				params.line2Level;
		} else {
			out2[i] = Math.sin(TAU * phaseB[i]) * w * params.line2Level;
		}
	}

	return { out1, out2, phase: phaseA };
}
