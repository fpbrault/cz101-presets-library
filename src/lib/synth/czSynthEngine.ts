/**
 * CZ-101 Polyphonic Synth Engine
 *
 * Manages multiple voices with note-on/note-off handling and voice stealing.
 */

import {
	type CzVoiceParams,
	type CzVoiceState,
	createVoiceState,
	isVoiceActive,
	noteOff,
	noteOn,
} from "./czVoice";
import { advanceEnvelope } from "./envelopeGenerator";
import { applyTransfer, type WaveformId } from "./pdOscillator";
import { applyWindow } from "./windowFunction";

const MAX_VOICES = 8;

export interface CzSynthEngine {
	voices: CzVoiceState[];
	currentParams: CzVoiceParams | null;
	sampleRate: number;
	volume: number;
}

export function createSynthEngine(sampleRate: number): CzSynthEngine {
	return {
		voices: Array.from({ length: MAX_VOICES }, () => createVoiceState()),
		currentParams: null,
		sampleRate,
		volume: 0.4,
	};
}

export function setParams(engine: CzSynthEngine, params: CzVoiceParams): void {
	engine.currentParams = params;
}

export function voiceNoteOn(
	engine: CzSynthEngine,
	note: number,
	velocity: number,
): void {
	if (!engine.currentParams) return;

	const { line1, line2 } = engine.currentParams;
	let freeVoice: CzVoiceState | null = null;
	let oldestVoice: CzVoiceState | null = null;
	let oldestAge = -1;

	for (const voice of engine.voices) {
		if (!voice.active) {
			freeVoice = voice;
			break;
		}
		const age =
			performance.now() -
			(voice as unknown as { lastActive: number }).lastActive;
		if (age > oldestAge) {
			oldestAge = age;
			oldestVoice = voice;
		}
	}

	const voiceToUse = freeVoice ?? oldestVoice;
	if (voiceToUse) {
		noteOn(voiceToUse, note, velocity, line1, line2);
		(voiceToUse as unknown as { lastActive: number }).lastActive =
			performance.now();
	}
}

export function voiceNoteOff(engine: CzSynthEngine, note: number): void {
	for (const voice of engine.voices) {
		if (voice.note === note && voice.active) {
			noteOff(voice);
		}
	}
}

