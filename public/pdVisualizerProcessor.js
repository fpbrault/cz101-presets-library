/**
 * Phase Distortion Synthesis Processor
 *
 * Supports 12 warp algorithms controlled by DCW depth:
 * bend, sync, pinch, fold, cz101, skew, quantize, twist, clip, ripple, mirror, sine
 */

const TWO_PI = Math.PI * 2;

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function wrap01(v) {
	const w = v - Math.floor(v);
	return w < 0 ? w + 1 : w;
}

function pdTransfer(waveformId, phi) {
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

function czWaveform(waveformId, phi) {
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

function warpBend(phase, amt) {
	if (amt === 0) return phase;
	const scale = -10.0 * amt;
	return Math.expm1(phase * scale) / Math.expm1(scale);
}

function warpSync(phase, amt) {
	if (amt === 0) return phase;
	const n = 1 + amt * 7;
	return (phase * n) % 1;
}

function warpPinch(phase, amt) {
	if (amt === 0) return phase;
	const center = 0.5;
	const a = amt * 0.98 + 0.01;
	return (
		center +
		(phase - center) * (Math.abs(phase - center) / center) ** (1 / (a + 0.001))
	);
}

function warpFold(phase, amt) {
	if (amt === 0) return phase;
	let p = phase;
	const folds = 1 + Math.floor(amt * 5);
	for (let i = 0; i < folds; ++i) {
		if (p > 0.5) p = 1 - p;
		p *= 2;
	}
	return p % 1;
}

function warpSkew(phase, amt) {
	if (amt === 0) return phase;
	const bp = 0.2;
	const target =
		phase < bp ? (phase / bp) * 0.5 : 0.5 + ((phase - bp) / (1 - bp)) * 0.5;
	return phase + (target - phase) * amt;
}

function warpCz101(phase, amt, waveId) {
	// CZ101 is handled at the output stage, not as a warped phase.
	// The processor should preserve the phase here and let the final
	// sample become a blend between sine and the CZ waveform.
	return phase;
}

function warpQuantize(phase, amt) {
	if (amt === 0) return phase;
	const levels = 2 + Math.floor(amt * 30);
	const target = Math.round(phase * levels) / levels;
	return phase + (target - phase) * amt;
}

function warpTwist(phase, amt) {
	if (amt === 0) return phase;
	return wrap01(phase + amt * 0.2 * Math.sin(TWO_PI * phase * 3));
}

function warpClip(phase, amt) {
	if (amt === 0) return phase;
	const gain = 1 + amt * 4;
	const x = (phase - 0.5) * gain;
	return Math.max(-0.5, Math.min(0.5, x)) + 0.5;
}

function warpRipple(phase, amt) {
	if (amt === 0) return phase;
	return wrap01(phase + amt * 0.08 * Math.sin(TWO_PI * phase * 10));
}

function warpMirror(phase, amt) {
	if (amt === 0) return phase;
	return phase + (1 - phase - phase) * amt;
}

function applyWarpAlgo(algo, phase, amt, waveId) {
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

function applyWindow(phase, type) {
	if (type === "off" || type === 0) return 1;
	if (type === "saw" || type === 1) return phase;
	if (type === "triangle" || type === 2) return 1 - Math.abs(phase * 2 - 1);
	return 1;
}

class Cz101Processor extends AudioWorkletProcessor {
	constructor() {
		super();

		this.phi1 = 0;
		this.phi2 = 0;
		this.pmPhi = 0;
		this.ampEnvelope = 0;
		this.gateWasOpen = false;
		this.gateCloseTime = null;
		this.releaseSamples = 0;
		this.releaseProgress = 0;
		this.isReleasing = false;
		this.isSilent = true;

		this.params = {
			lineSelect: "L1+L2",
			octave: 0,
			line1: {
				waveform: 1,
				window: "off",
				dca: 1.0,
				dcw: 0,
				modulation: 0,
				warpAlgo: "cz101",
				detuneCents: 0,
				octave: 0,
			},
			line2: {
				waveform: 1,
				window: "off",
				dca: 1.0,
				dcw: 0,
				modulation: 0,
				warpAlgo: "cz101",
				detuneCents: 0,
				octave: 0,
			},
			detuneFine: 0,
			detuneOctave: 0,
			detuneNote: 0,
			detuneDirection: "+",
			intPmAmount: 0,
			intPmRatio: 1,
			extPmAmount: 0,
			pmPre: true,
			frequency: 220,
			volume: 0.4,
			gate: true,
			releaseSeconds: 0.25,
		};

		this.port.onmessage = (e) => {
			if (e.data?.type === "setParams") {
				Object.assign(this.params, e.data.params);
			}
		};

		this.port.postMessage({ type: "ready" });
	}

	process(inputs, outputs, _params) {
		const output = outputs[0];
		if (!output?.[0]) return true;

		const N = output[0].length;
		const p = this.params;
		const gateOpen = !!p.gate;

		if (gateOpen && !this.gateWasOpen) {
			this.ampEnvelope = 0;
			this.isReleasing = false;
			this.releaseProgress = 0;
			this.isSilent = false;
		}
		if (!gateOpen && this.gateWasOpen) {
			this.isReleasing = true;
			this.releaseProgress = 0;
			const releaseSec = p.releaseSeconds ?? 0.25;
			this.releaseSamples = Math.max(1, Math.round(releaseSec * sampleRate));
		}
		this.gateWasOpen = gateOpen;

		const baseFreq = p.frequency || 220;
		const l1Octave = p.line1?.octave ?? 0;
		const l2Octave = p.line2?.octave ?? 0;
		const l1Detune = p.line1?.detuneCents ?? 0;
		const l2Detune = p.line2?.detuneCents ?? 0;
		const freq1 = baseFreq * 2 ** (l1Octave + l1Detune / 1200);
		const freq2 = baseFreq * 2 ** (l2Octave + l2Detune / 1200);

		const pmFreq = baseFreq * (p.intPmRatio ?? 1);
		const pmDelta = pmFreq / sampleRate;

		const l1 = p.line1 || {};
		const l2 = p.line2 || {};
		const modBits = l1.modulation ?? 0;

		const attackSamples = Math.max(1, Math.round(0.005 * sampleRate));

		for (let i = 0; i < N; i++) {
			if (gateOpen) {
				this.ampEnvelope = Math.min(1, this.ampEnvelope + 1 / attackSamples);
			} else if (this.isReleasing) {
				this.releaseProgress += 1;
				if (this.releaseProgress >= this.releaseSamples) {
					this.ampEnvelope = 0;
					this.isReleasing = false;
					this.isSilent = true;
				} else {
					this.ampEnvelope = 1 - this.releaseProgress / this.releaseSamples;
				}
			}

			const phi1 = wrap01(this.phi1);
			const phi2 = wrap01(this.phi2);
			const pmPhi = wrap01(this.pmPhi);

			const pmMod = p.intPmAmount * 10 * Math.sin(TWO_PI * pmPhi);
			const phaseA_input = p.pmPre ? wrap01(phi1 + pmMod) : phi1;
			const phaseB_input = p.pmPre ? wrap01(phi2 + pmMod) : phi2;

			const warpedA = applyWarpAlgo(
				l1.warpAlgo ?? "cz101",
				phaseA_input,
				l1.dcw ?? 0,
				l1.waveform ?? 1,
			);
			const warpedB = applyWarpAlgo(
				l2.warpAlgo ?? "cz101",
				phaseB_input,
				l2.dcw ?? 0,
				l2.waveform ?? 1,
			);

			const phaseAPost = wrap01(p.pmPre ? warpedA : warpedA + pmMod);
			const phaseBPost = wrap01(p.pmPre ? warpedB : warpedB + pmMod);

			const w1 = applyWindow(phi1, l1.window ?? "off");
			const w2 = applyWindow(phi2, l2.window ?? "off");

			const s1 =
				l1.warpAlgo === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseAPost),
							czWaveform(l1.waveform ?? 1, phaseAPost),
							l1.dcw ?? 0,
						) *
						w1 *
						(l1.dca ?? 1)
					: Math.sin(TWO_PI * phaseAPost) * w1 * (l1.dca ?? 1);
			const s2 =
				l2.warpAlgo === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseBPost),
							czWaveform(l2.waveform ?? 1, phaseBPost),
							l2.dcw ?? 0,
						) *
						w2 *
						(l2.dca ?? 1)
					: Math.sin(TWO_PI * phaseBPost) * w2 * (l2.dca ?? 1);

			let sample = 0;
			if (modBits === 0b011 || modBits === 0b111) {
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

			const out = sample * (p.volume ?? 0.4) * this.ampEnvelope;
			output[0][i] = Math.max(-1, Math.min(1, out));
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

registerProcessor("cz101-processor", Cz101Processor);
