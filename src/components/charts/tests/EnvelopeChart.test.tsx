import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EnvelopeChart from "@/components/charts/EnvelopeChart";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("EnvelopeChart", () => {
	const mockSteps = [
		{ level: 50, rate: 50, falling: false, sustain: false },
		{ level: 80, rate: 20, falling: true, sustain: true },
		{ level: 30, rate: 80, falling: false, sustain: false },
	];

	it("renders the label", () => {
		renderWithProviders(
			<EnvelopeChart steps={mockSteps} endStep={3} label="Test Envelope" />,
		);
		expect(screen.getByText("Test Envelope")).toBeTruthy();
	});

	it("renders nothing when steps are empty", () => {
		const { container } = renderWithProviders(
			<EnvelopeChart steps={[]} endStep={0} label="Empty" />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders the step readouts", () => {
		renderWithProviders(
			<EnvelopeChart steps={mockSteps} endStep={3} label="Test Envelope" />,
		);

		// Check for step 1 readout (R50 L50)
		expect(screen.getByText("R50")).toBeTruthy();
		expect(screen.getByText("L50")).toBeTruthy();

		// Check for step 2 readout (R20 L80)
		expect(screen.getByText("R20")).toBeTruthy();
		expect(screen.getByText("L80")).toBeTruthy();

		// Check for at least one inactive step readout
		const inactiveReadouts = screen.getAllByText("--");
		expect(inactiveReadouts.length).toBeGreaterThan(0);
	});

	it("renders the SVG container", () => {
		const { container } = renderWithProviders(
			<EnvelopeChart steps={mockSteps} endStep={3} label="Test Envelope" />,
		);
		const svg = container.querySelector("svg");
		expect(svg).toBeTruthy();
	});
});
