import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlgoControlItem from "./AlgoControlItem";
import AlgoControlNumber from "./AlgoControlNumber";
import AlgoControlSelect from "./AlgoControlSelect";
import AlgoControlsGroup from "./AlgoControlsGroup";
import AlgoControlToggle from "./AlgoControlToggle";
import AlgoControlTooltip from "./AlgoControlTooltip";
import AlgoIconGrid from "./AlgoIconGrid";

const knobSpy = vi.fn();
const algoParamTargetFromSlotMock = vi.fn();

vi.mock("@/lib/synth/modDestination", () => ({
	algoParamTargetFromSlot: (...args: unknown[]) =>
		algoParamTargetFromSlotMock(...args),
}));

vi.mock("../ControlKnob", () => ({
	default: (props: Record<string, unknown>) => {
		knobSpy(props);
		return <div data-testid="mock-knob">{String(props.label)}</div>;
	},
}));

vi.mock("@/lib/synth/algoRef", () => ({
	isAlgoRefEqual: (a: { id: number }, b: { id: number }) => a.id === b.id,
}));

vi.mock("@/lib/synth/pdAlgorithms", () => ({
	PD_ALGOS: [
		{ key: "algo-1", label: "Algo 1", value: { id: 1 }, icon: "M1 1L10 10" },
		{ key: "algo-2", label: "Algo 2", value: { id: 2 }, icon: "M2 2L11 11" },
	],
}));

const selectControl = {
	id: "shape",
	label: "Shape",
	description: "Select algorithm shape",
	kind: "select" as const,
	options: [
		{ value: "a", label: "A", set: [] },
		{ value: "b", label: "B", set: [{ controlId: "x", value: 1 }] },
	],
};

describe("algo controls (browser)", () => {
	beforeEach(() => {
		knobSpy.mockClear();
		algoParamTargetFromSlotMock.mockReset();
	});

	it("renders tooltip only when description exists", () => {
		const { rerender } = render(
			<AlgoControlTooltip description="Helpful info" />,
		);
		expect(
			screen.getByRole("button", { name: "Show control description" }),
		).toBeInTheDocument();

		rerender(<AlgoControlTooltip description={undefined} />);
		expect(
			screen.queryByRole("button", { name: "Show control description" }),
		).toBeNull();
	});

	it("renders and updates select controls", () => {
		const setNumber = vi.fn();
		const applyOptionAssignments = vi.fn();
		render(
			<AlgoControlSelect
				control={selectControl}
				binding={{ setNumber }}
				getActiveSelectOption={() => selectControl.options[0]}
				applyOptionAssignments={applyOptionAssignments}
			/>,
		);

		expect(screen.getAllByRole("button")).toHaveLength(2);
		fireEvent.click(screen.getAllByRole("button")[0]);
		expect(setNumber).toHaveBeenCalledWith(0);
		fireEvent.click(screen.getAllByRole("button")[1]);
		expect(applyOptionAssignments).toHaveBeenCalledWith(
			selectControl.options[1],
		);
	});

	it("renders and updates toggle controls", () => {
		const setToggle = vi.fn();
		render(
			<AlgoControlToggle
				control={{ id: "sync", label: "Sync", kind: "toggle" }}
				binding={{ getToggle: () => true, setToggle }}
			/>,
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).toBeChecked();
		fireEvent.click(checkbox);
		expect(setToggle).toHaveBeenCalledWith(false);
	});

	it("renders AlgoControlNumber and forwards onChange", () => {
		const setAlgoControlValue = vi.fn();
		algoParamTargetFromSlotMock.mockReturnValue("algoParam2");
		render(
			<AlgoControlNumber
				control={{ id: "depth", label: "Depth", min: 0, max: 2, default: 0.5 }}
				lineIndex={1}
				algoParamSlotIndex={{ depth: 2 }}
				getAlgoControlValue={() => 1.25}
				setAlgoControlValue={setAlgoControlValue}
			/>,
		);

		expect(screen.getByTestId("mock-knob")).toHaveTextContent("Depth");
		const props = knobSpy.mock.calls[0][0] as {
			onChange: (value: number) => void;
			modulatable: string;
		};
		expect(props.modulatable).toBe("algoParam2");
		props.onChange(0.8);
		expect(setAlgoControlValue).toHaveBeenCalledWith("depth", 0.8);
	});

	it("renders AlgoControlItem branches", () => {
		const baseProps = {
			binding: {},
			lineIndex: 1 as const,
			algoParamSlotIndex: {},
			getAlgoControlValue: () => 0,
			setAlgoControlValue: () => {},
			getActiveSelectOption: () => null,
			applyOptionAssignments: () => {},
		};

		const { rerender } = render(
			<AlgoControlItem {...baseProps} control={{ id: "num", label: "Num" }} />,
		);
		expect(screen.getByTestId("mock-knob")).toBeInTheDocument();

		rerender(
			<AlgoControlItem
				{...baseProps}
				control={{ id: "toggle", label: "Toggle", kind: "toggle" }}
			/>,
		);
		expect(screen.getByRole("checkbox")).toBeInTheDocument();

		rerender(<AlgoControlItem {...baseProps} control={selectControl} />);
		expect(screen.getAllByRole("button")).toHaveLength(2);
	});

	it("renders AlgoControlsGroup empty and populated states", () => {
		const sharedProps = {
			controlBindings: {},
			lineIndex: 1 as const,
			algoParamSlotIndex: {},
			getAlgoControlValue: () => 0,
			setAlgoControlValue: () => {},
			getActiveSelectOption: () => null,
			applyOptionAssignments: () => {},
		};
		const { rerender } = render(
			<AlgoControlsGroup {...sharedProps} controls={[]} />,
		);
		expect(screen.getByText("No controls for this algo")).toBeInTheDocument();

		rerender(
			<AlgoControlsGroup
				{...sharedProps}
				controls={[{ id: "depth", label: "Depth" }]}
			/>,
		);
		expect(screen.getByText("Algo Controls")).toBeInTheDocument();
		expect(screen.getByTestId("mock-knob")).toBeInTheDocument();
	});

	it("renders AlgoIconGrid and dispatches selection", () => {
		const onChange = vi.fn();
		render(<AlgoIconGrid value={{ id: 1 }} onChange={onChange} />);

		fireEvent.click(screen.getByRole("button", { name: "Algo 2" }));
		expect(onChange).toHaveBeenCalledWith({ id: 2 });
	});
});
