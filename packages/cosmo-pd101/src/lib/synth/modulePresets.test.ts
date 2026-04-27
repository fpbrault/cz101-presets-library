import { describe, expect, it } from "vitest";
import {
	CHORUS_PRESETS,
	DELAY_PRESETS,
	getLfoModulePatch,
	LFO_PRESETS,
	MOD_ENV_PRESETS,
	PHASE_MOD_PRESETS,
	PHASER_PRESETS,
	REVERB_PRESETS,
	VIBRATO_PRESETS,
} from "@/lib/synth/modulePresets";

describe("module presets", () => {
	it("provides at least three presets for each supported module", () => {
		expect(CHORUS_PRESETS).toHaveLength(3);
		expect(DELAY_PRESETS).toHaveLength(3);
		expect(REVERB_PRESETS).toHaveLength(3);
		expect(PHASER_PRESETS).toHaveLength(3);
		expect(VIBRATO_PRESETS).toHaveLength(3);
		expect(PHASE_MOD_PRESETS).toHaveLength(3);
		expect(LFO_PRESETS).toHaveLength(3);
		expect(MOD_ENV_PRESETS).toHaveLength(3);
	});

	it("maps LFO preset payloads to the expected target module", () => {
		const lfoPresetPatch = LFO_PRESETS[0]?.patch;
		if (!lfoPresetPatch) {
			throw new Error("Expected at least one LFO preset");
		}

		expect(getLfoModulePatch(1, lfoPresetPatch)).toEqual({ lfo: lfoPresetPatch });
		expect(getLfoModulePatch(2, lfoPresetPatch)).toEqual({
			lfo2: lfoPresetPatch,
		});
	});
});
