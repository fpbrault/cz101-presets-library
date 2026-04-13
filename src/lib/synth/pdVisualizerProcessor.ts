/**
 * Phase Distortion Synthesis Processor (Visualizer Version)
 *
 * Supports 12 warp algorithms controlled by DCW depth:
 * bend, sync, pinch, fold, cz101, skew, quantize, twist, clip, ripple, mirror, sine
 *
 * This file runs in an AudioWorklet scope — no module imports allowed.
 */

export const TWO_PI = Math.PI * 2;

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function wrap01(v: number): number {
	const w = v - Math.floor(v);
	return w < 0 ? w + 1 : w;
}

export type WaveformId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function pdTransfer(waveformId: WaveformId, phi: number): number {
	switch (waveformId) {
		case 1:
			return phi;
		case 2:
			return phi < 0.5 ? 0 : 1;
		case 3:
			return phi >= 0.25 && phi < 0.75 ? 1 : 0;
		case 4:
			return phi < 0.01 ? phi / 0.01 : 0;
		case 5:
			return phi < 0.15 ? phi / 0.15 : 0;
		case 6:
			return phi < 0.15 ? phi / 0.15 : phi;
		case 7:
			return phi + 3 * Math.sin(TWO_PI * phi) * Math.sin(Math.PI * phi);
		case 8:
			return phi < 0.15 || (phi >= 0.5 && phi < 0.65) ? 1 : 0;
		default:
			return phi;
	}
}

export function czWaveform(waveformId: WaveformId, phi: number): number {
	const p = pdTransfer(waveformId, phi);
	switch (waveformId) {
		case 1:
			return 2 * p - 1;
		case 2:
			return p === 1 ? 1 : -1;
		case 3:
			return p === 1 ? 1 : -1;
		case 4:
			return p * 2 - 1;
		case 5:
			return p * 2 - 1;
		case 6:
			return 2 * p - 1;
		case 7:
			return Math.sin(TWO_PI * p);
		case 8:
			return p === 1 ? 1 : -1;
		default:
			return 2 * phi - 1;
	}
}

export type WarpAlgo =
	| "bend"
	| "sync"
	| "pinch"
	| "fold"
	| "cz101"
	| "skew"
	| "quantize"
	| "twist"
	| "clip"
	| "ripple"
	| "mirror"
	| "sine";

export function warpBend(phase: number, amt: number): number {
	if (amt === 0) return phase;
	const scale = -10.0 * amt;
	return Math.expm1(phase * scale) / Math.expm1(scale);
}

export function warpSync(phase: number, amt: number): number {
	if (amt === 0) return phase;
	const n = 1 + amt * 7;
	return (phase * n) % 1;
}

export function warpPinch(phase: number, amt: number): number {
	if (amt === 0) return phase;
	const center = 0.5;
	const a = amt * 0.98 + 0.01;
	return (
		center +
		(phase - center) * (Math.abs(phase - center) / center) ** (1 / (a + 0.001))
	);
}

export function warpFold(phase: number, amt: number): number {
	if (amt === 0) return phase;
	let p = phase;
	const folds = 1 + Math.floor(amt * 5);
	for (let i = 0; i < folds; ++i) {
		if (p > 0.5) p = 1 - p;
		p *= 2;
	}
	return p % 1;
}

export function warpSkew(phase: number, amt: number): number {
	if (amt === 0) return phase;
	const bp = 0.2;
	const target =
		phase < bp ? (phase / bp) * 0.5 : 0.5 + ((phase - bp) / (1 - bp)) * 0.5;
	return phase + (target - phase) * amt;
}

export function warpCz101(
	phase: number,
	_amt: number,
	_waveId?: WaveformId,
): number {
	return phase;
}

export function warpQuantize(phase: number, amt: number): number {
	if (amt === 0) return phase;
	const levels = 2 + Math.floor(amt * 30);
	const target = Math.round(phase * levels) / levels;
	return phase + (target - phase) * amt;
}

