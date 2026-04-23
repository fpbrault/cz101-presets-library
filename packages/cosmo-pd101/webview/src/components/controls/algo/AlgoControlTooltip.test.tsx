import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AlgoControlTooltip from "./AlgoControlTooltip";

describe("AlgoControlTooltip", () => {
	it("renders nothing without description", () => {
		const { container } = render(
			<AlgoControlTooltip description={undefined} />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders tooltip trigger when description exists", () => {
		render(<AlgoControlTooltip description="Fine tune harmonic spread" />);
		expect(
			screen.getByRole("button", { name: "Show control description" }),
		).toBeInTheDocument();
		expect(
			screen
				.getByRole("button")
				.closest("[data-tip='Fine tune harmonic spread']"),
		).not.toBeNull();
	});
});
