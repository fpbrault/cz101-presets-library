import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlgoControlNumber from "./AlgoControlNumber";

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

describe("AlgoControlNumber", () => {
	beforeEach(() => {
		knobSpy.mockClear();
		algoParamTargetFromSlotMock.mockReset();
	});

	it("renders knob with resolved value and forwards number changes to binding", () => {
		const setNumber = vi.fn();
		algoParamTargetFromSlotMock.mockReturnValue("algoParam2");

		render(
			<AlgoControlNumber
				control={{ id: "depth", label: "Depth", min: 0, max: 2, default: 0.5 }}
				binding={{ getNumber: () => 1.25, setNumber }}
				lineIndex={1}
				algoParamSlotIndex={{ depth: 2 }}
				getAlgoControlValue={vi.fn()}
				setAlgoControlValue={vi.fn()}
			/>,
		);

		expect(screen.getByTestId("mock-knob")).toHaveTextContent("Depth");
		const props = knobSpy.mock.calls[0][0] as {
			value: number;
			onChange: (value: number) => void;
			modulatable: string;
		};
		expect(props.value).toBe(1.25);
		expect(props.modulatable).toBe("algoParam2");
		props.onChange(0.77);
		expect(setNumber).toHaveBeenCalledWith(0.77);
	});

	it("falls back to state getter and setAlgoControlValue", () => {
		const setAlgoControlValue = vi.fn();
		render(
			<AlgoControlNumber
				control={{ id: "res", label: "Res", min: 0, max: 1, default: 0.4 }}
				lineIndex={2}
				algoParamSlotIndex={{}}
				getAlgoControlValue={() => 0.61}
				setAlgoControlValue={setAlgoControlValue}
			/>,
		);

		const props = knobSpy.mock.calls.at(-1)?.[0] as {
			onChange: (value: number) => void;
		};
		props.onChange(0.2);
		expect(setAlgoControlValue).toHaveBeenCalledWith("res", 0.2);
	});
});
