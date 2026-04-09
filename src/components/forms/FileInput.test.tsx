import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FileInput from "@/components/forms/FileInput";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("FileInput", () => {
	it("renders file input with defaults", () => {
		renderWithProviders(<FileInput aria-label="Upload File" />);

		const input = screen.getByLabelText("Upload File") as HTMLInputElement;
		expect(input.type).toBe("file");
		expect(input.className).toContain("file-input-md");
		expect(input.className).toContain("file-input-neutral");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<FileInput aria-label="Upload file" />,
		);

		await expectNoAxeViolations(container);
	});

	it("applies tone and size variants", () => {
		renderWithProviders(
			<FileInput aria-label="Upload File" tone="primary" inputSize="lg" />,
		);

		const input = screen.getByLabelText("Upload File");
		expect(input.className).toContain("file-input-primary");
		expect(input.className).toContain("file-input-lg");
	});

	it("applies custom className", () => {
		renderWithProviders(
			<FileInput aria-label="Upload File" className="custom-file-input" />,
		);

		const input = screen.getByLabelText("Upload File");
		expect(input.className).toContain("custom-file-input");
	});
});
