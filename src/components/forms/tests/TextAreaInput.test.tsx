import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TextAreaInput from "@/components/forms/TextAreaInput";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("TextAreaInput", () => {
	it("renders with default md size class", () => {
		renderWithProviders(<TextAreaInput value="Warm brass" readOnly />);

		const textarea = screen.getByDisplayValue("Warm brass");
		expect(textarea.className).toContain("textarea-md");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<TextAreaInput aria-label="Description" value="Warm brass" readOnly />,
		);

		await expectNoAxeViolations(container);
	});

	it("applies size and custom classes", () => {
		renderWithProviders(
			<TextAreaInput
				value="Long tail"
				readOnly
				size="sm"
				className="min-h-20"
			/>,
		);

		const textarea = screen.getByDisplayValue("Long tail");
		expect(textarea.className).toContain("textarea-sm");
		expect(textarea.className).toContain("min-h-20");
	});

	it("applies large size class", () => {
		renderWithProviders(<TextAreaInput value="Test" readOnly size="lg" />);

		const textarea = screen.getByDisplayValue("Test");
		expect(textarea.className).toContain("textarea-lg");
	});
});
