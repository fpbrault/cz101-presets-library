import { describe, expect, it } from "vitest";
import {
	applyWindow,
	type WindowId,
	windowAmplitude,
} from "@/lib/synth/windowFunction";

describe("windowFunction", () => {
	describe("applyWindow", () => {
		it("window 0 (none) returns sample unchanged", () => {
			expect(applyWindow(0 as WindowId, 0.25, 0.5)).toBeCloseTo(0.5, 10);
			expect(applyWindow(0 as WindowId, 0.75, 0.8)).toBeCloseTo(0.8, 10);
		});

		it("window 1 (saw) ramps down from 1 to 0", () => {
			expect(applyWindow(1 as WindowId, 0, 1)).toBeCloseTo(1, 10);
			expect(applyWindow(1 as WindowId, 0.5, 1)).toBeCloseTo(0.5, 10);
			expect(applyWindow(1 as WindowId, 1, 1)).toBeCloseTo(0, 10);
		});

		it("window 2 (triangle) peaks at midpoint", () => {
			expect(applyWindow(2 as WindowId, 0, 1)).toBeCloseTo(0, 10);
			expect(applyWindow(2 as WindowId, 0.5, 1)).toBeCloseTo(1, 10);
			expect(applyWindow(2 as WindowId, 0.25, 1)).toBeCloseTo(0.5, 10);
		});

		it("window 3 (trapezoid) holds at 1 for first half then drops linearly", () => {
			expect(applyWindow(3 as WindowId, 0, 1)).toBeCloseTo(1, 10);
			expect(applyWindow(3 as WindowId, 0.25, 1)).toBeCloseTo(1, 10);
			expect(applyWindow(3 as WindowId, 0.75, 1)).toBeCloseTo(0.5, 10);
		});

		it("window 4 (pulse) is 1 for first half, 0 for second", () => {
			expect(applyWindow(4 as WindowId, 0, 1)).toBe(1);
			expect(applyWindow(4 as WindowId, 0.25, 1)).toBe(1);
			expect(applyWindow(4 as WindowId, 0.75, 1)).toBe(0);
		});

		it("windows 5, 6, 7 all produce double saw shape", () => {
			const phi = 0.25;
			const val5 = applyWindow(5 as WindowId, phi, 1);
			const val6 = applyWindow(6 as WindowId, phi, 1);
			const val7 = applyWindow(7 as WindowId, phi, 1);
			expect(val5).toBeCloseTo(val6, 10);
			expect(val6).toBeCloseTo(val7, 10);
		});

		it("multiplies sample by window amplitude", () => {
			const sample = 0.7;
			const result = applyWindow(2 as WindowId, 0.5, sample);
			expect(result).toBeCloseTo(0.7, 10);
		});
	});

	describe("windowAmplitude", () => {
		it("returns 1 for window 0 (none) at any phase", () => {
			expect(windowAmplitude(0 as WindowId, 0)).toBe(1);
			expect(windowAmplitude(0 as WindowId, 0.5)).toBe(1);
			expect(windowAmplitude(0 as WindowId, 0.99)).toBe(1);
		});

		it("returns correct saw window values", () => {
			expect(windowAmplitude(1 as WindowId, 0)).toBeCloseTo(1, 10);
			expect(windowAmplitude(1 as WindowId, 0.5)).toBeCloseTo(0.5, 10);
			expect(windowAmplitude(1 as WindowId, 1)).toBeCloseTo(0, 10);
		});

		it("returns correct triangle window values", () => {
			expect(windowAmplitude(2 as WindowId, 0)).toBeCloseTo(0, 10);
			expect(windowAmplitude(2 as WindowId, 0.25)).toBeCloseTo(0.5, 10);
			expect(windowAmplitude(2 as WindowId, 0.5)).toBeCloseTo(1, 10);
			expect(windowAmplitude(2 as WindowId, 0.75)).toBeCloseTo(0.5, 10);
		});

		it("double saw is symmetric at quarter points", () => {
			expect(windowAmplitude(5 as WindowId, 0.25)).toBeCloseTo(1, 5);
			expect(windowAmplitude(5 as WindowId, 0.75)).toBeCloseTo(1, 5);
		});
	});
});
