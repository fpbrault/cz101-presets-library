import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PatchParameterViewer from "@/components/charts/PatchParameterViewer";
// Mocking decodeCzPatch to control the patch data
import type { DecodedPatch, WaveformConfig } from "@/lib/midi/czSysexDecoder";
import * as decoder from "@/lib/midi/czSysexDecoder";
import { renderWithProviders } from "@/test/renderWithProviders";

vi.mock("@/lib/midi/czSysexDecoder", async () => {
	const actual = await vi.importActual("@/lib/midi/czSysexDecoder");
	return {
		...actual,
		decodeCzPatch: vi.fn(),
	};
});

describe("PatchParameterViewer", () => {
	const mockPatch = {
		lineSelect: "L1" as const,
		octave: 0 as const,
		detuneDirection: "+" as const,
		detuneFine: 10,
		detuneOctave: 1,
		detuneNote: 5,
		vibratoWave: 1,
		vibratoDelay: 20,
		vibratoRate: 30,
		vibratoDepth: 40,
		dco1: {
			firstWaveform: 1,
			secondWaveform: 2,
			modulation: "none",
		} as WaveformConfig,
		dco2: {
			firstWaveform: 1,
			secondWaveform: null,
			modulation: "none",
		} as WaveformConfig,
		dca1KeyFollow: 5,
		dcw1KeyFollow: 5,
		dca2KeyFollow: 0,
		dcw2KeyFollow: 0,
		dca1: { steps: [{ rate: 50, level: 75, sustain: false }], endStep: 1 },
		dcw1: { steps: [{ rate: 50, level: 75, sustain: false }], endStep: 1 },
		dco1Env: { steps: [{ rate: 50, level: 75, sustain: false }], endStep: 1 },
		dca2: { steps: [{ rate: 50, level: 75, sustain: false }], endStep: 1 },
		dcw2: { steps: [{ rate: 50, level: 75, sustain: false }], endStep: 1 },
		dco2Env: { steps: [{ rate: 50, level: 75, sustain: false }], endStep: 1 },
	};

	it("renders error state when patch decoding fails", () => {
		vi.mocked(decoder.decodeCzPatch).mockReturnValue(null);
		renderWithProviders(<PatchParameterViewer sysexData={new Uint8Array()} />);
		expect(screen.getByText(/No valid SysEx data/i)).toBeTruthy();
	});

	it("renders core parameters correctly", () => {
		vi.mocked(decoder.decodeCzPatch).mockReturnValue(mockPatch as DecodedPatch);
		renderWithProviders(<PatchParameterViewer sysexData={new Uint8Array()} />);

		expect(screen.getByText("L1")).toBeTruthy();
		expect(screen.getByText("0")).toBeTruthy();
		expect(screen.getByText("▲ Up")).toBeTruthy();
		expect(screen.getByText("10")).toBeTruthy();
		expect(screen.getByText(/Oct 1\s+F/)).toBeTruthy();
		expect(screen.getByText("Wave 1")).toBeTruthy();
	});

	it("renders progress bars for vibrato", () => {
		vi.mocked(decoder.decodeCzPatch).mockReturnValue(mockPatch as DecodedPatch);
		renderWithProviders(<PatchParameterViewer sysexData={new Uint8Array()} />);

		// Vibrato values: Delay 20, Rate 30, Depth 40
		// We'll check for the text values in the progress bars
		expect(screen.getByText("20")).toBeTruthy();
		expect(screen.getByText("30")).toBeTruthy();
		expect(screen.getByText("40")).toBeTruthy();
	});

	it("renders envelope groups", () => {
		vi.mocked(decoder.decodeCzPatch).mockReturnValue(mockPatch as DecodedPatch);
		renderWithProviders(<PatchParameterViewer sysexData={new Uint8Array()} />);

		expect(screen.getAllByText(/DCA1/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/DCW1/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/DCO1/i).length).toBeGreaterThan(0);
	});
});
