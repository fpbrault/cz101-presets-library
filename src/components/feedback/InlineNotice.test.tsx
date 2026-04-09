import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InlineNotice from "@/components/feedback/InlineNotice";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("InlineNotice", () => {
	it("renders the message content", () => {
		renderWithProviders(<InlineNotice message="Hello synth" />);

		expect(screen.getByRole("status").textContent).toContain("Hello synth");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<InlineNotice message="Hello synth" />,
		);

		await expectNoAxeViolations(container);
	});

	it("applies tone and size classes", () => {
		renderWithProviders(
			<InlineNotice message="Warning" tone="warning" size="md" />,
		);

		const status = screen.getByRole("status");
		expect(status.className).toContain("alert-warning");
		expect(status.className).toContain("text-sm");
	});
});
