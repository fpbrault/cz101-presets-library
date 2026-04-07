import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InlineNotice from "@/components/feedback/InlineNotice";

describe("InlineNotice", () => {
	it("renders the message text", () => {
		render(<InlineNotice message="Something happened" />);
		expect(screen.getByText("Something happened")).toBeTruthy();
	});

	it('renders with role="status" for accessibility', () => {
		render(<InlineNotice message="Status update" />);
		expect(screen.getByRole("status")).toBeTruthy();
	});

	it("applies the info tone class by default", () => {
		const { container } = render(<InlineNotice message="Info" />);
		expect(container.querySelector(".alert-info")).toBeTruthy();
	});

	it("applies the success tone class", () => {
		const { container } = render(
			<InlineNotice message="Done!" tone="success" />,
		);
		expect(container.querySelector(".alert-success")).toBeTruthy();
	});

	it("applies the warning tone class", () => {
		const { container } = render(
			<InlineNotice message="Watch out" tone="warning" />,
		);
		expect(container.querySelector(".alert-warning")).toBeTruthy();
	});

	it("applies the error tone class", () => {
		const { container } = render(
			<InlineNotice message="Error!" tone="error" />,
		);
		expect(container.querySelector(".alert-error")).toBeTruthy();
	});

	it("applies the neutral tone class", () => {
		const { container } = render(
			<InlineNotice message="Neutral" tone="neutral" />,
		);
		expect(container.querySelector(".alert-neutral")).toBeTruthy();
	});

	it("applies sm size class", () => {
		const { container } = render(<InlineNotice message="Small" size="sm" />);
		expect(container.querySelector(".alert")?.className).toContain("text-xs");
	});

	it("applies md size class", () => {
		const { container } = render(<InlineNotice message="Medium" size="md" />);
		expect(container.querySelector(".alert")?.className).toContain("text-sm");
	});

	it("supports additional className prop", () => {
		const { container } = render(
			<InlineNotice message="Custom" className="my-custom-class" />,
		);
		expect(container.querySelector(".my-custom-class")).toBeTruthy();
	});

	it("renders ReactNode children as message", () => {
		render(
			<InlineNotice
				message={<strong data-testid="bold-msg">Bold message</strong>}
			/>,
		);
		expect(screen.getByTestId("bold-msg")).toBeTruthy();
		expect(screen.getByTestId("bold-msg").tagName).toBe("STRONG");
	});
});
