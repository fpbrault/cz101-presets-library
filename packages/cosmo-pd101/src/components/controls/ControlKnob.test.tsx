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

		fireEvent.doubleClick(
			screen.getByRole("spinbutton", { name: "Resonance" }),
		);
		expect(onChange).toHaveBeenCalledWith(0.1);
	});

	it("resets to default value on double touch", () => {
		const onChange = vi.fn();
		render(
			<ControlKnob
				value={0.4}
				onChange={onChange}
				label="Resonance"
				defaultValue={0.1}
			/>,
		);

		const knob = screen.getByRole("spinbutton", { name: "Resonance" });
		fireEvent.pointerDown(knob, {
			pointerId: 1,
			pointerType: "touch",
			clientX: 10,
			clientY: 10,
		});
		fireEvent.pointerUp(window, { pointerId: 1, pointerType: "touch" });
		fireEvent.pointerDown(knob, {
			pointerId: 2,
			pointerType: "touch",
			clientX: 10,
			clientY: 10,
		});

		expect(onChange).toHaveBeenCalledWith(0.1);
	});

	it("updates value while dragging", () => {
		const onChange = vi.fn();
		render(
			<ControlKnob
				value={0.4}
				onChange={onChange}
				label="Drive"
				min={0}
				max={1}
			/>,
		);

		const knob = screen.getByRole("spinbutton", { name: "Drive" });
		fireEvent.pointerDown(knob, {
			pointerId: 1,
			pointerType: "mouse",
			clientX: 28,
			clientY: 28,
		});
		fireEvent.pointerMove(window, {
			pointerId: 1,
			pointerType: "mouse",
			clientX: 28,
			clientY: 8,
		});
		fireEvent.pointerUp(window, { pointerId: 1, pointerType: "mouse" });

		expect(onChange).toHaveBeenCalled();
		expect(onChange.mock.calls.at(-1)?.[0]).toBeGreaterThan(0.4);
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

	it("renders with variant class applied via container", () => {
		const { container } = render(
			<ControlKnob
				value={0.5}
				onChange={vi.fn()}
				label="Test"
				variant="accent"
			/>,
		);

		expect(container.querySelector(".knob-variant-accent")).toBeInTheDocument();
	});

	it("renders with default variant when no variant specified", () => {
		const { container } = render(
			<ControlKnob value={0.5} onChange={vi.fn()} label="Test" />,
		);

		expect(
			container.querySelector(".knob-variant-default"),
		).toBeInTheDocument();
	});

	it("uses valueFormatter when provided", () => {
		render(
			<ControlKnob
				value={440}
				onChange={vi.fn()}
				label="Freq"
				min={20}
				max={20000}
				valueFormatter={(v) => `${v}Hz`}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Freq value" }),
		).toHaveTextContent("440Hz");
	});

	it("renders children as HTML overlay inside knob", () => {
		const { container } = render(
			<ControlKnob value={0.5} onChange={vi.fn()} label="Test">
				<span data-testid="overlay-icon">★</span>
			</ControlKnob>,
		);

		expect(screen.getByTestId("overlay-icon")).toBeInTheDocument();
		// Overlay should be inside the pointer-events-none wrapper
		expect(container.querySelector(".pointer-events-none")).toBeInTheDocument();
	});

	it("cancels edit on Escape key", () => {
		const onChange = vi.fn();
		render(
			<ControlKnob
				value={0.25}
				onChange={onChange}
				label="Vol"
				min={0}
				max={1}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Vol value" }));
		const input = screen.getByRole("textbox", { name: "Vol value" });
		fireEvent.change(input, { target: { value: "9" } });
		fireEvent.keyDown(input, { key: "Escape" });

		expect(onChange).not.toHaveBeenCalled();
		// editing closes
		expect(screen.queryByRole("textbox", { name: "Vol value" })).toBeNull();
	});

	it("does not render value display when disabled", () => {
		render(
			<ControlKnob
				value={0.5}
				onChange={vi.fn()}
				label="Gain"
				disabled={true}
			/>,
		);

		const knobButton = screen.getByRole("spinbutton", { name: "Gain" });
		expect(knobButton).toBeDisabled();
	});
});