export function renderSample(engine: CzSynthEngine): number {
	if (!engine.currentParams) return 0;

	const {
		line1,
		line2,
		lineSelect,
		detuneCents,
		octave,
		frequency,
		frequency2,
	} = engine.currentParams;
	const sr = engine.sampleRate;

	let output = 0;
	let activeLines = 0;

	for (const voice of engine.voices) {
		if (!isVoiceActive(voice)) continue;

		const note = voice.note ?? 60;
		const noteOffset = (note - 60) / 60;

		const dcaLevel1 = advanceEnvelope(voice.dcaEnv1, line1.dcaEnv, 1000 / sr);
		const dcwDepth1 = advanceEnvelope(voice.dcwEnv1, line1.dcwEnv, 1000 / sr);
		const dcoOffset1 = advanceEnvelope(voice.dcoEnv1, line1.dcoEnv, 1000 / sr);

		const dcaLevel2 = advanceEnvelope(voice.dcaEnv2, line2.dcaEnv, 1000 / sr);
		const dcwDepth2 = advanceEnvelope(voice.dcwEnv2, line2.dcwEnv, 1000 / sr);
		const dcoOffset2 = advanceEnvelope(voice.dcoEnv2, line2.dcoEnv, 1000 / sr);

		const dca1 =
			dcaLevel1 * line1.dcaBase * (1 + line1.dcaKeyFollow * noteOffset);
		const dcw1 =
			dcwDepth1 * line1.dcwBase * (1 + line1.dcwKeyFollow * noteOffset);
		const dco1 = (dcoOffset1 - 0.5) * 4 * line1.dcoDepth;

		const dca2 =
			dcaLevel2 * line2.dcaBase * (1 + line2.dcaKeyFollow * noteOffset);
		const dcw2 =
			dcwDepth2 * line2.dcwBase * (1 + line2.dcwKeyFollow * noteOffset);
		const dco2 = (dcoOffset2 - 0.5) * 4 * line2.dcoDepth;

		const freq1 = frequency * 2 ** (octave + dco1 / 12);
		const freq2 = frequency2 * 2 ** (octave + dco2 / 12 + detuneCents / 1200);

		voice.phi1 += freq1 / sr;
		if (voice.phi1 >= 1) {
			voice.phi1 -= 1;
			voice.cycleCount1++;
		}
		voice.phi2 += freq2 / sr;
		if (voice.phi2 >= 1) {
			voice.phi2 -= 1;
			voice.cycleCount2++;
		}

		const phi1 = voice.phi1;
		const phi2 = voice.phi2;

		const useWave1 =
			line1.waveform2 !== null && voice.cycleCount1 % 2 === 1
				? line1.waveform2
				: line1.waveform;
		const useWave2 =
			line2.waveform2 !== null && voice.cycleCount2 % 2 === 1
				? line2.waveform2
				: line2.waveform;

		const fb1 = line1.feedback ?? 0;
		const fb2 = line2.feedback ?? 0;

		// Line 1 sample
		let distorted1: number;
		let sigA1: number;
		if (line1.warpAlgo === "karpunk") {
			const delaySamples = Math.floor(sr / freq1);
			const safeDelay = Math.max(1, Math.min(2047, delaySamples));
			const readPos = (voice.ksWritePos - safeDelay + 2048) % 2048;
			const currentSample = voice.ksBuffer[readPos];
			const filteredSample = (currentSample + voice.ksLastSample) * 0.5 * 0.99;
			voice.ksBuffer[voice.ksWritePos] = filteredSample;
			voice.ksLastSample = filteredSample;
			voice.ksWritePos = (voice.ksWritePos + 1) % 2048;
			sigA1 = filteredSample;
		} else if (line1.warpAlgo === "fof") {
			const carrierPhase = (phi1 * 5.0) % 1.0;
			const formantWindow = Math.exp(-20 * (phi1 - 0.5) ** 2);
			sigA1 =
				Math.sin(2 * Math.PI * carrierPhase + fb1 * voice.pmFeedback1) *
				formantWindow;
		} else {
			distorted1 = applyTransfer(useWave1 as WaveformId, phi1);
			const lerped1 = distorted1 * dcw1 + phi1 * (1 - dcw1);
			sigA1 = Math.sin(2 * Math.PI * lerped1 + fb1 * voice.pmFeedback1);
		}
		voice.pmFeedback1 = sigA1;
		const s1 = sigA1 * applyWindow(line1.window, phi1, dca1);

		// Line 2 sample
		let distorted2: number;
		let sigB1: number;
		if (line2.warpAlgo === "karpunk") {
			const delaySamples2 = Math.floor(sr / freq2);
			const safeDelay2 = Math.max(1, Math.min(2047, delaySamples2));
			const readPos2 = (voice.ksWritePos2 - safeDelay2 + 2048) % 2048;
			const currentSample2 = voice.ksBuffer2[readPos2];
			const filteredSample2 =
				(currentSample2 + voice.ksLastSample2) * 0.5 * 0.99;
			voice.ksBuffer2[voice.ksWritePos2] = filteredSample2;
			voice.ksLastSample2 = filteredSample2;
			voice.ksWritePos2 = (voice.ksWritePos2 + 1) % 2048;
			sigB1 = filteredSample2;
		} else if (line2.warpAlgo === "fof") {
			const carrierPhase2 = (phi2 * 5.0) % 1.0;
			const formantWindow2 = Math.exp(-20 * (phi2 - 0.5) ** 2);
			sigB1 =
				Math.sin(2 * Math.PI * carrierPhase2 + fb2 * voice.pmFeedback2) *
				formantWindow2;
		} else {
			distorted2 = applyTransfer(useWave2 as WaveformId, phi2);
			const lerped2 = distorted2 * dcw2 + phi2 * (1 - dcw2);
			sigB1 = Math.sin(2 * Math.PI * lerped2 + fb2 * voice.pmFeedback2);
		}
		voice.pmFeedback2 = sigB1;
		const s2 = sigB1 * applyWindow(line2.window, phi2, dca2);

		let voiceSample = 0;
		const l1Mod = line1.modulation > 0.01;
		const l2Mod = line2.modulation > 0.01;

		if (l1Mod && l2Mod) {
			voiceSample = s1 * s2;
		} else if (lineSelect === "L1") {
			voiceSample = s1;
		} else if (lineSelect === "L2") {
			voiceSample = s2;
		} else {
			voiceSample = (s1 + s2) / 2;
		}

		output += voiceSample;
		activeLines++;
	}

	if (activeLines > 0) {
		output = output / activeLines;
	}

	return Math.max(-1, Math.min(1, output * engine.volume));
}
