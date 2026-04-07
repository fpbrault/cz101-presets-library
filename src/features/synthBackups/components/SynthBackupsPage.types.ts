import type { SynthBackup } from "@/lib/collections/synthBackupManager";

export interface SynthBackupsPageProps {
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

export interface SendModalState {
	entryIndex: number;
	bank: "internal" | "cartridge";
	slot: number;
}
