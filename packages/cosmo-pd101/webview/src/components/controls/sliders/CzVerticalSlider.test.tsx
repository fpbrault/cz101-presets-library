import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import CzVerticalSlider from "./CzVerticalSlider";

vi.mock("@/components/controls/modulation/ModulatableControl", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="modulatable-wrapper">{children}</div>
	),
}));

describe("CzVerticalSlider", () => {
	it("renders slider semantics with current value", () => {
		render(
			<CzVerticalSlider
				value={0.4}
				min={0}
				max={1}
				onChange={vi.fn()}
				ariaLabel="Volume"
			/>,
		);

		const slider = screen.getByRole("slider", { name: "Volume" });
		expect(slider).toHaveAttribute("aria-valuenow", "0.4");
	});

	it("handles keyboard and wheel adjustments", () => {
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
		fireEvent.wheel(slider, { deltaY: -100 });

		const values = onChange.mock.calls.map(([v]) => v as number);
		expect(values[0]).toBeCloseTo(0.6, 10);
		expect(values[1]).toBeCloseTo(0.4, 10);
		expect(values[2]).toBeCloseTo(0.6, 10);
	});

	it("wraps in modulatable control when destination is provided", () => {
		render(
			<CzVerticalSlider
				value={0.5}
				min={0}
				max={1}
				onChange={vi.fn()}
				modDestination="volume"
			/>,
		);
		expect(screen.getByTestId("modulatable-wrapper")).toBeInTheDocument();
	});
});
