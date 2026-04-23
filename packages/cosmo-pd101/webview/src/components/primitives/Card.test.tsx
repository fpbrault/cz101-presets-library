import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Card, { CARD_BASE_CLASSES, getCardClassName, joinClasses } from "./Card";

describe("Card", () => {
	it("joinClasses omits falsey values", () => {
		expect(joinClasses("a", undefined, "", false, "b", null)).toBe("a b");
	});

	it("getCardClassName composes base, variant, padding and custom classes", () => {
		expect(
			getCardClassName({
				variant: "hero",
				padding: "lg",
				className: "extra",
			}),
		).toContain(`${CARD_BASE_CLASSES} rounded-2xl bg-cz-surface p-6 extra`);
	});

	it("renders as the provided element type", () => {
		render(
			<Card as="section" variant="panel-gold" padding="sm" data-testid="card">
				content
			</Card>,
		);

		const card = screen.getByTestId("card");
		expect(card.tagName).toBe("SECTION");
		expect(card).toHaveClass("card", "text-cz-cream", "cz-section-gold", "p-3");
	});
});
