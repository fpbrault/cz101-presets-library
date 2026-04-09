import type React from "react";
import { useMemo, useState } from "react";
import InlineNotice from "@/components/feedback/InlineNotice";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import SendEntryModal from "@/features/synthBackups/components/SendEntryModal";
import SynthBackupDetailsHeader from "@/features/synthBackups/components/SynthBackupDetailsHeader";
import SynthBackupEntriesTable from "@/features/synthBackups/components/SynthBackupEntriesTable";
import SynthBackupsSidebar from "@/features/synthBackups/components/SynthBackupsSidebar";
import { useSynthBackupMode } from "@/features/synthBackups/hooks/useSynthBackupMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";
import { useSidebarContent } from "@/hooks/useSidebarContent";
import type { SynthBackup } from "@/lib/collections/synthBackupManager";

export interface SendModalState {
	entryIndex: number;
	bank: "internal" | "cartridge";
	slot: number;
}

export interface SynthBackupsPageViewProps {
	backups: SynthBackup[];
	selectedBackupId: string | null;
	isBackingUp: boolean;
	backupProgress: { completed: number; total: number } | null;
	isRestoring: boolean;
	restoreProgress: {
		completed: number;
		total: number;
		attempts: number;
	} | null;
	onSelectBackup: (backupId: string) => void;
	onCreateBackup: () => void;
	onRestoreBackupToSynth: (
		backupId: string,
		bank: "internal" | "cartridge",
	) => void;
	onDeleteBackup: (backupId: string) => void;
	onExportBackup: (backupId: string) => void;
	onImportBackup: (file: File) => void;
	onSaveEntryAsPreset: (backupId: string, entryIndex: number) => void;
	onSendEntryToSlot: (
		backupId: string,
		entryIndex: number,
		bank: "internal" | "cartridge",
		slot: number,
	) => void;
	onPreviewEntryInBuffer: (backupId: string, entryIndex: number) => void;
}

export const SynthBackupsPageView: React.FC<SynthBackupsPageViewProps> = ({
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

export default function SynthBackupsRoutePage() {
	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	useMidiSetup(setMidiPorts);

	const synthBackupMode = useSynthBackupMode({
		selectedMidiPort,
		selectedMidiChannel,
		openSaveDraftPresetModal: () => {},
	});

	return (
		<SynthBackupsPageView
			backups={synthBackupMode.backups}
			selectedBackupId={synthBackupMode.selectedBackupId}
			isBackingUp={synthBackupMode.isBackingUp}
			backupProgress={synthBackupMode.backupProgress}
			isRestoring={synthBackupMode.isRestoringBackup}
			restoreProgress={synthBackupMode.restoreProgress}
			onSelectBackup={synthBackupMode.setSelectedBackupId}
			onCreateBackup={synthBackupMode.handleCreateBackup}
			onRestoreBackupToSynth={synthBackupMode.handleRestoreBackupToSynth}
			onDeleteBackup={synthBackupMode.handleDeleteBackup}
			onExportBackup={synthBackupMode.handleExportBackup}
			onImportBackup={synthBackupMode.handleImportBackup}
			onSaveEntryAsPreset={synthBackupMode.handleSaveBackupEntryAsPreset}
			onSendEntryToSlot={synthBackupMode.handleSendBackupEntryToSlot}
			onPreviewEntryInBuffer={synthBackupMode.handlePreviewBackupEntryInBuffer}
		/>
	);
}
