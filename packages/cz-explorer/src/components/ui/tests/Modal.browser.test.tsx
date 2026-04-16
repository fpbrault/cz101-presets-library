import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Modal from "@/components/ui/Modal";
import { fixture } from "@/test/browserFixture";

describe("Modal", () => {
	it("renders children inside the modal", async () => {
		await fixture(
			<Modal>
				<p>Modal Content</p>
			</Modal>,
		);
		expect(screen.getByText("Modal Content")).toBeTruthy();
	});

	it("renders as an open dialog element", async () => {
		const container = await fixture(
			<Modal>
				<span>hi</span>
			</Modal>,
		);
		const dialog = container.querySelector("dialog");
		expect(dialog).toBeTruthy();
		expect(dialog?.open).toBe(true);
	});

	it("applies modal-open class to dialog", async () => {
		const container = await fixture(
			<Modal>
				<span>hi</span>
			</Modal>,
		);
		const dialog = container.querySelector("dialog");
		expect(dialog?.className).toContain("modal-open");
	});

	it("applies custom panelClassName to modal-box", async () => {
		const container = await fixture(
			<Modal panelClassName="w-full max-w-4xl">
				<span>hi</span>
			</Modal>,
		);
		const box = container.querySelector(".modal-box");
		expect(box?.className).toContain("max-w-4xl");
	});

	it("does not render backdrop when onClose is not provided", async () => {
		const container = await fixture(
			<Modal>
				<span>hi</span>
			</Modal>,
		);
		expect(container.querySelector(".modal-backdrop")).toBeNull();
	});

	it("renders a backdrop button when onClose is provided", async () => {
		await fixture(
			<Modal onClose={vi.fn()}>
				<span>hi</span>
			</Modal>,
		);
		expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
	});

	it("calls onClose when backdrop button is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		await fixture(
			<Modal onClose={onClose}>
				<span>hi</span>
			</Modal>,
		);
		await user.click(screen.getByRole("button", { name: /close/i }));
		expect(onClose).toHaveBeenCalledOnce();
	});
});
