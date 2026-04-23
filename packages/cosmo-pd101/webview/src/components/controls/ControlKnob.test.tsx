import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ControlKnob from "./ControlKnob";

const useOptionalSynthControllerMock = vi.fn();

vi.mock("@/features/synth/SynthParamController", () => ({
	useOptionalSynthController: () => useOptionalSynthControllerMock(),
}));

vi.mock("@/components/controls/modulation/ModulatableControl", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="modulatable-wrapper">{children}</div>
	),
}));

describe("ControlKnob", () => {
	beforeEach(() => {
		useOptionalSynthControllerMock.mockReset();
		useOptionalSynthControllerMock.mockReturnValue(null);
	});

	it("renders label and formatted value", () => {
		render(
			<ControlKnob
				value={0.25}
				onChange={vi.fn()}
				label="Cutoff"
				min={0}
				max={1}
			/>,
		);

		expect(screen.getByText("Cutoff")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Cutoff value" }),
		).toHaveTextContent("0.25");
	});

	it("supports direct value editing and commits clamped values", () => {
		const onChange = vi.fn();
		render(
			<ControlKnob
				value={0.25}
				onChange={onChange}
				label="Cutoff"
				min={0}
				max={1}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Cutoff value" }));
		const input = screen.getByRole("textbox", { name: "Cutoff value" });
		fireEvent.change(input, { target: { value: "2.5" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onChange).toHaveBeenCalledWith(1);
	});

	it("resets to default value on double click", () => {
		const onChange = vi.fn();
		render(
			<ControlKnob
				value={0.4}
				onChange={onChange}
				label="Resonance"
				defaultValue={0.1}
			/>,
		);

		fireEvent.doubleClick(screen.getByRole("button", { name: "Resonance" }));
		expect(onChange).toHaveBeenCalledWith(0.1);
	});

	it("hides value display when valueVisibility is never", () => {
		render(
			<ControlKnob
				value={0.5}
				onChange={vi.fn()}
				label="Pitch"
				valueVisibility="never"
			/>,
		);

		expect(screen.queryByRole("button", { name: "Pitch value" })).toBeNull();
	});

	it("wraps knob with modulatable control when destination resolves", () => {
		render(
			<ControlKnob
				value={0.5}
				onChange={vi.fn()}
				label="Level"
				modDestination="volume"
			/>,
		);

		expect(screen.getByTestId("modulatable-wrapper")).toBeInTheDocument();
	});
});
