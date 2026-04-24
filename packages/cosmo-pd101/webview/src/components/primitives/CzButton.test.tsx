import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CzButton from "./CzButton";

describe("CzButton", () => {
	it("renders label and handles click", () => {
		const onClick = vi.fn();
		render(<CzButton onClick={onClick}>L1</CzButton>);

		fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.getByText("L1")).toBeInTheDocument();
	});

	it("shows inactive LED class by default and active class when active", () => {
		const { rerender, container } = render(<CzButton>Test</CzButton>);
		expect(container.querySelector("span[aria-hidden='true']")).toHaveClass(
			"bg-cz-led-off",
		);

		rerender(<CzButton active>Test</CzButton>);
		expect(container.querySelector("span[aria-hidden='true']")).toHaveClass(
			"bg-cz-led-on",
		);
	});

	it("renders tooltip wrapper and supports disabled", () => {
		render(
			<CzButton tooltip="Helpful" disabled>
				Disabled
			</CzButton>,
		);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("data-hover-info", "Helpful");
	});
});
