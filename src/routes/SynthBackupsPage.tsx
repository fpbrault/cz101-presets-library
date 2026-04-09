import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import SynthBackupsPage from "@/features/synthBackups/components/SynthBackupsPage";
import { useSynthBackupMode } from "@/features/synthBackups/hooks/useSynthBackupMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";

export default function SynthBackupsRoutePage() {
	const navigate = useNavigate();
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [performanceMode, setPerformanceMode] = useState(false);

	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	useMidiSetup(setMidiPorts);

	const synthBackupMode = useSynthBackupMode({
		selectedMidiPort,
		selectedMidiChannel,
		setAppMode: (mode: AppMode) => {
			const routeMap: Record<AppMode, string> = {
				performance: "/performance",
				presets: "/presets",
				synthBackups: "/synth-backups",
				setlists: "/setlists",
				tagManager: "/tags",
				duplicateFinder: "/duplicates",
			};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			navigate(routeMap[mode] as any);
		},
		openSaveDraftPresetModal: () => {},
	});

	const handleNavigate = (mode: AppMode) => {
		setPerformanceMode(false);
		const routeMap: Record<AppMode, string> = {
			performance: "/performance",
			presets: "/presets",
			synthBackups: "/synth-backups",
			setlists: "/setlists",
			tagManager: "/tags",
			duplicateFinder: "/duplicates",
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		navigate(routeMap[mode] as any);
	};

	return (
		<main className="flex flex-col w-full h-full">
			<div className="flex flex-row h-full overflow-hidden">
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
					performanceMode={performanceMode}
					setPerformanceMode={setPerformanceMode}
					appMode="synthBackups"
					onNavigate={handleNavigate}
				/>

				<SynthBackupsPage
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
					onPreviewEntryInBuffer={
						synthBackupMode.handlePreviewBackupEntryInBuffer
					}
				/>
			</div>
		</main>
	);
}
