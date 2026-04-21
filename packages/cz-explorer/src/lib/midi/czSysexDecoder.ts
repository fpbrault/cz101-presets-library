/**
 * CZ-101/1000 SysEx patch decoder.
 *
 * See docs/CZ101_SYSEX_FORMAT.md for the full format reference.
 *
 * The `sysexData` Uint8Array includes the F0 header (7 bytes) and F7 tail.
 * The 256 nibble-bytes encoding the 128 logical bytes start at offset 7.
 */

// ---------------------------------------------------------------------------
// Helper: read a logical byte from nibble-encoded SysEx data
// ---------------------------------------------------------------------------

/** Read one logical byte from the nibble stream.
 *  @param data     Raw sysexData (full packet including F0 header)
 *  @param logIdx   Logical byte index (0-based, within the 128-byte payload)
 */
function logicalByte(data: Uint8Array, logIdx: number): number {
	const off = 7 + logIdx * 2;
	return ((data[off + 1] & 0x0f) << 4) | (data[off] & 0x0f);
}

function ensureFraming(data: Uint8Array): Uint8Array {
	let framed = data;
	if (!framed.length) return framed;

	if (framed[0] !== 0xf0) {
		framed = new Uint8Array([0xf0, ...framed]);
	}
	if (framed[framed.length - 1] !== 0xf7) {
		framed = new Uint8Array([...framed, 0xf7]);
	}

	return framed;
}

function isNibblePayload(payload: Uint8Array): boolean {
	return payload.every((byte) => byte >= 0x00 && byte <= 0x0f);
}

function extractNibblePayload(data: Uint8Array): Uint8Array | null {
	// Canonical packets start payload at index 7, but some synth variants prepend
	// different command/program bytes while keeping the same 256-nibble payload.
	const maxOffset = Math.min(data.length - 256 - 1, 20);
	for (let offset = 7; offset <= maxOffset; offset++) {
		const payload = data.slice(offset, offset + 256);
		if (payload.length === 256 && isNibblePayload(payload)) {
			return payload;
		}
	}
	return null;
}

function toCanonicalPacket(payload: Uint8Array): Uint8Array {
	return new Uint8Array([
		0xf0,
		0x44,
		0x00,
		0x00,
		0x70,
		0x20,
		0x60,
		...payload,
		0xf7,
	]);
}

// ---------------------------------------------------------------------------
// Envelope step
// ---------------------------------------------------------------------------

export interface EnvelopeStep {
	rate: number; // 0–99
	level: number; // 0–99
	falling: boolean;
	sustain?: boolean; // DCW only
}

const clamp99 = (value: number): number => Math.max(0, Math.min(99, value));

// DCA rate/level (sections 12, 21)
function decodeDcaStep(rateByte: number, levelByte: number): EnvelopeStep {
	const rawRate = rateByte & 0x7f;
	const falling = (rateByte & 0x80) !== 0;
	const rate =
		rawRate === 0
			? 0
			: rawRate === 0x7f
				? 99
				: Math.floor((99 * rawRate) / 119) + 1;

	const rawLevel = levelByte & 0x7f;
	const level =
		rawLevel === 0
			? 0
			: rawLevel === 0x7f
				? 99
				: Math.floor((99 * rawLevel) / 127) + 1;

	return {
		rate: clamp99(rate),
		level: clamp99(level),
		falling,
		sustain: (levelByte & 0x80) !== 0,
	};
}

function readDcaEnvelope(
	data: Uint8Array,
	startLogIdx: number,
	endStepLogIdx: number,
): { steps: EnvelopeStep[]; endStep: number } {
	const endStep = Math.max(
		1,
		Math.min(8, logicalByte(data, endStepLogIdx) + 1),
	);
	const steps: EnvelopeStep[] = [];
	let previousLevel = 0;

	for (let i = 0; i < 8; i++) {
		const rateByte = logicalByte(data, startLogIdx + i * 2);
		const levelByte = logicalByte(data, startLogIdx + i * 2 + 1);
		const baseStep = decodeDcaStep(rateByte, levelByte);

		// CZ patches (and CZVirtual) treat falling DCA steps as a relative drop
		// from the previous level, encoded by the distance from 0x7F.
		if (baseStep.falling) {
			const rawLevel = levelByte & 0x7f;
			const drop = 0x7f - rawLevel;
			baseStep.level = clamp99(previousLevel - drop);
		}

		steps.push(baseStep);
		previousLevel = baseStep.level;
	}

	return { steps, endStep };
}

// DCW rate/level (sections 14, 23)
function decodeDcwStep(rateByte: number, levelByte: number): EnvelopeStep {
	const rawRate = rateByte & 0x7f;
	const rate =
		rawRate === 8
			? 0
			: rawRate === 0x77
				? 99
				: Math.floor((99 * (rawRate - 8)) / 119) + 1;

	const level =
		(levelByte & 0x7f) === 0
			? 0
			: (levelByte & 0x7f) === 0x7f
				? 99
				: Math.floor((99 * (levelByte & 0x7f)) / 127) + 1;

	return {
		rate: clamp99(rate),
		level: clamp99(level),
		falling: (rateByte & 0x80) !== 0,
		sustain: (levelByte & 0x80) !== 0,
	};
}

