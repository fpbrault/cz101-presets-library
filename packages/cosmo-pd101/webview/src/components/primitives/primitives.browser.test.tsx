import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Card from "./Card";
import CzButton from "./CzButton";
import CzTabButton from "./CzTabButton";

describe("primitive components (browser)", () => {
	it("renders Card as a custom element with expected classes", () => {
		render(
			<Card as="section" variant="hero" padding="lg" data-testid="card">
				content
			</Card>,
		);

		const card = screen.getByTestId("card");
		expect(card.tagName).toBe("SECTION");
		expect(card).toHaveClass("card", "bg-cz-surface", "p-6");
	});

	it("renders CzButton with tooltip and click behavior", () => {
		const onClick = vi.fn();
		render(
			<CzButton onClick={onClick} tooltip="Choose line" active>
				L1
			</CzButton>,
		);

		fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("button").closest("[data-tip='Choose line']")).not.toBeNull();
		expect(screen.getByText("L1")).toBeInTheDocument();
	});

	it("renders CzTabButton labels and pressed state", () => {
		const onClick = vi.fn();
		render(
			<CzTabButton
				topLabel="PHASE"
				bottomLabel="MOD"
				active
				onClick={onClick}
			/>,
		);

		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByText("PHASE")).toBeInTheDocument();
		expect(screen.getByText("MOD")).toBeInTheDocument();
	});
});
