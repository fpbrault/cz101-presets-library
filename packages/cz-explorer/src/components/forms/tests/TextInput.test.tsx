import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TextInput from "@/components/forms/TextInput";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("TextInput", () => {
	it("renders with default md size class", () => {
		renderWithProviders(<TextInput value="CZ" readOnly />);

		const input = screen.getByDisplayValue("CZ");
		expect(input.className).toContain("input-md");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<TextInput aria-label="Preset name" value="CZ" readOnly />,
		);

		await expectNoAxeViolations(container);
	});

	it("applies size and custom classes", () => {
		renderWithProviders(
			<TextInput value="Pad" readOnly inputSize="sm" className="w-full mt-1" />,
		);

		const input = screen.getByDisplayValue("Pad");
		expect(input.className).toContain("input-sm");
		expect(input.className).toContain("w-full");
	});

	it("applies large size class", () => {
		renderWithProviders(<TextInput value="Test" readOnly inputSize="lg" />);

		const input = screen.getByDisplayValue("Test");
		expect(input.className).toContain("input-lg");
	});
});
