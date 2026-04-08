import type React from "react";
import { useMemo, useState } from "react";
import InlineNotice from "@/components/feedback/InlineNotice";
import SendEntryModal from "@/features/synthBackups/components/SendEntryModal";
import SynthBackupDetailsHeader from "@/features/synthBackups/components/SynthBackupDetailsHeader";
import SynthBackupEntriesTable from "@/features/synthBackups/components/SynthBackupEntriesTable";
import type {
	SendModalState,
	SynthBackupsPageProps,
} from "@/features/synthBackups/components/SynthBackupsPage.types";
import SynthBackupsSidebar from "@/features/synthBackups/components/SynthBackupsSidebar";
import { useSidebarContent } from "@/hooks/useSidebarContent";

const SynthBackupsPage: React.FC<SynthBackupsPageProps> = ({
	backups,
	selectedBackupId,
	isBackingUp,
	backupProgress,
	isRestoring,
	restoreProgress,
	onSelectBackup,
	onCreateBackup,
	onRestoreBackupToSynth,
	onDeleteBackup,
	onExportBackup,
	onImportBackup,
	onSaveEntryAsPreset,
	onSendEntryToSlot,
	onPreviewEntryInBuffer,
}) => {
	const [sendModalState, setSendModalState] = useState<SendModalState | null>(
		null,
	);
	const [restoreBank, setRestoreBank] = useState<"internal" | "cartridge">(
		"internal",
	);
	const selectedBackup = useMemo(
		() => backups.find((backup) => backup.id === selectedBackupId) ?? null,
		[backups, selectedBackupId],
	);

	const totalEntries = useMemo(
		() => backups.reduce((sum, b) => sum + b.entries.length, 0),
		[backups],
	);

	useSidebarContent(
		<div className="p-2 rounded-lg bg-base-300 text-xs">
			<div>Backups: {backups.length}</div>
			<div>Entries: {totalEntries}</div>
		</div>,
	);

	return (
		<div className="flex grow h-full overflow-hidden bg-base-300">
			<SynthBackupsSidebar
				backups={backups}
				selectedBackupId={selectedBackupId}
				isBackingUp={isBackingUp}
				backupProgress={backupProgress}
				restoreProgress={restoreProgress}
				onSelectBackup={onSelectBackup}
				onCreateBackup={onCreateBackup}
				onImportBackup={onImportBackup}
			/>

			<section className="flex flex-col grow h-full overflow-hidden">
				{!selectedBackup && (
					<div className="flex items-center justify-center grow px-4">
						<InlineNotice
							message="Select a synth backup to view its entries."
							tone="neutral"
							size="md"
							className="max-w-md"
						/>
					</div>
				)}

				{selectedBackup && (
					<>
						<SynthBackupDetailsHeader
							selectedBackup={selectedBackup}
							restoreBank={restoreBank}
							isRestoring={isRestoring}
							onRestoreBankChange={setRestoreBank}
							onRestoreBackupToSynth={onRestoreBackupToSynth}
							onExportBackup={onExportBackup}
							onDeleteBackup={onDeleteBackup}
						/>

						<SynthBackupEntriesTable
							selectedBackup={selectedBackup}
							onPreviewEntryInBuffer={onPreviewEntryInBuffer}
							onSaveEntryAsPreset={onSaveEntryAsPreset}
							onOpenSendModal={(entryIndex, slot) =>
								setSendModalState({
									entryIndex,
									bank: "internal",
									slot,
								})
							}
						/>
					</>
				)}
			</section>

			{selectedBackup && sendModalState && (
				<SendEntryModal
					selectedBackup={selectedBackup}
					sendModalState={sendModalState}
					setSendModalState={setSendModalState}
					onSendEntryToSlot={onSendEntryToSlot}
				/>
			)}
		</div>
	);
};

export default SynthBackupsPage;
