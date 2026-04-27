import { describe, expect, it } from "vitest";
import {
	filterRoutesToSupportedDestinations,
	LEGACY_MOD_DESTINATIONS,
	parseSupportedModDestinationsFromSetParamsError,
} from "@/lib/synth/modDestinationCompatibility";

describe("parseSupportedModDestinationsFromSetParamsError", () => {
	it("extracts supported destinations from wasm parse errors", () => {
		const errorMessage =
			"setParams parse error: unknown variant 'chorusDepth', expected one of `volume`, `pitch`, `lfoRate`";

		const parsed =
			parseSupportedModDestinationsFromSetParamsError(errorMessage);

		expect(parsed).not.toBeNull();
		expect(parsed?.has("volume")).toBe(true);
		expect(parsed?.has("pitch")).toBe(true);
		expect(parsed?.has("lfoRate")).toBe(true);
		expect(parsed?.has("chorusDepth")).toBe(false);
	});

	it("returns null for unrelated errors", () => {
		const parsed =
			parseSupportedModDestinationsFromSetParamsError("network timeout");

		expect(parsed).toBeNull();
	});
});

describe("filterRoutesToSupportedDestinations", () => {
	it("drops routes that target unsupported destinations", () => {
		const routes = [
			{ source: "lfo1", destination: "volume", amount: 0.2, enabled: true },
			{
				source: "lfo1",
				destination: "chorusDepth",
				amount: 0.2,
				enabled: true,
			},
			{ source: "random", destination: "pitch", amount: 0.1, enabled: true },
		];

		const filtered = filterRoutesToSupportedDestinations(
			routes,
			LEGACY_MOD_DESTINATIONS,
		);

		expect(filtered).toEqual([
			{ source: "lfo1", destination: "volume", amount: 0.2, enabled: true },
			{ source: "random", destination: "pitch", amount: 0.1, enabled: true },
		]);
	});
});
