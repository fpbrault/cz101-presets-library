import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/context/ToastContext";
import {
	createSynthBackup,
	deleteSynthBackup,
	exportSynthBackup,
	getSynthBackups,
	importSynthBackup,
	type SynthBackup,
} from "@/lib/collections/synthBackupManager";
import {
	getMatchingPresetBySysex,
	retrieveInternalBackupFromSynth,
	writeSysexDataToSynthSlot,
	writeSysexDataToTemporaryBuffer,
} from "@/lib/presets/presetManager";

type AppMode =
	| "presets"
	| "synthBackups"
	| "setlists"
	| "tagManager"
	| "duplicateFinder";

interface UseSynthBackupModeParams {
	selectedMidiPort: string;
	selectedMidiChannel: number;
	setAppMode?: (mode: AppMode) => void;
	openSaveDraftPresetModal: (
		sysexData: Uint8Array,
		matchingPresetName: Awaited<ReturnType<typeof getMatchingPresetBySysex>>,
		suggestedName: string,
	) => void;
}

export function useSynthBackupMode({
	selectedMidiPort,
	selectedMidiChannel,
	setAppMode = () => {},
	openSaveDraftPresetModal,
}: UseSynthBackupModeParams) {
	const { notifySuccess, notifyInfo, notifyError } = useToast();
	const [backups, setBackups] = useState<SynthBackup[]>([]);
	const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
	const selectedBackupIdRef = useRef(selectedBackupId);
	selectedBackupIdRef.current = selectedBackupId;
	const [backupProgress, setBackupProgress] = useState<{
		completed: number;
		total: number;
	} | null>(null);
	const [isBackingUp, setIsBackingUp] = useState(false);
	const [isRestoringBackup, setIsRestoringBackup] = useState(false);
	const [restoreProgress, setRestoreProgress] = useState<{
		completed: number;
		total: number;
		attempts: number;
	} | null>(null);

	const refreshBackups = useCallback(() => {
		const currentId = selectedBackupIdRef.current;
		const nextBackups = getSynthBackups();
		setBackups(nextBackups);
		if (currentId && !nextBackups.some((backup) => backup.id === currentId)) {
			setSelectedBackupId(nextBackups[0]?.id ?? null);
		}
		if (!currentId && nextBackups.length > 0) {
			setSelectedBackupId(nextBackups[0].id);
		}
	}, []);

	useEffect(() => {
		refreshBackups();

		window.addEventListener("synth-backups-updated", refreshBackups);

		return () => {
			window.removeEventListener("synth-backups-updated", refreshBackups);
		};
	}, [refreshBackups]);

	const handleCreateBackup = async () => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before creating synth backups.");
			return;
		}

		try {
			setIsBackingUp(true);
			setBackupProgress({ completed: 0, total: 16 });

			const entries = await retrieveInternalBackupFromSynth(
				selectedMidiPort,
				selectedMidiChannel,
				(completed, total) => {
					setBackupProgress({ completed, total });
				},
			);

			const backup = createSynthBackup({
				name: `Internal Backup ${new Date().toLocaleString()}`,
				source: "internal-16",
				entries,
			});

			refreshBackups();
			setSelectedBackupId(backup.id);
			setAppMode("synthBackups");

			const exactMatchCount = entries.filter(
				(entry) => entry.isExactLibraryMatch,
			).length;
			notifySuccess(
				`Backup complete: ${entries.length}/16 slots retrieved, ${exactMatchCount} exact library matches.`,
			);
		} catch (error) {
			notifyError((error as Error).message);
		} finally {
			setIsBackingUp(false);
			setBackupProgress(null);
		}
	};

	const handleDeleteBackup = (backupId: string) => {
		deleteSynthBackup(backupId);
		refreshBackups();
	};

	const handleExportBackup = async (backupId: string) => {
		const json = exportSynthBackup(backupId);

		if ((window as Window & { __TAURI__?: unknown }).__TAURI__) {
			const filePath = await save({
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
			});

			if (filePath) {
				await writeTextFile(filePath, json);
			}
			return;
		}

		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "synth-backup.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleImportBackup = async (file: File) => {
		const json = await file.text();
		const importedBackup = importSynthBackup(json);
		refreshBackups();
		setSelectedBackupId(importedBackup.id);
		setAppMode("synthBackups");
		notifySuccess(`Imported synth backup: ${importedBackup.name}.`);
	};

	const handleSaveBackupEntryAsPreset = async (
		backupId: string,
		entryIndex: number,
	) => {
		const backup = backups.find((item) => item.id === backupId);
		const entry = backup?.entries[entryIndex];

		if (!entry) {
			notifyError("Backup entry not found.");
			return;
		}

		const matchingPreset = await getMatchingPresetBySysex(entry.sysexData);
		openSaveDraftPresetModal(
			entry.sysexData,
			matchingPreset,
			`backup-${backup?.name || "entry"}-${entry.slot}`,
		);
		notifyInfo("Prepared backup entry as a new preset draft.");
	};

	const handleSendBackupEntryToSlot = async (
		backupId: string,
		entryIndex: number,
		bank: "internal" | "cartridge",
		slot: number,
	) => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before sending backup entries.");
			return;
		}

		const backup = backups.find((item) => item.id === backupId);
		const entry = backup?.entries[entryIndex];

		if (!entry) {
			notifyError("Backup entry not found.");
			return;
		}

		await writeSysexDataToSynthSlot(
			entry.sysexData,
			selectedMidiPort,
			selectedMidiChannel,
			bank,
			slot,
		);

		notifySuccess(`Sent backup entry ${entry.slot} to ${bank} slot ${slot}.`);
	};

	const handlePreviewBackupEntryInBuffer = async (
		backupId: string,
		entryIndex: number,
	) => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before previewing backup entries.");
			return;
		}

		const backup = backups.find((item) => item.id === backupId);
		const entry = backup?.entries[entryIndex];

		if (!entry) {
			notifyError("Backup entry not found.");
			return;
		}

		await writeSysexDataToTemporaryBuffer(
			entry.sysexData,
			selectedMidiPort,
			selectedMidiChannel,
		);

		notifyInfo(
			`Previewed backup entry ${entry.slot} in temporary buffer (slot 0x60).`,
		);
	};

	const handleRestoreBackupToSynth = async (
		backupId: string,
		bank: "internal" | "cartridge",
	) => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before restoring synth backups.");
			return;
		}

		const backup = backups.find((item) => item.id === backupId);
		if (!backup) {
			notifyError("Synth backup not found.");
			return;
		}

		const maxAttemptsPerSlot = 3;
		let attempts = 0;

		try {
			setIsRestoringBackup(true);
			setRestoreProgress({
				completed: 0,
				total: backup.entries.length,
				attempts: 0,
			});

			for (let i = 0; i < backup.entries.length; i++) {
				const entry = backup.entries[i];
				let success = false;
				let lastError: unknown;

				for (let attempt = 1; attempt <= maxAttemptsPerSlot; attempt++) {
					attempts += 1;
					setRestoreProgress({
						completed: i,
						total: backup.entries.length,
						attempts,
					});

					try {
						await writeSysexDataToSynthSlot(
							entry.sysexData,
							selectedMidiPort,
							selectedMidiChannel,
							bank,
							entry.slot,
						);
						success = true;
						break;
					} catch (error) {
						lastError = error;
						if (attempt < maxAttemptsPerSlot) {
							await new Promise((resolve) => setTimeout(resolve, 180));
						}
					}
				}

				if (!success) {
					throw new Error(
						`Failed restoring slot ${entry.slot} after ${maxAttemptsPerSlot} attempts: ${(lastError as Error)?.message || "unknown error"}`,
					);
				}

				setRestoreProgress({
					completed: i + 1,
					total: backup.entries.length,
					attempts,
				});
			}

			notifySuccess(
				`Restore complete: ${backup.entries.length}/${backup.entries.length} entries sent to ${bank} slots.`,
			);
		} catch (error) {
			notifyError((error as Error).message);
		} finally {
			setIsRestoringBackup(false);
			setRestoreProgress(null);
		}
	};

	const backupSummary = useMemo(() => {
		return backups.reduce(
			(acc, backup) => {
				acc.count += 1;
				acc.entries += backup.entries.length;
				return acc;
			},
			{ count: 0, entries: 0 },
		);
	}, [backups]);

	return {
		backups,
		selectedBackupId,
		setSelectedBackupId,
		isBackingUp,
		backupProgress,
		isRestoringBackup,
		restoreProgress,
		backupSummary,
		handleCreateBackup,
		handleDeleteBackup,
		handleExportBackup,
		handleImportBackup,
		handleSaveBackupEntryAsPreset,
		handleSendBackupEntryToSlot,
		handlePreviewBackupEntryInBuffer,
		handleRestoreBackupToSynth,
	};
}