export function warpTwist(phase: number, amt: number): number {
	if (amt === 0) return phase;
	return wrap01(phase + amt * 0.2 * Math.sin(TWO_PI * phase * 3));
}

export function warpClip(phase: number, amt: number): number {
	if (amt === 0) return phase;
	const gain = 1 + amt * 4;
	const x = (phase - 0.5) * gain;
	return Math.max(-0.5, Math.min(0.5, x)) + 0.5;
}

export function warpRipple(phase: number, amt: number): number {
	if (amt === 0) return phase;
	return wrap01(phase + amt * 0.08 * Math.sin(TWO_PI * phase * 10));
}

export function warpMirror(phase: number, amt: number): number {
	if (amt === 0) return phase;
	return phase + (1 - phase - phase) * amt;
}

export function applyWarpAlgo(
	algo: WarpAlgo,
	phase: number,
	amt: number,
	waveId?: WaveformId,
): number {
	if (amt === 0) return phase;
	switch (algo) {
		case "bend":
			return warpBend(phase, amt);
		case "sync":
			return warpSync(phase, amt);
		case "pinch":
			return warpPinch(phase, amt);
		case "fold":
			return warpFold(phase, amt);
		case "cz101":
			return warpCz101(phase, amt, waveId);
		case "skew":
			return warpSkew(phase, amt);
		case "quantize":
			return warpQuantize(phase, amt);
		case "twist":
			return warpTwist(phase, amt);
		case "clip":
			return warpClip(phase, amt);
		case "ripple":
			return warpRipple(phase, amt);
		case "mirror":
			return warpMirror(phase, amt);
		case "sine":
			return phase;
		default:
			return phase;
	}
}

export type WindowType = "off" | "saw" | "triangle" | 0 | 1 | 2;

export function applyWindow(phase: number, type: WindowType): number {
	if (type === "off" || type === 0) return 1;
	if (type === "saw" || type === 1) return phase;
	if (type === "triangle" || type === 2) return 1 - Math.abs(phase * 2 - 1);
	return 1;
}

export interface LineParams {
	waveform: WaveformId;
	window: WindowType;
	dca: number;
	dcw: number;
	modulation: number;
	warpAlgo: WarpAlgo;
	detuneCents?: number;
}

export interface ProcessorParams {
	lineSelect: "L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'";
	octave: number;
	line1: LineParams;
	line2: LineParams;
	intPmAmount: number;
	intPmRatio: number;
	extPmAmount: number;
	pmPre: boolean;
	frequency: number;
	volume: number;
	gate: boolean;
}

declare function registerProcessor(
	name: string,
	ctor: new () => AudioWorkletProcessor,
): void;

