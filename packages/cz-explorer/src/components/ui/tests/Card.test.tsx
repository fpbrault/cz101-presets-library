
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";
import Card from "../Card";

describe("Card", () => {
	it("renders children", () => {
		renderWithProviders(<Card>Panel body</Card>);
		expect(screen.getByText("Panel body")).toBeTruthy();
	});

	it("supports named variants", () => {
		renderWithProviders(<Card variant="hero">Hero panel</Card>);
		expect(screen.getByText("Hero panel").className).toContain("rounded-2xl");
	});

	it("renders a custom element", () => {
		const { container } = renderWithProviders(
			<Card as="section">Section panel</Card>,
		);
		expect(container.querySelector("section")).toBeTruthy();
	});

	it("applies custom classes after the variant classes", () => {
		renderWithProviders(
			<Card variant="subtle" className="bg-error/20 custom-class">
				Custom panel
			</Card>,
		);
		const card = screen.getByText("Custom panel");
		expect(card.className).toContain("bg-cz-surface/50");
		expect(card.className).toContain("bg-error/20");
		expect(card.className).toContain("custom-class");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(<Card>Accessible panel</Card>);

		await expectNoAxeViolations(container);
	});
});
