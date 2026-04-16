import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Button from "@/components/ui/Button";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("Button", () => {
	it("renders children", () => {
		renderWithProviders(<Button>Click me</Button>);
		expect(screen.getByText("Click me")).toBeTruthy();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(<Button>Click me</Button>);

		await expectNoAxeViolations(container);
	});

	it("applies correct variant classes", () => {
		renderWithProviders(<Button variant="error">Error</Button>);
		const button = screen.getByRole("button");
		expect(button.className).toContain("btn-error");
	});

	it("applies correct size classes", () => {
		renderWithProviders(<Button size="lg">Large</Button>);
		const button = screen.getByRole("button");
		expect(button.className).toContain("btn-lg");
	});

	it("applies custom className", () => {
		renderWithProviders(<Button className="custom-class">Custom</Button>);
		const button = screen.getByRole("button");
		expect(button.className).toContain("custom-class");
	});
});
