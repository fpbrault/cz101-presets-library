import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CzTabButton from "./CzTabButton";

describe("CzTabButton", () => {
	it("renders two-line labels and click handler", () => {
		const onClick = vi.fn();
		render(<CzTabButton topLabel="DCO" bottomLabel="ENV" onClick={onClick} />);

		fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.getByText("DCO")).toBeInTheDocument();
		expect(screen.getByText("ENV")).toBeInTheDocument();
	});

	it("sets pressed state and LED color based on active", () => {
		const { rerender, container } = render(
			<CzTabButton topLabel="A" bottomLabel="B" active />,
		);

		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
		expect(container.querySelector("span[aria-hidden='true']")).toHaveClass(
			"bg-cz-led-on",
		);

		rerender(<CzTabButton topLabel="A" bottomLabel="B" active={false} />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
		expect(container.querySelector("span[aria-hidden='true']")).toHaveClass(
			"bg-cz-led-off",
		);
	});

	it("can hide LED and apply color palette", () => {
		const { container } = render(
			<CzTabButton topLabel="X" bottomLabel="Y" showLed={false} color="cyan" />,
		);

		expect(container.querySelector("span[aria-hidden='true']")).toBeNull();
		expect(screen.getByRole("button").className).toContain("border-[#3a838c]");
	});
});
