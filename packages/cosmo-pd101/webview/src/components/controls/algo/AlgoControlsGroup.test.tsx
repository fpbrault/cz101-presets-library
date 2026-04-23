import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import AlgoControlsGroup from "./AlgoControlsGroup";

vi.mock("@/components/primitives/Card", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="card">{children}</div>
	),
}));

vi.mock("./AlgoControlItem", () => ({
	default: ({ control }: { control: { id: string } }) => (
		<div data-testid={`item-${control.id}`} />
	),
}));

const sharedProps = {
	controlBindings: {},
	lineIndex: 1 as const,
	algoParamSlotIndex: {},
	getAlgoControlValue: () => 0,
	setAlgoControlValue: () => {},
	getActiveSelectOption: () => null,
	applyOptionAssignments: () => {},
};

describe("AlgoControlsGroup", () => {
	it("renders empty-state message when no controls", () => {
		render(<AlgoControlsGroup {...sharedProps} controls={[]} />);
		expect(screen.getByText("No controls for this algo")).toBeInTheDocument();
	});

	it("renders control items when controls are present", () => {
		render(
			<AlgoControlsGroup
				{...sharedProps}
				controls={[
					{ id: "a", label: "A" },
					{ id: "b", label: "B" },
				]}
			/>,
		);

		expect(screen.getByTestId("item-a")).toBeInTheDocument();
		expect(screen.getByTestId("item-b")).toBeInTheDocument();
	});
});
