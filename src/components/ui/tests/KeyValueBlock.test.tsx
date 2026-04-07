import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KeyValueBlock from "@/components/ui/KeyValueBlock";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("KeyValueBlock", () => {
	it("renders label and value", () => {
		renderWithProviders(<KeyValueBlock label="Name" value="Test Value" />);

		expect(screen.getByText("Name")).toBeTruthy();
		expect(screen.getByText("Test Value")).toBeTruthy();
	});

	it("renders complex ReactNode as value", () => {
		renderWithProviders(
			<KeyValueBlock label="Complex" value={<span>Complex Value</span>} />,
		);

		expect(screen.getByText("Complex Value")).toBeTruthy();
	});

	it("applies custom className", () => {
		renderWithProviders(
			<KeyValueBlock label="Test" value="Value" className="custom-class" />,
		);

		const label = screen.getByText("Test");
		// The label is inside a div that is a child of the main container.
		// We need to find the parent div that has the className.
		const mainContainer =
			label.closest('div[class*="custom-class"]') ||
			label.parentElement?.parentElement;
		expect(mainContainer?.className).toContain("custom-class");
	});
});
