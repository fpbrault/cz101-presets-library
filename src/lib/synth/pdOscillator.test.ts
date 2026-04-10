import { describe, expect, it } from "vitest";
import {
	advancePhase,
	applyTransfer,
	createPdOscillator,
	renderPdSample,
	type WaveformId,
} from "@/lib/synth/pdOscillator";

describe("pdOscillator", () => {
	describe("applyTransfer", () => {
		it("waveform 1 (saw) returns identity — linear phase", () => {
			for (const phi of [0, 0.25, 0.5, 0.75, 0.99]) {
				expect(applyTransfer(1 as WaveformId, phi)).toBeCloseTo(phi, 10);
			}
		});

		it("waveform 2 (square) returns 0 for phi < 0.5 and 1 for phi >= 0.5", () => {
			expect(applyTransfer(2 as WaveformId, 0)).toBe(0);
			expect(applyTransfer(2 as WaveformId, 0.25)).toBe(0);
			expect(applyTransfer(2 as WaveformId, 0.5)).toBe(1);
			expect(applyTransfer(2 as WaveformId, 0.75)).toBe(1);
		});

		it("waveform 3 (pulse) returns 1 between 0.25 and 0.75", () => {
			expect(applyTransfer(3 as WaveformId, 0)).toBe(0);
			expect(applyTransfer(3 as WaveformId, 0.1)).toBe(0);
			expect(applyTransfer(3 as WaveformId, 0.25)).toBe(1);
			expect(applyTransfer(3 as WaveformId, 0.5)).toBe(1);
			expect(applyTransfer(3 as WaveformId, 0.74)).toBe(1);
			expect(applyTransfer(3 as WaveformId, 0.75)).toBe(0);
			expect(applyTransfer(3 as WaveformId, 0.9)).toBe(0);
		});

		it("waveform 4 (null) produces a spike near phi=0 then silence", () => {
			expect(applyTransfer(4 as WaveformId, 0)).toBeCloseTo(0, 10);
			expect(applyTransfer(4 as WaveformId, 0.005)).toBeCloseTo(0.5, 2);
			expect(applyTransfer(4 as WaveformId, 0.5)).toBe(0);
			expect(applyTransfer(4 as WaveformId, 0.9)).toBe(0);
		});

		it("waveform 5 (sine-pulse) ramps from 0 to 1 in first 15% then drops to 0", () => {
			expect(applyTransfer(5 as WaveformId, 0)).toBeCloseTo(0, 10);
			expect(applyTransfer(5 as WaveformId, 0.075)).toBeCloseTo(0.5, 2);
			expect(applyTransfer(5 as WaveformId, 0.1499)).toBeCloseTo(1, 2);
			expect(applyTransfer(5 as WaveformId, 0.5)).toBe(0);
			expect(applyTransfer(5 as WaveformId, 0.8)).toBe(0);
		});

		it("waveform 6 (saw-pulse) has pulse at start then saw continues", () => {
			expect(applyTransfer(6 as WaveformId, 0)).toBeCloseTo(0, 10);
			expect(applyTransfer(6 as WaveformId, 0.075)).toBeCloseTo(0.5, 2);
			expect(applyTransfer(6 as WaveformId, 0.1499)).toBeCloseTo(1, 2);
			expect(applyTransfer(6 as WaveformId, 0.5)).toBeCloseTo(0.5, 2);
			expect(applyTransfer(6 as WaveformId, 0.9)).toBeCloseTo(0.9, 2);
		});

		it("waveform 7 (multi-sine) produces resonance peaks", () => {
			const val0 = applyTransfer(7 as WaveformId, 0);
			expect(val0).toBeCloseTo(0, 5);
			const val05 = applyTransfer(7 as WaveformId, 0.5);
			expect(val05).toBeCloseTo(0.5, 2);
		});

		it("waveform 8 (pulse2) pulses at start and midpoint", () => {
			expect(applyTransfer(8 as WaveformId, 0)).toBe(1);
			expect(applyTransfer(8 as WaveformId, 0.1)).toBe(1);
			expect(applyTransfer(8 as WaveformId, 0.3)).toBe(0);
			expect(applyTransfer(8 as WaveformId, 0.5)).toBe(1);
			expect(applyTransfer(8 as WaveformId, 0.6)).toBe(1);
			expect(applyTransfer(8 as WaveformId, 0.7)).toBe(0);
		});
	});

	describe("renderPdSample", () => {
		it("at depth=0 produces pure sine wave", () => {
			const osc = createPdOscillator();
			osc.phi = 0.25;
			const sample = renderPdSample(0.25, 2 as WaveformId, 0, 0, null);
			expect(sample).toBeCloseTo(Math.sin(2 * Math.PI * 0.25), 10);
		});

		it("at depth=1 produces waveform 2 (square) output", () => {
			const sample = renderPdSample(0.6, 2 as WaveformId, 1, 0, null);
			expect(sample).toBeCloseTo(Math.sin(2 * Math.PI * 1), 10);
		});

		it("at depth=0.5 interpolates between sine and distorted", () => {
			const phi = 0.6;
			const depth = 0.5;
			const expected = Math.sin(2 * Math.PI * (phi + (1 - phi) * depth));
			const result = renderPdSample(phi, 2 as WaveformId, depth, 0, null);
			expect(result).toBeCloseTo(expected, 10);
		});

		it("combination wave alternates between waveforms on odd/even cycles", () => {
			const sampleOdd = renderPdSample(
				0.3,
				1 as WaveformId,
				1,
				1,
				2 as WaveformId,
			);
			const sampleEven = renderPdSample(
				0.3,
				1 as WaveformId,
				1,
				2,
				2 as WaveformId,
			);
			expect(sampleOdd).not.toBeCloseTo(sampleEven, 2);
		});

		it("with null waveform2, uses waveform1 regardless of cycle", () => {
			const phi = 0.5;
			const withNull = renderPdSample(phi, 1 as WaveformId, 1, 5, null);
			const withoutSecond = renderPdSample(phi, 1 as WaveformId, 1, 5, null);
			expect(withNull).toBeCloseTo(withoutSecond, 10);
		});
	});

	describe("advancePhase", () => {
		it("advances phase by frequency/sampleRate", () => {
			const osc = createPdOscillator();
			const freq = 440;
			const sr = 44100;
			advancePhase(osc, freq, sr);
			expect(osc.phi).toBeCloseTo(freq / sr, 10);
		});

		it("wraps phase and increments cycleCount when crossing 1.0", () => {
			const osc = createPdOscillator();
			osc.phi = 1.2;
			const newCycle = advancePhase(osc, 440, 44100);
			expect(newCycle).toBe(true);
			expect(osc.cycleCount).toBe(1);
			expect(osc.phi).toBeLessThan(1);
		});

		it("returns false when no cycle boundary is crossed", () => {
			const osc = createPdOscillator();
			const newCycle = advancePhase(osc, 100, 44100);
			expect(newCycle).toBe(false);
			expect(osc.cycleCount).toBe(0);
		});
	});
});
