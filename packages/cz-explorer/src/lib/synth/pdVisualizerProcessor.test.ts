import { describe, expect, it } from "vitest";
import {
	applyWarpAlgo,
	applyWindow,
	czWaveform,
	lerp,
	pdTransfer,
	type WarpAlgo,
	type WaveformId,
	type WindowType,
	warpBend,
	warpClip,
	warpCz101,
	warpFold,
	warpMirror,
	warpPinch,
	warpQuantize,
	warpRipple,
	warpSkew,
	warpSync,
	warpTwist,
	wrap01,
} from "@/lib/synth/pdVisualizerProcessor.ts";

describe("pdVisualizerProcessor utilities", () => {
	describe("lerp", () => {
		it("returns a when t = 0", () => {
			expect(lerp(10, 20, 0)).toBe(10);
		});

		it("returns b when t = 1", () => {
			expect(lerp(10, 20, 1)).toBe(20);
		});

		it("returns midpoint when t = 0.5", () => {
			expect(lerp(10, 20, 0.5)).toBe(15);
		});

		it("extrapolates when t > 1", () => {
			expect(lerp(10, 20, 2)).toBe(30);
		});

		it("extrapolates when t < 0", () => {
			expect(lerp(10, 20, -0.5)).toBe(5);
		});
	});

	describe("wrap01", () => {
		it("returns value unchanged when in [0, 1)", () => {
			expect(wrap01(0)).toBe(0);
			expect(wrap01(0.5)).toBe(0.5);
			expect(wrap01(0.99)).toBeCloseTo(0.99);
		});

		it("wraps values > 1", () => {
			expect(wrap01(1.5)).toBe(0.5);
			expect(wrap01(2)).toBe(0);
			expect(wrap01(3.25)).toBeCloseTo(0.25);
		});

		it("handles negative values", () => {
			expect(wrap01(-0.5)).toBe(0.5);
			expect(wrap01(-1)).toBe(0);
			expect(wrap01(-1.25)).toBeCloseTo(0.75);
		});
	});

	describe("pdTransfer", () => {
		it("waveform 1 returns identity", () => {
			expect(pdTransfer(1, 0.3)).toBe(0.3);
			expect(pdTransfer(1, 0.7)).toBe(0.7);
		});

		it("waveform 2 is square wave", () => {
			expect(pdTransfer(2, 0)).toBe(0);
			expect(pdTransfer(2, 0.49)).toBe(0);
			expect(pdTransfer(2, 0.5)).toBe(1);
			expect(pdTransfer(2, 1)).toBe(1);
		});

		it("waveform 3 is pulse between 0.25 and 0.75", () => {
			expect(pdTransfer(3, 0.1)).toBe(0);
			expect(pdTransfer(3, 0.25)).toBe(1);
			expect(pdTransfer(3, 0.5)).toBe(1);
			expect(pdTransfer(3, 0.75)).toBe(0);
			expect(pdTransfer(3, 0.9)).toBe(0);
		});

		it("waveform 4 has spike at start", () => {
			expect(pdTransfer(4, 0)).toBe(0);
			expect(pdTransfer(4, 0.005)).toBeCloseTo(0.5, 2);
			expect(pdTransfer(4, 0.5)).toBe(0);
		});

		it("waveform 7 produces resonance", () => {
			const val = pdTransfer(7, 0.5);
			expect(val).toBeCloseTo(0.5, 2);
		});
	});

	describe("czWaveform", () => {
		it("waveform 1 outputs sawtooth", () => {
			expect(czWaveform(1, 0)).toBe(-1);
			expect(czWaveform(1, 0.5)).toBe(0);
			expect(czWaveform(1, 0)).toBe(-1); // wrap01(1) = 0
		});

		it("waveform 2 outputs square", () => {
			expect(czWaveform(2 as WaveformId, 0.3)).toBe(-1);
			expect(czWaveform(2 as WaveformId, 0.7)).toBe(1);
		});

		it("waveform 7 outputs sine of distorted phase", () => {
			const result = czWaveform(7, 0);
			expect(result).toBeCloseTo(0, 5);
		});
	});

	describe("applyWindow", () => {
		it("off returns 1", () => {
			expect(applyWindow(0.5, "off" as WindowType)).toBe(1);
			expect(applyWindow(0.5, 0)).toBe(1);
		});

		it("saw returns phase value", () => {
			expect(applyWindow(0.5, "saw" as WindowType)).toBe(0.5);
			expect(applyWindow(0, "saw" as WindowType)).toBe(0);
			expect(applyWindow(1, "saw" as WindowType)).toBe(1);
		});

		it("triangle returns inverted triangle wave", () => {
			expect(applyWindow(0, "triangle")).toBe(0);
			expect(applyWindow(0.25, "triangle")).toBe(0.5);
			expect(applyWindow(0.5, "triangle")).toBe(1);
			expect(applyWindow(0.75, "triangle")).toBe(0.5);
			expect(applyWindow(1, "triangle")).toBe(0);
		});
	});

	describe("warpBend", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpBend(0.5, 0)).toBe(0.5);
		});

		it("warps phase with exponential curve", () => {
			const result = warpBend(0.5, 0.5);
			// Bend compresses middle around 0.5, so it should move away from center
			expect(result).not.toBe(0.5);
		});
	});

	describe("warpSync", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpSync(0.3, 0)).toBe(0.3);
		});

		it("multiplies phase by ratio", () => {
			const result = warpSync(0.2, 0.5);
			expect(result).toBeCloseTo(0.2 * (1 + 0.5 * 7));
		});
	});

	describe("warpPinch", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpPinch(0.5, 0)).toBe(0.5);
		});

		it("pinches toward center", () => {
			const center = warpPinch(0.5, 0.5);
			expect(center).toBe(0.5);
		});
	});

	describe("warpFold", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpFold(0.3, 0)).toBe(0.3);
		});

		it("folds phase values", () => {
			const result = warpFold(0.8, 0.5);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThan(1);
		});
	});

	describe("warpSkew", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpSkew(0.5, 0)).toBe(0.5);
		});

		it("skews phase toward breakpoint", () => {
			const result = warpSkew(0.1, 0.5);
			// Skew should move phase toward 0.5 range
			expect(result).not.toBe(0.1);
		});
	});

	describe("warpCz101", () => {
		it("returns phase unchanged (CZ handled at output)", () => {
			expect(warpCz101(0.5, 0.8, 1 as WaveformId)).toBe(0.5);
		});
	});

	describe("warpQuantize", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpQuantize(0.37, 0)).toBe(0.37);
		});

		it("quantizes to discrete levels", () => {
			const result = warpQuantize(0.34, 1);
			// 32 levels: 0.34 * 32 = 10.88 -> rounds to 11 -> 11/32 = 0.34375
			expect(result).toBeCloseTo(0.34375, 2);
		});
	});

	describe("warpTwist", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpTwist(0.5, 0)).toBe(0.5);
		});

		it("adds sinusoidal modulation", () => {
			const result = warpTwist(0.25, 0.5);
			expect(result).not.toBe(0.25);
		});
	});

	describe("warpClip", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpClip(0.5, 0)).toBe(0.5);
		});

		it("clips phase to narrower range", () => {
			const result = warpClip(0.5, 0.5);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});
	});

	describe("warpRipple", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpRipple(0.5, 0)).toBe(0.5);
		});

		it("adds high frequency ripple", () => {
			const result = warpRipple(0.3, 0.5);
			expect(result).not.toBe(0.3);
		});
	});

	describe("warpMirror", () => {
		it("returns phase unchanged when amt = 0", () => {
			expect(warpMirror(0.3, 0)).toBe(0.3);
		});

		it("mirrors around center", () => {
			const low = warpMirror(0.2, 0.5);
			const high = warpMirror(0.8, 0.5);
			expect(low).toBeCloseTo(high, 5);
		});
	});

	describe("applyWarpAlgo", () => {
		it.each([
			["bend", 0.5],
			["sync", 0.5],
			["pinch", 0.5],
			["fold", 0.5],
			["cz101", 0.5],
			["skew", 0.5],
			["quantize", 0.5],
			["twist", 0.5],
			["clip", 0.5],
			["ripple", 0.5],
			["mirror", 0.5],
			["sine", 0.5],
		] as const)("returns phase unchanged when amt = 0 for %s", (algo, phase) => {
			expect(applyWarpAlgo(algo as WarpAlgo, phase, 0)).toBeCloseTo(phase);
		});

		it.each([
			["bend", 0.25, 0.3],
			["sync", 0.25, 0.3],
			["pinch", 0.25, 0.3],
			["fold", 0.25, 0.3],
			["skew", 0.25, 0.3],
			["quantize", 0.25, 0.3],
			["twist", 0.3, 0.3],
			["clip", 0.25, 0.3],
			["ripple", 0.32, 0.3],
			["mirror", 0.25, 0.3],
		] as const)("modifies phase when amt > 0 for %s", (algo, phase, amt) => {
			const result = applyWarpAlgo(algo as WarpAlgo, phase, amt);
			expect(result).not.toBeCloseTo(phase);
		});
	});
});
