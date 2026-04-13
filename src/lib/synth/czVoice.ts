/**
 * CZ-101 Voice Management
 *
 * Manages a single voice's state including note, phase, and envelopes for both lines.
 */

import {
	createEnvelopeState,
	type EnvelopeParams,
	type EnvelopeState,
	envelopeNoteOff,
	envelopeNoteOn,
} from "./envelopeGenerator";
import type { WaveformId } from "./pdOscillator";
import type { WindowId } from "./windowFunction";

export interface CzVoiceParams {
	lineSelect: "L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'";
	line1: LineParams;
	line2: LineParams;
	detuneCents: number;
	octave: number;
	frequency: number;
	frequency2: number;
}

export interface LineParams {
	waveform: WaveformId;
	waveform2: WaveformId | null;
	window: WindowId;
	modulation: number;
	dcaBase: number;
	dcwBase: number;
	dcoDepth: number;
	dcaEnv: EnvelopeParams;
	dcwEnv: EnvelopeParams;
	dcoEnv: EnvelopeParams;
	dcaKeyFollow: number;
	dcwKeyFollow: number;
	feedback: number;
	warpAlgo: string;
}

export interface CzVoiceState {
	note: number | null;
	velocity: number;
	active: boolean;
	phi1: number;
	phi2: number;
	cycleCount1: number;
	cycleCount2: number;
	dcaEnv1: EnvelopeState;
	dcwEnv1: EnvelopeState;
	dcoEnv1: EnvelopeState;
	dcaEnv2: EnvelopeState;
	dcwEnv2: EnvelopeState;
	dcoEnv2: EnvelopeState;
	pmFeedback1: number;
	pmFeedback2: number;
	ksBuffer: Float32Array;
	ksWritePos: number;
	ksLastSample: number;
	ksBuffer2: Float32Array;
	ksWritePos2: number;
	ksLastSample2: number;
}

export function createVoiceState(): CzVoiceState {
	return {
		note: null,
		velocity: 0,
		active: false,
		phi1: 0,
		phi2: 0,
		cycleCount1: 0,
		cycleCount2: 0,
		dcaEnv1: createEnvelopeState(),
		dcwEnv1: createEnvelopeState(),
		dcoEnv1: createEnvelopeState(),
		dcaEnv2: createEnvelopeState(),
		dcwEnv2: createEnvelopeState(),
		dcoEnv2: createEnvelopeState(),
		pmFeedback1: 0,
		pmFeedback2: 0,
		ksBuffer: new Float32Array(2048),
		ksWritePos: 0,
		ksLastSample: 0,
		ksBuffer2: new Float32Array(2048),
		ksWritePos2: 0,
		ksLastSample2: 0,
	};
}

export function noteOn(
	voice: CzVoiceState,
	note: number,
	velocity: number,
	line1: LineParams,
	line2: LineParams,
): void {
	voice.note = note;
	voice.velocity = velocity;
	voice.active = true;

	envelopeNoteOn(voice.dcaEnv1, line1.dcaEnv);
	envelopeNoteOn(voice.dcwEnv1, line1.dcwEnv);
	envelopeNoteOn(voice.dcoEnv1, line1.dcoEnv);
	envelopeNoteOn(voice.dcaEnv2, line2.dcaEnv);
	envelopeNoteOn(voice.dcwEnv2, line2.dcwEnv);
	envelopeNoteOn(voice.dcoEnv2, line2.dcoEnv);

	voice.phi1 = 0;
	voice.phi2 = 0;
	voice.cycleCount1 = 0;
	voice.cycleCount2 = 0;

	for (let i = 0; i < voice.ksBuffer.length; i++) {
		voice.ksBuffer[i] = Math.random() * 2 - 1;
	}
	voice.ksWritePos = 0;
	voice.ksLastSample = 0;
	for (let i = 0; i < voice.ksBuffer2.length; i++) {
		voice.ksBuffer2[i] = Math.random() * 2 - 1;
	}
	voice.ksWritePos2 = 0;
	voice.ksLastSample2 = 0;
	voice.pmFeedback1 = 0;
	voice.pmFeedback2 = 0;
}

export function noteOff(voice: CzVoiceState): void {
	if (!voice.active) return;
	envelopeNoteOff(voice.dcaEnv1);
	envelopeNoteOff(voice.dcwEnv1);
	envelopeNoteOff(voice.dcoEnv1);
	envelopeNoteOff(voice.dcaEnv2);
	envelopeNoteOff(voice.dcwEnv2);
	envelopeNoteOff(voice.dcoEnv2);
}

export function isVoiceActive(voice: CzVoiceState): boolean {
	return (
		voice.active &&
		(voice.dcaEnv1.phase !== "off" || voice.dcaEnv2.phase !== "off")
	);
}
