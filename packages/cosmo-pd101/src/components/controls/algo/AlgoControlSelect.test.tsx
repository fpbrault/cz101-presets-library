import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AlgoControlSelect from "./AlgoControlSelect";

const control = {
	id: "shape",
	label: "Shape",
	description: "Select algorithm shape",
	kind: "select" as const,
	options: [
		{ value: "a", label: "A", set: [] },
		{ value: "b", label: "B", set: [{ controlId: "x", value: 1 }] },
	],
};

describe("AlgoControlSelect", () => {
	it("renders options and marks active option", () => {
		render(
			<AlgoControlSelect
				control={control}
				getActiveSelectOption={() => control.options[0]}
				applyOptionAssignments={vi.fn()}
			/>,
		);

		expect(screen.getAllByRole("button")).toHaveLength(2);
		expect(screen.getAllByRole("button")[0].className).toContain(
			"text-cz-cream",
		);
	});

	it("uses binding.setNumber for options without assignments", () => {
		const setNumber = vi.fn();
		render(
			<AlgoControlSelect
				control={control}
				binding={{ setNumber }}
				getActiveSelectOption={() => null}
				applyOptionAssignments={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getAllByRole("button")[0]);
		expect(setNumber).toHaveBeenCalledWith(0);
	});

	it("applies assignments for options that define set payloads", () => {
		const applyOptionAssignments = vi.fn();
		render(
			<AlgoControlSelect
				control={control}
				binding={{ setNumber: vi.fn() }}
				getActiveSelectOption={() => null}
				applyOptionAssignments={applyOptionAssignments}
			/>,
		);

		fireEvent.click(screen.getAllByRole("button")[1]);
		expect(applyOptionAssignments).toHaveBeenCalledWith(control.options[1]);
	});
});
