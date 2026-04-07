import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SynthBackupsPage from "@/features/synthBackups/components/SynthBackupsPage";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("SynthBackupsPage", () => {
	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<SynthBackupsPage
				backups={[]}
				selectedBackupId={null}
				isBackingUp={false}
				backupProgress={null}
				isRestoring={false}
				restoreProgress={null}
				onSelectBackup={vi.fn()}
				onCreateBackup={vi.fn()}
				onRestoreBackupToSynth={vi.fn()}
				onDeleteBackup={vi.fn()}
				onExportBackup={vi.fn()}
				onImportBackup={vi.fn()}
				onSaveEntryAsPreset={vi.fn()}
				onSendEntryToSlot={vi.fn()}
				onPreviewEntryInBuffer={vi.fn()}
			/>,
		);

		await expectNoAxeViolations(container);
	});

	it("shows a notice when no backup is selected", () => {
		renderWithProviders(
			<SynthBackupsPage
				backups={[]}
				selectedBackupId={null}
				isBackingUp={false}
				backupProgress={null}
				isRestoring={false}
				restoreProgress={null}
				onSelectBackup={vi.fn()}
				onCreateBackup={vi.fn()}
				onRestoreBackupToSynth={vi.fn()}
				onDeleteBackup={vi.fn()}
				onExportBackup={vi.fn()}
				onImportBackup={vi.fn()}
				onSaveEntryAsPreset={vi.fn()}
				onSendEntryToSlot={vi.fn()}
				onPreviewEntryInBuffer={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Select a synth backup to view its entries."),
		).toBeTruthy();
	});
});
