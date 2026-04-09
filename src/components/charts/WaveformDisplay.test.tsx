import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WaveformDisplay from "@/components/charts/WaveformDisplay";
import type { WaveformConfig } from "@/lib/midi/czSysexDecoder";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("WaveformDisplay", () => {
	const baseConfig: WaveformConfig = {
		firstWaveform: 1,
		secondWaveform: null,
		modulation: "none",
	};

	it("renders the line label and modulation badge", () => {
		renderWithProviders(<WaveformDisplay line="DCO1" config={baseConfig} />);

		expect(screen.getByText("DCO1")).toBeTruthy();
		expect(screen.getByText("No Mod")).toBeTruthy();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<WaveformDisplay line="DCO1" config={baseConfig} />,
		);

		await expectNoAxeViolations(container);
	});

	it("renders the primary waveform slot", () => {
		renderWithProviders(<WaveformDisplay line="DCO1" config={baseConfig} />);

		expect(screen.getByText("Primary")).toBeTruthy();
	});

	it("renders an empty slot when waveform is null", () => {
		const emptyConfig: WaveformConfig = {
			firstWaveform: null as unknown as WaveformConfig["firstWaveform"],
			secondWaveform: null,
			modulation: "none",
		};
		renderWithProviders(<WaveformDisplay line="DCO1" config={emptyConfig} />);

		expect(screen.getByText("Primary")).toBeTruthy();
		// The empty slot has a dash
		expect(screen.getByText("—")).toBeTruthy();
	});

	it("renders the secondary waveform slot when present", () => {
		const configWithSecondary: WaveformConfig = {
			firstWaveform: 1,
			secondWaveform: 2,
			modulation: "ring",
		};
		renderWithProviders(
			<WaveformDisplay line="DCO2" config={configWithSecondary} />,
		);

		expect(screen.getByText("DCO2")).toBeTruthy();
		expect(screen.getByText("Secondary")).toBeTruthy();
		expect(screen.getByText("Ring")).toBeTruthy();
	});

	it("applies opacity when disabled", () => {
		const { container } = renderWithProviders(
			<WaveformDisplay line="DCO1" config={baseConfig} disabled={true} />,
		);
		const mainDiv = container.firstChild as HTMLElement;
		expect(mainDiv.className).toContain("opacity-40");
	});
});
