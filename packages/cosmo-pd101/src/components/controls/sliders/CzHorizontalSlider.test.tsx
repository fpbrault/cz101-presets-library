import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import CzHorizontalSlider from "./CzHorizontalSlider";

vi.mock("@/components/controls/modulation/ModulatableControl", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="modulatable-wrapper">{children}</div>
	),
}));

describe("CzHorizontalSlider", () => {
	it("renders a range input and emits numeric changes", () => {
		const onChange = vi.fn();
		render(
			<CzHorizontalSlider value={0.2} min={0} max={1} onChange={onChange} />,
		);

		const slider = screen.getByRole("slider");
		fireEvent.change(slider, { target: { value: "0.75" } });
		expect(onChange).toHaveBeenCalledWith(0.75);
	});

	it("supports disabled state", () => {
		render(
			<CzHorizontalSlider
				value={0.2}
				min={0}
				max={1}
				onChange={vi.fn()}
				disabled
			/>,
		);
		expect(screen.getByRole("slider")).toBeDisabled();
	});

	it("wraps in modulatable control when destination is provided", () => {
		render(
			<CzHorizontalSlider
				value={0.2}
				min={0}
				max={1}
				onChange={vi.fn()}
				modDestination="volume"
			/>,
		);
		expect(screen.getByTestId("modulatable-wrapper")).toBeInTheDocument();
	});
});