// DCO rate/level (sections 16, 25)
function decodeDcoStep(rateByte: number, levelByte: number): EnvelopeStep {
	const rate =
		rateByte === 0
			? 0
			: rateByte === 0x7f
				? 99
				: Math.floor((99 * rateByte) / 127) + 1;

	let level: number;
	if (levelByte <= 0x3f) {
		level = levelByte;
	} else if (levelByte >= 0x44) {
		level = 64 + (levelByte - 0x44);
	} else {
		level = 63; // 0x40–0x43 undefined range
	}

	return { rate: clamp99(rate), level: clamp99(level), falling: false };
}

function readEnvelope(
	data: Uint8Array,
	startLogIdx: number,
	endStepLogIdx: number,
	decoder: (r: number, l: number) => EnvelopeStep,
): { steps: EnvelopeStep[]; endStep: number } {
	const endStep = Math.max(
		1,
		Math.min(8, logicalByte(data, endStepLogIdx) + 1),
	); // 1-based (1..8)
	const steps: EnvelopeStep[] = [];
	for (let i = 0; i < 8; i++) {
		const rateByte = logicalByte(data, startLogIdx + i * 2);
		const levelByte = logicalByte(data, startLogIdx + i * 2 + 1);
		steps.push(decoder(rateByte, levelByte));
	}
	return { steps, endStep };
}

// ---------------------------------------------------------------------------
// Waveform / modulation
// ---------------------------------------------------------------------------

export type WaveformId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ModulationType = "none" | "ring" | "noise";

export interface WaveformConfig {
	firstWaveform: WaveformId;
	secondWaveform: WaveformId | null;
	modulation: ModulationType;
}

const WF_NAMES: Record<WaveformId, string> = {
	1: "Sawtooth",
	2: "Square",
	3: "Pulse",
	4: "Null",
	5: "Sine-Pulse",
	6: "Saw-Pulse",
	7: "Multi-Sine",
	8: "Pulse 2",
};

// 3-bit prefix → waveform id (index 3 is unused/invalid in original spec)
const BITS_TO_WF: Record<number, WaveformId> = {
	0: 1,
	1: 2,
	2: 3,
	4: 4,
	5: 5,
};

function bitsToWaveform(bits: number, wtExt: number): WaveformId {
	if (bits === 0b110) {
		if (wtExt === 0b001) return 6;
		if (wtExt === 0b010) return 7;
		if (wtExt === 0b011) return 8;
		return 6; // fallback
	}
	return BITS_TO_WF[bits] ?? 1;
}

function decodeWaveform(
	data: Uint8Array,
	logIdx: number,
	ignoreModulation = false,
): WaveformConfig {
	const b1 = logicalByte(data, logIdx);
	const b2 = logicalByte(data, logIdx + 1);

	const fwfBits = (b1 >> 5) & 0x07;
	const swfBits = (b1 >> 2) & 0x07;
	const slActive = (b1 >> 1) & 0x01;
	const wtExt = b2 & 0x07;
	const modBits = (b2 >> 3) & 0x07;

	const firstWaveform = bitsToWaveform(fwfBits, wtExt);
	const secondWaveform = slActive ? bitsToWaveform(swfBits, wtExt) : null;

	let modulation: ModulationType = "none";
	if (!ignoreModulation) {
		if (modBits === 0b100) modulation = "ring";
		else if (modBits === 0b011) modulation = "noise";
	}

	return { firstWaveform, secondWaveform, modulation };
}

// ---------------------------------------------------------------------------
// Key follow
// ---------------------------------------------------------------------------

function decodeKeyFollow(data: Uint8Array, logIdx: number): number {
	// First byte (xMD) directly equals the key-follow value 0–9
	return logicalByte(data, logIdx) & 0x0f;
}

// ---------------------------------------------------------------------------
// Main decoded patch structure
// ---------------------------------------------------------------------------

export interface DecodedPatch {
	// PFLAG
	lineSelect: "L1" | "L2" | "L1+1'" | "L1+2'";
	octave: -1 | 0 | 1;

	// Detune
	detuneDirection: "+" | "-";
	detuneFine: number; // 0–60
	detuneOctave: number; // 0–3
	detuneNote: number; // 0–11

	// Vibrato
	vibratoWave: 1 | 2 | 3 | 4;
	vibratoDelay: number; // 0–99 (approximated from first byte)
	vibratoRate: number; // 0–99 (approximated)
	vibratoDepth: number; // 0–99 (approximated)

	// DCO1 / DCO2
	dco1: WaveformConfig;
	dco2: WaveformConfig;

