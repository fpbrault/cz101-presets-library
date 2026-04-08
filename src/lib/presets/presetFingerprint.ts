/**
 * Shared preset fingerprinting utility.
 *
 * Exported `getPresetFingerprint` is the single source of truth for
 * duplicate-detection used by filterPresets, DuplicateFinderPage, and
 * presetManager so grouping and filtering are always consistent.
 */

function ensureSysexFraming(data: Uint8Array): Uint8Array {
	if (data.length === 0) return data;
	if (data[0] === 0xf0 && data[data.length - 1] === 0xf7) return data;
	return new Uint8Array([0xf0, ...data, 0xf7]);
}

function isNibblePayload(payload: Uint8Array): boolean {
	return payload.every((byte) => byte >= 0x00 && byte <= 0x0f);
}

function toCanonicalVoicePacketFromNibblePayload(
	payload: Uint8Array,
): Uint8Array {
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

function toCanonicalVoicePacketFromLogicalPayload(
	payload: Uint8Array,
): Uint8Array {
	const nibblePayload: number[] = [];
	for (const value of payload) {
		nibblePayload.push(value & 0x0f, (value >> 4) & 0x0f);
	}
	return toCanonicalVoicePacketFromNibblePayload(
		Uint8Array.from(nibblePayload),
	);
}

/**
 * Normalize a SysEx packet to a canonical form for fingerprinting.
 * Replicates the logic of `normalizeSysexForLibrary` from presetManager but
 * is kept here to avoid a circular module dependency (presetManager imports
 * filterPresets which imports this module).
 */
function normalizeSysexForFingerprint(data: Uint8Array): Uint8Array {
	const framed = ensureSysexFraming(data);

	// Canonical: payload starts at offset 7 and is 256 nibble bytes.
	if (framed.length >= 264) {
		const payload = framed.slice(7, 7 + 256);
		if (payload.length === 256 && isNibblePayload(payload)) {
			return toCanonicalVoicePacketFromNibblePayload(payload);
		}
	}

	// Tolerate command/program variations shifting payload start.
	for (let offset = 5; offset <= 16; offset++) {
		if (framed.length >= offset + 256 + 1) {
			const payload = framed.slice(offset, offset + 256);
			if (payload.length === 256 && isNibblePayload(payload)) {
				return toCanonicalVoicePacketFromNibblePayload(payload);
			}
		}
	}

	// Some dumps may carry 128 logical bytes; re-encode to canonical nibble stream.
	for (let offset = 5; offset <= 16; offset++) {
		if (framed.length >= offset + 128 + 1) {
			const payload = framed.slice(offset, offset + 128);
			if (payload.length === 128) {
				return toCanonicalVoicePacketFromLogicalPayload(payload);
			}
		}
	}

	// Preserve input if no known shape is detected.
	return framed;
}

/**
 * Compute a slot-agnostic fingerprint for a CZ-101 preset SysEx packet.
 *
 * Presets with identical patch data but different slot/bank headers are
 * considered duplicates and will produce the same fingerprint. This function
 * is the single source of truth for duplicate detection across filterPresets,
 * DuplicateFinderPage, and presetManager.
 *
 * @param data - Raw SysEx `Uint8Array` (framed or unframed).
 * @returns A string fingerprint.
 */
export function getPresetFingerprint(data: Uint8Array): string {
	const normalized = normalizeSysexForFingerprint(data);
	const framed = ensureSysexFraming(normalized);

	// After normalization the nibble payload lives at offset 7.
	if (framed.length >= 264) {
		const payload = framed.slice(7, 7 + 256);
		if (payload.length === 256 && isNibblePayload(payload)) {
			return `payload:${Array.from(payload).join(",")}`;
		}
	}

	return `canonical:${Array.from(framed).join(",")}`;
}
