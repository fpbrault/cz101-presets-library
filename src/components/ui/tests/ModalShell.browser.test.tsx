import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ModalShell from "@/components/ui/ModalShell";
import { fixture } from "@/test/browserFixture";

describe("ModalShell", () => {
	it("renders children inside the modal", async () => {
		await fixture(
			<ModalShell>
				<p>Modal Content</p>
			</ModalShell>,
		);
		expect(screen.getByText("Modal Content")).toBeTruthy();
	});

	it("renders as an open dialog element", async () => {
		const container = await fixture(
			<ModalShell>
				<span>hi</span>
			</ModalShell>,
		);
		const dialog = container.querySelector("dialog");
		expect(dialog).toBeTruthy();
		expect(dialog?.open).toBe(true);
	});

	it("applies modal-open class to dialog", async () => {
		const container = await fixture(
			<ModalShell>
				<span>hi</span>
			</ModalShell>,
		);
		const dialog = container.querySelector("dialog");
		expect(dialog?.className).toContain("modal-open");
	});

	it("applies custom panelClassName to modal-box", async () => {
		const container = await fixture(
			<ModalShell panelClassName="w-full max-w-4xl">
				<span>hi</span>
			</ModalShell>,
		);
		const box = container.querySelector(".modal-box");
		expect(box?.className).toContain("max-w-4xl");
	});

	it("does not render backdrop when onClose is not provided", async () => {
		const container = await fixture(
			<ModalShell>
				<span>hi</span>
			</ModalShell>,
		);
		expect(container.querySelector(".modal-backdrop")).toBeNull();
	});

	it("renders a backdrop button when onClose is provided", async () => {
		await fixture(
			<ModalShell onClose={vi.fn()}>
				<span>hi</span>
			</ModalShell>,
		);
		expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
	});

	it("calls onClose when backdrop button is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		await fixture(
			<ModalShell onClose={onClose}>
				<span>hi</span>
			</ModalShell>,
		);
		await user.click(screen.getByRole("button", { name: /close/i }));
		expect(onClose).toHaveBeenCalledOnce();
	});
});
