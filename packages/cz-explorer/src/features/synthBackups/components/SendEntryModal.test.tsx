import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SendEntryModal from "@/features/synthBackups/components/SendEntryModal";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

const selectedBackup = {
	id: "backup-1",
	name: "Demo Backup",
	createdAt: "2026-01-01T00:00:00.000Z",
	source: "internal-16" as const,
	entries: [],
};

describe("SendEntryModal (Synth Backup)", () => {
	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<SendEntryModal
				selectedBackup={selectedBackup}
				sendModalState={{ entryIndex: 2, bank: "internal", slot: 3 }}
				setSendModalState={vi.fn()}
				onSendEntryToSlot={vi.fn()}
			/>,
		);

		await expectNoAxeViolations(container);
	});

	it("emits bank/slot changes and submits entry", async () => {
		const user = userEvent.setup();
		const onSendEntryToSlot = vi.fn();
		const setSendModalState = vi.fn();

		renderWithProviders(
			<SendEntryModal
				selectedBackup={selectedBackup}
				sendModalState={{ entryIndex: 2, bank: "internal", slot: 3 }}
				setSendModalState={setSendModalState}
				onSendEntryToSlot={onSendEntryToSlot}
			/>,
		);

		await user.selectOptions(
			screen.getByTestId("send-entry-bank"),
			"cartridge",
		);
		await user.selectOptions(screen.getByTestId("send-entry-slot"), "7");
		await user.click(screen.getByTestId("send-entry-confirm"));

		expect(setSendModalState).toHaveBeenCalledWith({
			entryIndex: 2,
			bank: "cartridge",
			slot: 3,
		});
		expect(setSendModalState).toHaveBeenCalledWith({
			entryIndex: 2,
			bank: "internal",
			slot: 7,
		});
		expect(onSendEntryToSlot).toHaveBeenCalledWith(
			"backup-1",
			2,
			"internal",
			3,
		);
		expect(setSendModalState).toHaveBeenCalled();
	});
});
