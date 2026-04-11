/**
 * Phase Distortion Synthesis Processor — 8-voice polyphonic
 *
 * Supports 12 warp algorithms, mono/legato mode,
 * per-voice step envelopes (DCO/DCW/DCA), sustain pedal,
 * velocity, and chorus/delay/reverb FX chain.
 */

const TWO_PI = Math.PI * 2;
const NUM_VOICES = 8;

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

function warpCz101(phase, _amt, _waveId) {
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

function rateToSamples(rate, sr) {
	return Math.max(1, Math.round(sr * 5.0 * 0.0002 ** (rate / 99)));
}

function stepDurationSamples(fromLevel, toLevel, rate, sr) {
	const distance = Math.abs(toLevel - fromLevel);
	if (distance <= 0) return 0;
	return Math.max(1, Math.round(rateToSamples(rate, sr) * distance));
}

function createEnvGen() {
	return {
		step: 0,
		stepPos: 0,
		prevLevel: 0,
		output: 0,
		releasing: false,
		releaseStartLevel: 0,
		releaseProgress: 0,
		releaseDuration: 0,
	};
}

function resetEnv(env) {
	env.step = 0;
	env.stepPos = 0;
	env.prevLevel = 0;
	env.output = 0;
	env.releasing = false;
	env.releaseStartLevel = 0;
	env.releaseProgress = 0;
	env.releaseDuration = 0;
}

function advanceEnv(env, envData, sr) {
	const steps = envData.steps;
	const stepCount = Math.max(
		1,
		Math.min(envData.stepCount ?? steps.length ?? 8, steps.length),
	);
	const sustainStep = Math.max(
		0,
		Math.min(envData.sustainStep ?? 0, stepCount - 1),
	);
	const effectiveEndStep = stepCount - 1;
	const currentStep = Math.max(0, Math.min(env.step, effectiveEndStep));

	let stepData = steps[currentStep];
	let targetLevel = stepData?.level ?? 0;
	let duration = stepDurationSamples(
		env.prevLevel,
		targetLevel,
		stepData?.rate ?? 50,
		sr,
	);

	if (env.releasing) {
		if (duration <= 0) {
			env.output = targetLevel;
		} else {
			const progress = Math.min(env.stepPos / duration, 1);
			env.output = lerp(env.prevLevel, targetLevel, progress);
		}

		env.stepPos += 1;
		if (env.stepPos >= duration) {
			env.prevLevel = targetLevel;
			env.stepPos = 0;
			env.step += 1;
			if (env.step >= effectiveEndStep) {
				env.step = effectiveEndStep;
				env.output = steps[effectiveEndStep]?.level ?? 0;
			}
		}
		return;
	}

	const numSteps = stepCount;
	if (numSteps === 0) return;
	stepData = steps[currentStep];
	targetLevel = stepData.level;
	duration = stepDurationSamples(env.prevLevel, targetLevel, stepData.rate, sr);
	const progress = duration <= 0 ? 1 : Math.min(env.stepPos / duration, 1);

	env.output = lerp(env.prevLevel, targetLevel, progress);

	if (!envData.loop && currentStep === sustainStep && progress >= 1) {
		env.output = targetLevel;
		return;
	}

	env.stepPos += 1;
	if (env.stepPos >= duration) {
		env.prevLevel = targetLevel;
		env.stepPos = 0;

		if (!envData.loop && currentStep === sustainStep) {
			env.output = targetLevel;
			return;
		}

		env.step += 1;

		if (env.step >= numSteps) {
			if (envData.loop) {
				env.step = 0;
			} else {
				env.step = effectiveEndStep;
				env.output = steps[effectiveEndStep]?.level ?? 0;
			}
		}
	}
}

function startEnvRelease(env, envData, _sr) {
	const steps = envData.steps;
	const stepCount = Math.max(
		1,
		Math.min(envData.stepCount ?? steps.length ?? 8, steps.length),
	);
	const sustainStep = Math.max(
		0,
		Math.min(envData.sustainStep ?? 0, stepCount - 1),
	);
	const effectiveEndStep = stepCount - 1;

	env.releasing = true;
	env.releaseProgress = 0;

	if (env.step <= sustainStep) {
		env.step = Math.min(sustainStep + 1, effectiveEndStep);
		env.stepPos = 0;
	}

	env.prevLevel = env.output;
}

class DelayLine {
	constructor(length) {
		this.buffer = new Float32Array(length);
		this.length = length;
		this.writePos = 0;
	}
	write(value) {
		this.buffer[this.writePos] = value;
		this.writePos = (this.writePos + 1) % this.length;
	}
	read(offset) {
		const pos = (this.writePos - offset + this.length) % this.length;
		return this.buffer[pos];
	}
	readAtFractional(samples) {
		const intPart = Math.floor(samples);
		const frac = samples - intPart;
		const a = this.read(intPart);
		const b = this.read(intPart + 1);
		return a + (b - a) * frac;
	}
}

class CombFilter {
	constructor(delaySamples) {
		this.delay = new DelayLine(delaySamples);
		this.feedback = 0;
		this.filterStore = 0;
		this.damp1 = 0;
		this.damp2 = 0;
	}
	process(input, feedback, damping) {
		this.damp1 = damping;
		this.damp2 = 1 - damping;
		this.feedback = feedback;
		const output = this.delay.read(0);
		this.filterStore = output * this.damp2 + this.filterStore * this.damp1;
		this.delay.write(input + this.filterStore * this.feedback);
		return output;
	}
}

class AllPassFilter {
	constructor(delaySamples) {
		this.delay = new DelayLine(delaySamples);
		this.feedback = 0.5;
	}
	process(input) {
		const delayed = this.delay.read(0);
		const output = -input + delayed;
		this.delay.write(input + delayed * this.feedback);
		return output;
	}
}

class FxChain {
	constructor(sr) {
		const srRatio = sr / 44100;

		this.chorusDelay = new DelayLine(Math.round(0.05 * sr) + 2);
		this.chorusPhase = 0;
		this.chorusRate = 0.8;
		this.chorusDepth = 0.003;
		this.chorusMix = 0.3;

		this.delayLine = new DelayLine(Math.round(2 * sr));
		this.delayFeedback = 0.35;
		this.delayMix = 0;

		const reverbScale = srRatio;
		this.reverbCombs = [
			new CombFilter(Math.round(1557 * reverbScale)),
			new CombFilter(Math.round(1617 * reverbScale)),
			new CombFilter(Math.round(1491 * reverbScale)),
			new CombFilter(Math.round(1422 * reverbScale)),
		];
		this.reverbAllpass = [
			new AllPassFilter(Math.round(225 * reverbScale)),
			new AllPassFilter(Math.round(556 * reverbScale)),
			new AllPassFilter(Math.round(441 * reverbScale)),
			new AllPassFilter(Math.round(341 * reverbScale)),
		];
		this.reverbMix = 0;
		this.reverbSize = 0.5;
	}

	processChorus(sample) {
		if (this.chorusMix <= 0) return sample;
		this.chorusPhase += this.chorusRate / sampleRate;
		if (this.chorusPhase >= 1) this.chorusPhase -= 1;
		const mod = Math.sin(TWO_PI * this.chorusPhase);
		const delaySamples = (0.005 + this.chorusDepth * (mod + 1)) * sampleRate;
		const wet = this.chorusDelay.readAtFractional(Math.max(1, delaySamples));
		this.chorusDelay.write(sample);
		return sample * (1 - this.chorusMix) + wet * this.chorusMix;
	}

	processDelay(sample) {
		if (this.delayMix <= 0) return sample;
		const delayed = this.delayLine.readAtFractional(
			Math.max(1, this.delayTime * sampleRate),
		);
		this.delayLine.write(sample + delayed * this.delayFeedback);
		return sample * (1 - this.delayMix) + delayed * this.delayMix;
	}

	processReverb(sample) {
		if (this.reverbMix <= 0) return sample;
		const feedback = this.reverbSize * 0.84;
		const damping = 0.5;
		let sum = 0;
		for (let i = 0; i < this.reverbCombs.length; i++) {
			sum += this.reverbCombs[i].process(sample, feedback, damping);
		}
		sum /= this.reverbCombs.length;
		for (let i = 0; i < this.reverbAllpass.length; i++) {
			sum = this.reverbAllpass[i].process(sum);
		}
		return sample * (1 - this.reverbMix) + sum * this.reverbMix;
	}

	process(sample) {
		let out = this.processChorus(sample);
		out = this.processDelay(out);
		out = this.processReverb(out);
		return out;
	}
}

function createVoice() {
	return {
		phi1: 0,
		phi2: 0,
		pmPhi: 0,
		isReleasing: false,
		isSilent: true,
		sustained: false,
		gateWasOpen: false,
		note: null,
		frequency: 0,
		velocity: 1,
		line1Env: {
			dco: createEnvGen(),
			dcw: createEnvGen(),
			dca: createEnvGen(),
		},
		line2Env: {
			dco: createEnvGen(),
			dcw: createEnvGen(),
			dca: createEnvGen(),
		},
	};
}

const DEFAULT_STEP_ENV = {
	steps: [
		{ level: 1, rate: 90 },
		{ level: 1, rate: 99 },
		{ level: 1, rate: 99 },
		{ level: 1, rate: 99 },
		{ level: 1, rate: 99 },
		{ level: 1, rate: 99 },
		{ level: 1, rate: 99 },
		{ level: 0, rate: 60 },
	],
	sustainStep: 1,
	loop: false,
	releaseRate: 60,
};

class Cz101Processor extends AudioWorkletProcessor {
	constructor() {
		super();

		this.voices = Array.from({ length: NUM_VOICES }, createVoice);
		this.fx = new FxChain(sampleRate);
		this.activeNoteMap = new Map();

		this.sustainOn = false;
		this.params = {
			lineSelect: "L1+L2",
			octave: 0,
			line1: {
				waveform: 1,
				waveform2: 1,
				algo2: null,
				algoBlend: 0,
				dcwComp: 0,
				window: "off",
				dcaBase: 1.0,
				dcwBase: 0,
				dcoDepth: 0,
				modulation: 0,
				warpAlgo: "cz101",
				detuneCents: 0,
				octave: 0,
				dcoEnv: DEFAULT_STEP_ENV,
				dcwEnv: DEFAULT_STEP_ENV,
				dcaEnv: DEFAULT_STEP_ENV,
			},
			line2: {
				waveform: 1,
				waveform2: 1,
				algo2: null,
				algoBlend: 0,
				dcwComp: 0,
				window: "off",
				dcaBase: 1.0,
				dcwBase: 0,
				dcoDepth: 0,
				modulation: 0,
				warpAlgo: "cz101",
				detuneCents: 0,
				octave: 0,
				dcoEnv: DEFAULT_STEP_ENV,
				dcwEnv: DEFAULT_STEP_ENV,
				dcaEnv: DEFAULT_STEP_ENV,
			},
			intPmAmount: 0,
			intPmRatio: 1,
			extPmAmount: 0,
			pmPre: true,
			frequency: 220,
			volume: 0.4,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorus: { rate: 0.8, depth: 0.003, mix: 0 },
			delay: { time: 0.3, feedback: 0.35, mix: 0 },
			reverb: { size: 0.5, mix: 0 },
		};

		this.port.onmessage = (e) => {
			const d = e.data;
			if (!d) return;
			if (d.type === "setParams") {
				const p = d.params;
				Object.assign(this.params, p);
				if (p.chorus) Object.assign(this.params.chorus, p.chorus);
				if (p.delay) Object.assign(this.params.delay, p.delay);
				if (p.reverb) Object.assign(this.params.reverb, p.reverb);
				if (p.line1) {
					Object.assign(this.params.line1, p.line1);
					if (p.line1.dcoEnv) this.params.line1.dcoEnv = p.line1.dcoEnv;
					if (p.line1.dcwEnv) this.params.line1.dcwEnv = p.line1.dcwEnv;
					if (p.line1.dcaEnv) this.params.line1.dcaEnv = p.line1.dcaEnv;
				}
				if (p.line2) {
					Object.assign(this.params.line2, p.line2);
					if (p.line2.dcoEnv) this.params.line2.dcoEnv = p.line2.dcoEnv;
					if (p.line2.dcwEnv) this.params.line2.dcwEnv = p.line2.dcwEnv;
					if (p.line2.dcaEnv) this.params.line2.dcaEnv = p.line2.dcaEnv;
				}
				this.updateFx();
			} else if (d.type === "noteOn") {
				this.noteOn(
					d.note,
					d.frequency ?? 440 * 2 ** ((d.note - 69) / 12),
					d.velocity ?? 1,
				);
			} else if (d.type === "noteOff") {
				this.noteOff(d.note);
			} else if (d.type === "sustain") {
				this.setSustain(d.on);
			}
		};

		this.port.postMessage({ type: "ready" });
	}

	updateFx() {
		const p = this.params;
		this.fx.chorusRate = p.chorus?.rate ?? 0.8;
		this.fx.chorusDepth = p.chorus?.depth ?? 0.003;
		this.fx.chorusMix = p.chorus?.mix ?? 0;
		this.fx.delayTime = p.delay?.time ?? 0.3;
		this.fx.delayFeedback = p.delay?.feedback ?? 0.35;
		this.fx.delayMix = p.delay?.mix ?? 0;
		this.fx.reverbSize = p.reverb?.size ?? 0.5;
		this.fx.reverbMix = p.reverb?.mix ?? 0;
	}

	resetVoiceEnvs(voice) {
		for (const key of ["dco", "dcw", "dca"]) {
			resetEnv(voice.line1Env[key]);
			resetEnv(voice.line2Env[key]);
		}
	}

	startEnvRelease(voice) {
		const p = this.params;
		const sr = sampleRate;
		for (const key of ["dco", "dcw", "dca"]) {
			startEnvRelease(
				voice.line1Env[key],
				p.line1[`${key}Env`] ?? DEFAULT_STEP_ENV,
				sr,
			);
			startEnvRelease(
				voice.line2Env[key],
				p.line2[`${key}Env`] ?? DEFAULT_STEP_ENV,
				sr,
			);
		}
	}

	noteOn(note, frequency, velocity) {
		const vel = velocity ?? 1;
		if (this.params.polyMode === "mono") {
			const voice = this.voices[0];
			if (this.params.legato && !voice.isSilent && voice.note !== note) {
				voice.frequency = frequency;
				voice.note = note;
				voice.velocity = vel;
				this.activeNoteMap.set(note, 0);
				return;
			}
			voice.note = note;
			voice.frequency = frequency;
			voice.velocity = vel;
			voice.phi1 = 0;
			voice.phi2 = 0;
			voice.pmPhi = 0;
			voice.isReleasing = false;
			voice.isSilent = false;
			voice.sustained = false;
			voice.gateWasOpen = false;
			this.resetVoiceEnvs(voice);
			this.activeNoteMap.set(note, 0);
		} else {
			const existing = this.activeNoteMap.get(note);
			if (existing !== undefined) {
				const voice = this.voices[existing];
				if (voice && voice.note === note) {
					voice.frequency = frequency;
					voice.velocity = vel;
					return;
				}
			}
			let voiceIdx = this.voices.findIndex((v) => v.isSilent);
			if (voiceIdx === -1) {
				let minAmp = Infinity;
				let minIdx = 0;
				for (let i = 0; i < NUM_VOICES; i++) {
					if (this.voices[i].isReleasing) {
						const dca1 = this.voices[i].line1Env.dca.output;
						const dca2 = this.voices[i].line2Env.dca.output;
						const amp = Math.max(dca1, dca2);
						if (amp < minAmp) {
							minAmp = amp;
							minIdx = i;
						}
					}
				}
				voiceIdx = minIdx;
			}
			if (voiceIdx === -1) voiceIdx = 0;
			const voice = this.voices[voiceIdx];
			voice.note = note;
			voice.frequency = frequency;
			voice.velocity = vel;
			voice.phi1 = 0;
			voice.phi2 = 0;
			voice.pmPhi = 0;
			voice.isReleasing = false;
			voice.isSilent = false;
			voice.sustained = false;
			voice.gateWasOpen = false;
			this.resetVoiceEnvs(voice);
			this.activeNoteMap.set(note, voiceIdx);
		}
	}

	noteOff(note) {
		const voiceIdx = this.activeNoteMap.get(note);
		if (voiceIdx === undefined) return;
		this.activeNoteMap.delete(note);
		const voice = this.voices[voiceIdx];
		if (!voice || voice.note !== note) return;

		if (this.sustainOn) {
			voice.sustained = true;
			return;
		}

		if (this.params.polyMode === "mono") {
			if (this.activeNoteMap.size > 0) {
				const [lastNote] = [...this.activeNoteMap.entries()].pop();
				voice.note = lastNote[0];
				voice.frequency = 440 * 2 ** ((lastNote[1] - 69) / 12);
			} else {
				this.startRelease(voice);
			}
		} else {
			this.startRelease(voice);
		}
	}

	setSustain(on) {
		this.sustainOn = on;
		if (!on) {
			for (let i = 0; i < NUM_VOICES; i++) {
				const voice = this.voices[i];
				if (voice.sustained && !this.activeNoteMap.has(voice.note)) {
					voice.sustained = false;
					this.startRelease(voice);
				} else if (voice.sustained) {
					voice.sustained = false;
				}
			}
		}
	}

	startRelease(voice) {
		voice.isReleasing = true;
		this.startEnvRelease(voice);
	}

	renderVoice(voice, p) {
		const l1 = p.line1 || {};
		const l2 = p.line2 || {};
		const modBits = l1.modulation ?? 0;
		const baseFreq = voice.frequency || 220;
		const sr = sampleRate;

		// Advance all 6 envelope generators
		const l1DcoEnv = l1.dcoEnv ?? DEFAULT_STEP_ENV;
		const l1DcwEnv = l1.dcwEnv ?? DEFAULT_STEP_ENV;
		const l1DcaEnv = l1.dcaEnv ?? DEFAULT_STEP_ENV;
		const l2DcoEnv = l2.dcoEnv ?? DEFAULT_STEP_ENV;
		const l2DcwEnv = l2.dcwEnv ?? DEFAULT_STEP_ENV;
		const l2DcaEnv = l2.dcaEnv ?? DEFAULT_STEP_ENV;

		advanceEnv(voice.line1Env.dco, l1DcoEnv, sr);
		advanceEnv(voice.line1Env.dcw, l1DcwEnv, sr);
		advanceEnv(voice.line1Env.dca, l1DcaEnv, sr);
		advanceEnv(voice.line2Env.dco, l2DcoEnv, sr);
		advanceEnv(voice.line2Env.dcw, l2DcwEnv, sr);
		advanceEnv(voice.line2Env.dca, l2DcaEnv, sr);

		// Check if voice is silent
		const dca1 = voice.line1Env.dca.output;
		const dca2 = voice.line2Env.dca.output;
		if (voice.isSilent) {
			const freq1 =
				baseFreq * 2 ** ((l1.octave ?? 0) + (l1.detuneCents ?? 0) / 1200);
			const freq2 =
				baseFreq * 2 ** ((l2.octave ?? 0) + (l2.detuneCents ?? 0) / 1200);
			voice.phi1 += freq1 / sr;
			voice.phi2 += freq2 / sr;
			voice.pmPhi += (baseFreq * (p.intPmRatio ?? 1)) / sr;
			if (voice.phi1 >= 1) voice.phi1 -= 1;
			if (voice.phi2 >= 1) voice.phi2 -= 1;
			if (voice.pmPhi >= 1) voice.pmPhi -= 1;
			return 0;
		}

		if (voice.isReleasing && Math.abs(dca1) < 0.001 && Math.abs(dca2) < 0.001) {
			voice.isSilent = true;
			voice.note = null;
			voice.line1Env.dca.output = 0;
			voice.line2Env.dca.output = 0;
			return 0;
		}

		// Compute envelope-modulated parameters
		const dcoDepth1 = l1.dcoDepth ?? 0;
		const dcoDepth2 = l2.dcoDepth ?? 0;
		const dco1 = voice.line1Env.dco.output;
		const dco2 = voice.line2Env.dco.output;
		const dcw1 = (l1.dcwBase ?? 0) * voice.line1Env.dcw.output;
		const dcw2 = (l2.dcwBase ?? 0) * voice.line2Env.dcw.output;
		const dca1Level = (l1.dcaBase ?? 1) * dca1;
		const dca2Level = (l2.dcaBase ?? 1) * dca2;

		// DCW compensation: scale amplitude by warp level so sine doesn't get louder
		const compA = l1.dcwComp ?? 0;
		const compB = l2.dcwComp ?? 0;
		const compensatedDca1 =
			dca1Level * (1 - compA + compA * voice.line1Env.dcw.output);
		const compensatedDca2 =
			dca2Level * (1 - compB + compB * voice.line2Env.dcw.output);

		// Velocity
		const velocityTarget = p.velocityTarget ?? "amp";
		const vel = voice.velocity ?? 1;
		const velAmp =
			velocityTarget === "amp" || velocityTarget === "both" ? vel : 1;
		const velDcw =
			velocityTarget === "dcw" || velocityTarget === "both" ? vel : 1;

		const finalDcw1 = dcw1 * velDcw;
		const finalDcw2 = dcw2 * velDcw;
		const finalDca1 = compensatedDca1 * velAmp;
		const finalDca2 = compensatedDca2 * velAmp;

		// Frequency with DCO envelope modulation
		const freq1 =
			baseFreq *
			2 ** ((l1.octave ?? 0) + (l1.detuneCents ?? 0) / 1200) *
			2 ** ((dcoDepth1 * dco1) / 12);
		const freq2 =
			baseFreq *
			2 ** ((l2.octave ?? 0) + (l2.detuneCents ?? 0) / 1200) *
			2 ** ((dcoDepth2 * dco2) / 12);
		const pmFreq = baseFreq * (p.intPmRatio ?? 1);
		const pmDelta = pmFreq / sr;

		const phi1 = wrap01(voice.phi1);
		const phi2 = wrap01(voice.phi2);
		const pmPhi = wrap01(voice.pmPhi);

		const pmMod = (p.intPmAmount ?? 0) * 10 * Math.sin(TWO_PI * pmPhi);
		const phaseA_input = p.pmPre ? wrap01(phi1 + pmMod) : phi1;
		const phaseB_input = p.pmPre ? wrap01(phi2 + pmMod) : phi2;

		const algo2A = l1.algo2 || null;
		const algo2B = l2.algo2 || null;
		const blendA = l1.algoBlend ?? 0;
		const blendB = l2.algoBlend ?? 0;

		const warpedA = applyWarpAlgo(
			l1.warpAlgo ?? "cz101",
			phaseA_input,
			finalDcw1,
			l1.waveform ?? 1,
		);
		const warpedB = applyWarpAlgo(
			l2.warpAlgo ?? "cz101",
			phaseB_input,
			finalDcw2,
			l2.waveform ?? 1,
		);

		const phaseAPost = wrap01(p.pmPre ? warpedA : warpedA + pmMod);
		const phaseBPost = wrap01(p.pmPre ? warpedB : warpedB + pmMod);

		const w1 = applyWindow(phi1, l1.window ?? "off");
		const w2 = applyWindow(phi2, l2.window ?? "off");

		let s1;
		if (algo2A) {
			const dcw2A = finalDcw1 * blendA;
			const dcw1Effective = finalDcw1 * (1 - blendA);
			const warpedA2 = applyWarpAlgo(
				algo2A,
				phaseA_input,
				dcw2A,
				l1.waveform2 ?? 1,
			);
			const phaseAPost2 = wrap01(p.pmPre ? warpedA2 : warpedA2 + pmMod);
			const sigA1 =
				l1.warpAlgo === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseAPost),
							czWaveform(l1.waveform ?? 1, phaseAPost),
							dcw1Effective,
						)
					: Math.sin(TWO_PI * phaseAPost);
			const sigA2 =
				algo2A === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseAPost2),
							czWaveform(l1.waveform2 ?? 1, phaseAPost2),
							dcw2A,
						)
					: Math.sin(TWO_PI * phaseAPost2);
			s1 = lerp(sigA1, sigA2, blendA) * w1 * finalDca1;
		} else {
			s1 =
				l1.warpAlgo === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseAPost),
							czWaveform(l1.waveform ?? 1, phaseAPost),
							finalDcw1,
						) *
						w1 *
						finalDca1
					: Math.sin(TWO_PI * phaseAPost) * w1 * finalDca1;
		}

		let s2;
		if (algo2B) {
			const dcw2B = finalDcw2 * blendB;
			const dcw1EffectiveB = finalDcw2 * (1 - blendB);
			const warpedB2 = applyWarpAlgo(
				algo2B,
				phaseB_input,
				dcw2B,
				l2.waveform2 ?? 1,
			);
			const phaseBPost2 = wrap01(p.pmPre ? warpedB2 : warpedB2 + pmMod);
			const sigB1 =
				l2.warpAlgo === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseBPost),
							czWaveform(l2.waveform ?? 1, phaseBPost),
							dcw1EffectiveB,
						)
					: Math.sin(TWO_PI * phaseBPost);
			const sigB2 =
				algo2B === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseBPost2),
							czWaveform(l2.waveform2 ?? 1, phaseBPost2),
							dcw2B,
						)
					: Math.sin(TWO_PI * phaseBPost2);
			s2 = lerp(sigB1, sigB2, blendB) * w2 * finalDca2;
		} else {
			s2 =
				l2.warpAlgo === "cz101"
					? lerp(
							Math.sin(TWO_PI * phaseBPost),
							czWaveform(l2.waveform ?? 1, phaseBPost),
							finalDcw2,
						) *
						w2 *
						finalDca2
					: Math.sin(TWO_PI * phaseBPost) * w2 * finalDca2;
		}

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

		voice.phi1 += freq1 / sr;
		voice.phi2 += freq2 / sr;
		voice.pmPhi += pmDelta;
		if (voice.phi1 >= 1) voice.phi1 -= 1;
		if (voice.phi2 >= 1) voice.phi2 -= 1;
		if (voice.pmPhi >= 1) voice.pmPhi -= 1;

		return sample;
	}

	process(_inputs, outputs, _params) {
		const output = outputs[0];
		if (!output?.[0]) return true;

		const N = output[0].length;
		const p = this.params;
		const volume = p.volume ?? 0.4;
		const hasSecondChannel = output.length > 1;

		for (let i = 0; i < N; i++) {
			let mixed = 0;
			for (let v = 0; v < NUM_VOICES; v++) {
				mixed += this.renderVoice(this.voices[v], p);
			}
			mixed *= volume / Math.sqrt(NUM_VOICES);

			const fxOut = this.fx.process(mixed);
			const clamped = Math.max(-1, Math.min(1, fxOut));
			output[0][i] = clamped;
			if (hasSecondChannel) output[1][i] = clamped;
		}

		return true;
	}
}

registerProcessor("cz101-processor", Cz101Processor);
