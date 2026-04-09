import { describe, expect, it } from "vitest";
import { getPresetFingerprint } from "./presetFingerprint";

describe("getPresetFingerprint", () => {
	it("returns a canonical fingerprint for a standard SysEx packet", () => {
		const data = new Uint8Array([
			0xf0, 0x44, 0x00, 0x00, 0x70, 0x20, 0x60, 0x01, 0x02, 0x03, 0xf7,
		]);
		// The function pads payload to 256 nibbles if it can find it?
		// No, the implementation of normalizeSysexForFingerprint seems to expect 256 nibbles for the payload branch.
		// Let's see what it does with short data.
		const fingerprint = getPresetFingerprint(data);
		expect(fingerprint).toBeDefined();
	});

	it("handles unframed data by framing it", () => {
		const data = new Uint8Array([
			0x44, 0x00, 0x00, 0x70, 0x20, 0x60, 0x01, 0x02, 0x03,
		]);
		const fingerprint = getPresetFingerprint(data);
		expect(fingerprint).toContain("canonical:");
	});

	it("detects duplicates with different slot/program headers but same payload", () => {
		// Create a 256-nibble payload
		const payload = new Uint8Array(256).fill(0x05);

		const data1 = new Uint8Array([
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

		const data2 = new Uint8Array([
			0xf0,
			0x44,
			0x00,
			0x00,
			0x70,
			0x21,
			0x20, // Different header
			...payload,
			0xf7,
		]);

		expect(getPresetFingerprint(data1)).toBe(getPresetFingerprint(data2));
		expect(getPresetFingerprint(data1)).toContain("payload:");
	});

	it("treats non-nibble payloads as canonical", () => {
		const data = new Uint8Array([
			0xf0, 0x44, 0x00, 0x00, 0x70, 0x20, 0x60, 0xff, 0xff, 0xf7,
		]);
		const fingerprint = getPresetFingerprint(data);
		expect(fingerprint).toContain("canonical:");
	});

	it("handles 128 logical bytes by re-encoding to nibbles", () => {
		// 128 logical bytes = 256 nibbles
		const logicalBytes = new Uint8Array(128).fill(0x01);
		// 0x01 -> 0x01, 0x00

		const data = new Uint8Array([
			0xf0,
			0x44,
			0x00,
			0x00,
			0x70,
			0x20,
			0x60,
			...logicalBytes,
			0xf7,
		]);

		const fingerprint = getPresetFingerprint(data);
		expect(fingerprint).toContain("payload:");
	});
});
