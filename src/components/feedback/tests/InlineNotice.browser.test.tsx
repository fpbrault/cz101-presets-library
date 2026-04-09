import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InlineNotice from "@/components/feedback/InlineNotice";
import { fixture } from "@/test/browserFixture";

describe("InlineNotice", () => {
	it("renders the message text", async () => {
		await fixture(<InlineNotice message="Something happened" />);
		expect(screen.getByText("Something happened")).toBeTruthy();
	});

	it('renders with role="status" for accessibility', async () => {
		await fixture(<InlineNotice message="Status update" />);
		expect(screen.getByRole("status")).toBeTruthy();
	});

	it("applies the info tone class by default", async () => {
		const container = await fixture(<InlineNotice message="Info" />);
		expect(container.querySelector(".alert-info")).toBeTruthy();
	});

	it("applies the success tone class", async () => {
		const container = await fixture(
			<InlineNotice message="Done!" tone="success" />,
		);
		expect(container.querySelector(".alert-success")).toBeTruthy();
	});

	it("applies the warning tone class", async () => {
		const container = await fixture(
			<InlineNotice message="Watch out" tone="warning" />,
		);
		expect(container.querySelector(".alert-warning")).toBeTruthy();
	});

	it("applies the error tone class", async () => {
		const container = await fixture(
			<InlineNotice message="Error!" tone="error" />,
		);
		expect(container.querySelector(".alert-error")).toBeTruthy();
	});

	it("applies the neutral tone class", async () => {
		const container = await fixture(
			<InlineNotice message="Neutral" tone="neutral" />,
		);
		expect(container.querySelector(".alert-neutral")).toBeTruthy();
	});

	it("applies sm size class", async () => {
		const container = await fixture(<InlineNotice message="Small" size="sm" />);
		expect(container.querySelector(".alert")?.className).toContain("text-xs");
	});

	it("applies md size class", async () => {
		const container = await fixture(
			<InlineNotice message="Medium" size="md" />,
		);
		expect(container.querySelector(".alert")?.className).toContain("text-sm");
	});

	it("supports additional className prop", async () => {
		const container = await fixture(
			<InlineNotice message="Custom" className="my-custom-class" />,
		);
		expect(container.querySelector(".my-custom-class")).toBeTruthy();
	});

	it("renders ReactNode children as message", async () => {
		await fixture(
			<InlineNotice
				message={<strong data-testid="bold-msg">Bold message</strong>}
			/>,
		);
		expect(screen.getByTestId("bold-msg")).toBeTruthy();
		expect(screen.getByTestId("bold-msg").tagName).toBe("STRONG");
	});
});
