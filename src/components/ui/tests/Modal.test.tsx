import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "@/components/ui/Modal";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("Modal", () => {
	it("renders children", () => {
		renderWithProviders(
			<Modal>
				<div data-testid="modal-content">Modal Content</div>
			</Modal>,
		);
		expect(screen.getByTestId("modal-content")).toBeTruthy();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<Modal>
				<div>Modal Content</div>
			</Modal>,
		);

		await expectNoAxeViolations(container);
	});

	it("applies custom panelClassName", () => {
		const customClass = "my-custom-panel";
		renderWithProviders(
			<Modal panelClassName={customClass}>
				<div>Content</div>
			</Modal>,
		);
		expect(screen.getByText("Content").parentElement).toHaveClass(customClass);
	});

	it("calls onClose when backdrop button is clicked", () => {
		const onClose = vi.fn();
		renderWithProviders(
			<Modal onClose={onClose}>
				<div>Content</div>
			</Modal>,
		);

		const closeButton = screen.getByRole("button", { name: /close/i });
		closeButton.click();

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
