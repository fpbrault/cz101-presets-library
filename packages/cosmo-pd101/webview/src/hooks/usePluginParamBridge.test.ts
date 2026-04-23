import { describe, expect, it } from "vitest";
import {
	CZ_WAVEFORM_IDX,
	mapAlgoKeyToId,
	mapAlgoKeyToWaveform,
	mapInboundOptionalWarpAlgoId,
	mapInboundWarpAlgoId,
	mapInboundWaveformIndex,
} from "./usePluginParamBridge";

describe("usePluginParamBridge mapping helpers", () => {
	it("maps waveform algos to cz101 with the waveform index carried separately", () => {
		expect(mapAlgoKeyToId("saw")).toBe(0);
		expect(mapAlgoKeyToWaveform("sawPulse", "square")).toBe(
			CZ_WAVEFORM_IDX.sawPulse,
		);
	});

	it("uses the current slot waveform when the algo is cz101", () => {
		expect(mapAlgoKeyToId("cz101")).toBe(0);
		expect(mapAlgoKeyToWaveform("cz101", "pulse2")).toBe(
			CZ_WAVEFORM_IDX.pulse2,
		);
	});

	it("forces sine-carrier waveform for non-CZ warp algos", () => {
		expect(mapAlgoKeyToId("bend")).toBe(1);
		expect(mapAlgoKeyToWaveform("bend", "pulse2")).toBe(0);
	});

	it("maps DoubleSine and MultiSine indices back to multiSine", () => {
		expect(mapInboundWaveformIndex(5)).toBe("multiSine");
		expect(mapInboundWaveformIndex(7)).toBe("multiSine");
	});

	it("ignores invalid inbound waveform indices", () => {
		expect(mapInboundWaveformIndex(999)).toBeUndefined();
	});

	it("maps inbound warp ids and optional warp ids safely", () => {
		expect(mapInboundWarpAlgoId(1)).toBe("bend");
		expect(mapInboundWarpAlgoId(999)).toBe("cz101");
		expect(mapInboundOptionalWarpAlgoId(-1)).toBeNull();
		expect(mapInboundOptionalWarpAlgoId(12)).toBe("karpunk");
	});
});
