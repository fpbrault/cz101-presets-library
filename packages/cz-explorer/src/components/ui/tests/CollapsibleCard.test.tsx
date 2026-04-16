import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("CollapsibleCard", () => {
	it("renders details mode with summary title", () => {
		const { container } = renderWithProviders(
			<CollapsibleCard title={<span>Scope</span>}>Body</CollapsibleCard>,
		);

		expect(container.querySelector("details")).toBeTruthy();
		expect(screen.getByText("Scope")).toBeTruthy();
		expect(screen.getByText("Body")).toBeTruthy();
	});

	it("renders checkbox mode for daisyui collapse input behavior", () => {
		const { container } = renderWithProviders(
			<CollapsibleCard mode="checkbox" title={<span>Line 1</span>} defaultopen>
				Body
			</CollapsibleCard>,
		);

		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement | null;
		expect(input).toBeTruthy();
		expect(input?.checked).toBe(true);
	});

	it("applies custom classes after the base variant classes", () => {
		const { container } = renderWithProviders(
			<CollapsibleCard
				title={<span>Scoped</span>}
				className="bg-error/20 custom-class"
			>
				Body
			</CollapsibleCard>,
		);

		const details = container.querySelector("details");
		expect(details?.className).toContain("bg-base-300/20");
		expect(details?.className).toContain("bg-error/20");
		expect(details?.className).toContain("custom-class");
	});
});
