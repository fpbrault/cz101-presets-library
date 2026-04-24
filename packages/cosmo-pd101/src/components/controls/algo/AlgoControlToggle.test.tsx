import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AlgoControlToggle from "./AlgoControlToggle";

describe("AlgoControlToggle", () => {
	it("uses binding value and toggles through binding", () => {
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

	it("falls back to defaultToggle and disables when no setter", () => {
		render(
			<AlgoControlToggle
				control={{
					id: "sync",
					label: "Sync",
					kind: "toggle",
					defaultToggle: true,
				}}
			/>,
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).toBeChecked();
		expect(checkbox).toBeDisabled();
	});
});
