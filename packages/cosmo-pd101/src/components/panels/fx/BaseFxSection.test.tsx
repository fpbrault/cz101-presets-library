import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

const controlKnobMock = vi.fn();

vi.mock("@/components/controls/ControlKnob", () => ({
	default: (props: unknown) => {
		controlKnobMock(props);
		return <div data-testid="fx-knob" />;
	},
}));

describe("BaseFxSection", () => {
	beforeEach(() => {
		controlKnobMock.mockReset();
	});

	it("maps metadata mod targets to concrete mod destinations", () => {
		const knobs: FxKnobConfig[] = [
			{
				label: "Rate",
				value: 0.5,
				setValue: vi.fn(),
				min: 0,
				max: 1,
				size: 44,
				valueFormatter: (value) => `${value}`,
				modTarget: "chorus.rate",
			},
			{
				label: "Depth",
				value: 0.5,
				setValue: vi.fn(),
				min: 0,
				max: 1,
				size: 44,
				valueFormatter: (value) => `${value}`,
				modTarget: "phaser.depth",
			},
			{
				label: "Mix",
				value: 0.5,
				setValue: vi.fn(),
				min: 0,
				max: 1,
				size: 44,
				valueFormatter: (value) => `${value}`,
				modTarget: "reverbMix",
			},
		];

		render(<BaseFxSection title="FX" knobs={knobs} />);

		expect(controlKnobMock).toHaveBeenCalledTimes(3);
		expect(controlKnobMock.mock.calls[0]?.[0]).toMatchObject({
			modDestination: "chorusRate",
		});
		expect(controlKnobMock.mock.calls[1]?.[0]).toMatchObject({
			modDestination: "phaserDepth",
		});
		expect(controlKnobMock.mock.calls[2]?.[0]).toMatchObject({
			modDestination: "reverbMix",
		});
	});
});