// Only register the processor in AudioWorklet context (not in Node/test environment)
if (typeof AudioWorkletProcessor !== "undefined") {
	function createDefaultParams(): ProcessorParams {
		return {
			lineSelect: "L1+L2",
			octave: 0,
			line1: {
				waveform: 1,
				window: "off",
				dca: 1.0,
				dcw: 0,
				modulation: 0,
				warpAlgo: "cz101",
			},
			line2: {
				waveform: 1,
				window: "off",
				dca: 1.0,
				dcw: 0,
				modulation: 0,
				warpAlgo: "cz101",
			},
			intPmAmount: 0,
			intPmRatio: 1,
			extPmAmount: 0,
			pmPre: true,
			frequency: 220,
			volume: 0.4,
			gate: true,
		};
	}

	class Cz101VisualizerProcessor extends AudioWorkletProcessor {
		private phi1 = 0;
		private phi2 = 0;
		private pmPhi = 0;
		private params: ProcessorParams = createDefaultParams();

		constructor() {
			super();
			this.port.onmessage = (e: MessageEvent) => {
				if (e.data?.type === "setParams") {
					this.params = { ...this.params, ...e.data.params };
				}
			};
			this.port.postMessage({ type: "ready" });
		}

		process(
			_inputs: Float32Array[][],
			outputs: Float32Array[][],
			_params: Record<string, Float32Array>,
		): boolean {
			const output = outputs[0];
			if (!output?.[0]) return true;

			const N = output[0].length;
			const p = this.params;

			const freq = p.frequency || 220;
			const pmFreq = freq * (p.intPmRatio || 1);
			const pmDelta = pmFreq / sampleRate;

			const l1 = p.line1;
			const l2 = p.line2;
			const modBits = l1.modulation ?? 0;

			const freq1 = freq * (1 + (l1.detuneCents ?? 0) / 1200);
			const freq2 = freq * (1 + (l2.detuneCents ?? 0) / 1200);

			for (let i = 0; i < N; i++) {
				const phi = wrap01(this.phi1);
				const pmPhi = wrap01(this.pmPhi);

				const pmMod = p.intPmAmount * 10 * Math.sin(TWO_PI * pmPhi);
				const phaseA = wrap01(p.pmPre ? phi + pmMod : phi);
				const phaseB = wrap01(p.pmPre ? phi + pmMod : phi);

				const warpedA = applyWarpAlgo(
					l1.warpAlgo,
					phaseA,
					l1.dcw || 0,
					l1.waveform,
				);
				const warpedB = applyWarpAlgo(
					l2.warpAlgo,
					phaseB,
					l2.dcw || 0,
					l2.waveform,
				);

				const phaseAPost = wrap01(p.pmPre ? warpedA : warpedA + pmMod);
				const phaseBPost = wrap01(p.pmPre ? warpedB : warpedB + pmMod);

				const w1 = applyWindow(phi, l1.window);
				const w2 = applyWindow(phi, l2.window);

				let s1: number;
				let s2: number;

				if (l1.warpAlgo === "cz101") {
					s1 =
						lerp(
							Math.sin(TWO_PI * phaseAPost),
							czWaveform(l1.waveform, phaseAPost),
							l1.dcw || 0,
						) *
						w1 *
						(l1.dca || 1);
				} else {
					s1 = Math.sin(TWO_PI * phaseAPost) * w1 * (l1.dca || 1);
				}

				if (l2.warpAlgo === "cz101") {
					s2 =
						lerp(
							Math.sin(TWO_PI * phaseBPost),
							czWaveform(l2.waveform, phaseBPost),
							l2.dcw || 0,
						) *
						w2 *
						(l2.dca || 1);
				} else {
					s2 = Math.sin(TWO_PI * phaseBPost) * w2 * (l2.dca || 1);
				}

				let sample = 0;
				if (!p.gate) {
					sample = 0;
				} else if (modBits === 0b011 || modBits === 0b111) {
					const noise = Math.random() * 2 - 1;
					sample = (s1 + s1 * noise) / 2;
				} else if (
					modBits === 0b100 ||
					modBits === 0b101 ||
					modBits === 0b010 ||
					modBits === 0b110
				) {
					sample = s1 * s2;
				} else if (p.lineSelect === "L1") {
					sample = s1;
				} else if (p.lineSelect === "L2") {
					sample = s2;
				} else {
					sample = s1 + s2;
				}

				output[0][i] = Math.max(-1, Math.min(1, sample * (p.volume ?? 0.4)));
				if (output.length > 1) output[1][i] = output[0][i];

				this.phi1 += freq1 / sampleRate;
				if (this.phi1 >= 1) this.phi1 -= 1;
				this.phi2 += freq2 / sampleRate;
				if (this.phi2 >= 1) this.phi2 -= 1;
				this.pmPhi += pmDelta;
				if (this.pmPhi >= 1) this.pmPhi -= 1;
			}

			return true;
		}
	}

	registerProcessor("cz101-visualizer-processor", Cz101VisualizerProcessor);
}
