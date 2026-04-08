import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EnvelopeChart from "@/components/charts/EnvelopeChart";
import { fixture } from "@/test/browserFixture";

describe("EnvelopeChart (Browser Mode)", () => {
	const mockSteps = [
		{ level: 50, rate: 50, falling: false, sustain: false },
		{ level: 80, rate: 20, falling: true, sustain: true },
		{ level: 30, rate: 80, falling: false, sustain: false },
	];

	it("renders the label and SVG", async () => {
		const container = await fixture(
			<EnvelopeChart
				steps={mockSteps}
				endStep={3}
				label="Browser Test Envelope"
			/>,
		);

		// Verify the label exists in the DOM
		expect(screen.getAllByText("Browser Test Envelope").length).toBeGreaterThan(
			0,
		);

		// Verify the SVG is actually rendered in the container
		const svg = container.querySelector("svg");
		expect(svg).toBeTruthy();
	});

	it("renders the step readouts", async () => {
		await fixture(
			<EnvelopeChart
				steps={mockSteps}
				endStep={3}
				label="Browser Readout Test"
			/>,
		);

		// Check for step 1 readout (R50 L50)
		expect(screen.getByText("R50")).toBeTruthy();
		expect(screen.getByText("L50")).toBeTruthy();

		// Check for step 2 readout (R20 L80)
		expect(screen.getByText("R20")).toBeTruthy();
		expect(screen.getByText("L80")).toBeTruthy();
	});
});