	// Key follow (0–9)
	dca1KeyFollow: number;
	dcw1KeyFollow: number;
	dca2KeyFollow: number;
	dcw2KeyFollow: number;

	// Envelopes
	dca1: { steps: EnvelopeStep[]; endStep: number };
	dcw1: { steps: EnvelopeStep[]; endStep: number };
	dco1Env: { steps: EnvelopeStep[]; endStep: number };
	dca2: { steps: EnvelopeStep[]; endStep: number };
	dcw2: { steps: EnvelopeStep[]; endStep: number };
	dco2Env: { steps: EnvelopeStep[]; endStep: number };
}

const LINE_SELECT_MAP: Record<number, DecodedPatch["lineSelect"]> = {
	0: "L1",
	1: "L2",
	2: "L1+1'",
	3: "L1+2'",
};

const VIBRATO_WAVE_MAP: Record<number, 1 | 2 | 3 | 4> = {
	8: 1,
	4: 2,
	32: 3,
	2: 4,
};

/**
 * Decode a raw CZ-101 SysEx preset packet into human-readable parameters.
 * Returns `null` if the data is too short to be a valid preset.
 */
export function decodeCzPatch(sysexData: Uint8Array): DecodedPatch | null {
	if (!sysexData || sysexData.length < 16) return null;

	const framed = ensureFraming(sysexData);
	const payload = extractNibblePayload(framed);
	if (!payload) return null;

	// Decode from a normalized packet shape so all section offsets are stable.
	const normalized = toCanonicalPacket(payload);

	// Section 1 — PFLAG
	const pflag = logicalByte(normalized, 0);
	const octaveRaw = (pflag >> 2) & 0x03;
	const octave: -1 | 0 | 1 = octaveRaw === 2 ? -1 : octaveRaw === 1 ? 1 : 0;
	const lineSelect = LINE_SELECT_MAP[pflag & 0x03] ?? "L1";

	// Section 2 — PDS
	const pds = logicalByte(normalized, 1);
	const detuneDirection: "+" | "-" = pds === 0x01 ? "-" : "+";

	// Section 3 — PDL / PDH
	const pdl = logicalByte(normalized, 2);
	const pdh = logicalByte(normalized, 3);
	const detuneFine = (pdl & 0x0f) + (pdl >> 4) * 16;
	const detuneOctave = Math.floor(pdh / 12);
	const detuneNote = pdh % 12;

	// Section 4 — PVK
	const pvk = logicalByte(normalized, 4);
	const vibratoWave = VIBRATO_WAVE_MAP[pvk] ?? 1;

	// Sections 5/6/7 — first byte approximates the value (0–99)
	const vibratoDelay = logicalByte(normalized, 5);
	const vibratoRate = logicalByte(normalized, 8);
	const vibratoDepth = logicalByte(normalized, 11);

	// Section 8 — MFW (DCO1 waveform)
	const dco1 = decodeWaveform(normalized, 14);

	// Section 9 — DCA1 key follow
	const dca1KeyFollow = decodeKeyFollow(normalized, 16);
	// Section 10 — DCW1 key follow
	const dcw1KeyFollow = decodeKeyFollow(normalized, 18);

	// Sections 11/12 — DCA1 envelope
	const dca1 = readDcaEnvelope(normalized, 21, 20);
	// Sections 13/14 — DCW1 envelope
	const dcw1 = readEnvelope(normalized, 38, 37, decodeDcwStep);
	// Sections 15/16 — DCO1 envelope
	const dco1Env = readEnvelope(normalized, 55, 54, decodeDcoStep);

	// Section 17 — SFW (DCO2 waveform, modulation bits ignored)
	const dco2 = decodeWaveform(normalized, 71, true);

	// Section 18 — DCA2 key follow
	const dca2KeyFollow = decodeKeyFollow(normalized, 73);
	// Section 19 — DCW2 key follow
	const dcw2KeyFollow = decodeKeyFollow(normalized, 75);

	// Sections 20/21 — DCA2 envelope
	const dca2 = readDcaEnvelope(normalized, 78, 77);
	// Sections 22/23 — DCW2 envelope
	const dcw2 = readEnvelope(normalized, 95, 94, decodeDcwStep);
	// Sections 24/25 — DCO2 envelope
	const dco2Env = readEnvelope(normalized, 112, 111, decodeDcoStep);

	return {
		lineSelect,
		octave,
		detuneDirection,
		detuneFine,
		detuneOctave,
		detuneNote,
		vibratoWave,
		vibratoDelay,
		vibratoRate,
		vibratoDepth,
		dco1,
		dco2,
		dca1KeyFollow,
		dcw1KeyFollow,
		dca2KeyFollow,
		dcw2KeyFollow,
		dca1,
		dcw1,
		dco1Env,
		dca2,
		dcw2,
		dco2Env,
	};
}

// Re-export for convenience
export { WF_NAMES };
