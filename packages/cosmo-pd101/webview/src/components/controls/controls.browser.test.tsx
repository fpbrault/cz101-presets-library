import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ControlKnob from "./ControlKnob";
import LineSelectControl from "./LineSelectControl";
import ModModeControl from "./ModModeControl";
import CzHorizontalSlider from "./sliders/CzHorizontalSlider";
import CzVerticalSlider from "./sliders/CzVerticalSlider";

const useSynthParamMock = vi.fn();
const useOptionalSynthControllerMock = vi.fn();

vi.mock("@/features/synth/SynthParamController", () => ({
	useSynthParam: (...args: unknown[]) => useSynthParamMock(...args),
	useOptionalSynthController: () => useOptionalSynthControllerMock(),
}));

vi.mock("@/components/controls/modulation/ModulatableControl", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="modulatable-wrapper">{children}</div>
	),
}));

describe("core controls (browser)", () => {
	beforeEach(() => {
		useSynthParamMock.mockReset();
		useOptionalSynthControllerMock.mockReset();
		useOptionalSynthControllerMock.mockReturnValue(null);
	});

	it("renders and updates LineSelectControl", () => {
		const setValue = vi.fn();
		useSynthParamMock.mockReturnValue({ value: "L1", setValue });
		render(<LineSelectControl />);

		expect(screen.getAllByRole("button")).toHaveLength(5);
		fireEvent.click(screen.getAllByRole("button")[2]);
		expect(setValue).toHaveBeenCalledWith("L2");
	});

	it("renders and updates ModModeControl", () => {
		const setValue = vi.fn();
		useSynthParamMock.mockReturnValue({ value: "normal", setValue });
		render(<ModModeControl />);

		fireEvent.click(screen.getAllByRole("button")[1]);
		expect(setValue).toHaveBeenCalledWith("ring");
	});

	it("supports ControlKnob value editing", () => {
		const onChange = vi.fn();
		render(
			<ControlKnob value={0.25} onChange={onChange} label="Cutoff" min={0} max={1} />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Cutoff value" }));
		const input = screen.getByRole("textbox", { name: "Cutoff value" });
		fireEvent.change(input, { target: { value: "0.75" } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith(0.75);
	});

	it("renders horizontal slider inside modulation wrapper when destination exists", () => {
		const onChange = vi.fn();
		render(
			<CzHorizontalSlider
				value={0.2}
				min={0}
				max={1}
				onChange={onChange}
				modDestination="volume"
			/>,
		);

		fireEvent.change(screen.getByRole("slider"), { target: { value: "0.4" } });
		expect(onChange).toHaveBeenCalledWith(0.4);
		expect(screen.getByTestId("modulatable-wrapper")).toBeInTheDocument();
	});

	it("supports CzVerticalSlider keyboard interaction", () => {
		const onChange = vi.fn();
		render(
			<CzVerticalSlider
				value={0.5}
				min={0}
				max={1}
				step={0.1}
				onChange={onChange}
				ariaLabel="Level"
			/>,
		);

		const slider = screen.getByRole("slider", { name: "Level" });
		fireEvent.keyDown(slider, { key: "ArrowUp" });
		fireEvent.keyDown(slider, { key: "ArrowDown" });
		const values = onChange.mock.calls.map(([value]) => value as number);
		expect(values[0]).toBeCloseTo(0.6, 10);
		expect(values[1]).toBeCloseTo(0.4, 10);
	});
});
