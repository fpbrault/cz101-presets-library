import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AlgoIconGrid from "./AlgoIconGrid";

vi.mock("@/lib/synth/algoRef", () => ({
	isAlgoRefEqual: (a: { id: number }, b: { id: number }) => a.id === b.id,
}));

vi.mock("@/lib/synth/pdAlgorithms", () => ({
	PD_ALGOS: [
		{ key: "algo-1", label: "Algo 1", value: { id: 1 }, icon: "M1 1L10 10" },
		{ key: "algo-2", label: "Algo 2", value: { id: 2 }, icon: "M2 2L11 11" },
	],
}));

describe("AlgoIconGrid", () => {
	it("renders algorithm buttons and dispatches selection", () => {
		const onChange = vi.fn();
		render(<AlgoIconGrid value={{ id: 1 }} onChange={onChange} />);

		const second = screen.getByRole("button", { name: "Algo 2" });
		fireEvent.click(second);
		expect(onChange).toHaveBeenCalledWith({ id: 2 });
	});

	it("disables interaction when disabled", () => {
		const onChange = vi.fn();
		render(<AlgoIconGrid value={{ id: 1 }} onChange={onChange} disabled />);

		const first = screen.getByRole("button", { name: "Algo 1" });
		expect(first).toBeDisabled();
		fireEvent.click(first);
		expect(onChange).not.toHaveBeenCalled();
	});
});
