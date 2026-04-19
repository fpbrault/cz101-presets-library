import { describe, expect, it } from "vitest";
import type { DecodedPatch } from "@/lib/midi/czSysexDecoder";
import { convertDecodedPatchToSynthPreset } from "@/lib/synth/czPresetConverter";

const basePatch: DecodedPatch = {
	lineSelect: "L1",
	octave: 1,
	detuneDirection: "+",
	detuneFine: 10,
	detuneOctave: 1,
	detuneNote: 5,
	vibratoWave: 2,
	vibratoDelay: 12,
	vibratoRate: 34,
	vibratoDepth: 56,
	dco1: {
		firstWaveform: 6,
		secondWaveform: 2,
		modulation: "ring",
	},
	dco2: {
		firstWaveform: 8,
		secondWaveform: 3,
		modulation: "noise",
	},
	dca1KeyFollow: 1,
	dcw1KeyFollow: 2,
	dca2KeyFollow: 3,
	dcw2KeyFollow: 4,
	dca1: {
		steps: [{ rate: 50, level: 99, falling: false }],
		endStep: 1,
	},
	dcw1: {
		steps: [{ rate: 51, level: 88, falling: false, sustain: true }],
		endStep: 1,
	},
	dco1Env: {
		steps: [{ rate: 52, level: 77, falling: false }],
		endStep: 1,
	},
	dca2: {
		steps: [{ rate: 53, level: 66, falling: false }],
		endStep: 1,
	},
	dcw2: {
		steps: [{ rate: 54, level: 55, falling: false }],
		endStep: 1,
	},
	dco2Env: {
		steps: [{ rate: 55, level: 44, falling: false }],
		endStep: 1,
	},
};

describe("convertDecodedPatchToSynthPreset", () => {
	it("maps CZ waveforms onto the visualizer algorithms", () => {
		const preset = convertDecodedPatchToSynthPreset(basePatch);

		expect(preset.warpAAlgo).toBe("sawPulse");
		expect(preset.algo2A).toBe("square");
		expect(preset.modMode).toBe("ring");
		expect(preset.warpBAlgo).toBe("saw");
	});

	it("maps dual-line CZ modes into visualizer line modes and preserves line 2", () => {
		const preset = convertDecodedPatchToSynthPreset({
			...basePatch,
			lineSelect: "L1+2'",
		});

		expect(preset.lineSelect).toBe("L1+L2'");
		expect(preset.warpAAlgo).toBe("sawPulse");
		expect(preset.warpBAlgo).toBe('pulse2');
		expect(preset.algo2B).toBe('pulse');
		expect(preset.modMode).toBe("ring"); // global modMode set from dco1 (line 1 takes precedence)
		expect(preset.line2Detune).toBe(1720);
		expect(preset.line2Octave).toBe(1);
		expect(preset.line2DcaKeyFollow).toBe(3);
		expect(preset.line2DcwKeyFollow).toBe(4);
	});
});
