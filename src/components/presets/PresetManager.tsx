import { useState } from "react";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import PerformanceMode from "@/components/presets/PerformanceMode";
import PresetDetails from "@/components/presets/PresetDetails";
import PresetList from "@/components/presets/PresetList";
import Button from "@/components/ui/Button";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import { useSearchFilter } from "@/context/SearchFilterContext";
import PresetsSidebarContent from "@/features/presets/components/PresetsSidebarContent";
import SaveDraftPresetModal from "@/features/presets/components/SaveDraftPresetModal";
import { usePresetMode } from "@/features/presets/hooks/usePresetMode";
import SetlistsPage from "@/features/setlists/components/SetlistsPage";
import { useSetlistMode } from "@/features/setlists/hooks/useSetlistMode";
import SynthBackupsPage from "@/features/synthBackups/components/SynthBackupsPage";
import { useSynthBackupMode } from "@/features/synthBackups/hooks/useSynthBackupMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";
import type { Preset } from "@/lib/presets/presetManager";
import DuplicateFinderPage from "../../features/presets/components/DuplicateFinderPage";
import TagManagerPage from "../../features/presets/components/TagManagerPage";

export default function PresetManager() {
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [performanceMode, setPerformanceMode] = useState(false);
	const [currentPreset, setCurrentPreset] = useState<Preset | null>(null);
	const [appMode, setAppMode] = useState<AppMode>("presets");

	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();
	const { setActivePlaylistId } = useSearchFilter();

	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(
		null,
	);

	useMidiSetup(setMidiPorts);

	const presetMode = usePresetMode({
		selectedMidiPort,
		selectedMidiChannel,
		setCurrentPreset,
		setAppMode,
	});

	const synthBackupMode = useSynthBackupMode({
		selectedMidiPort,
		selectedMidiChannel,
		setAppMode,
		openSaveDraftPresetModal: presetMode.openSaveDraftPresetModal,
	});

	const setlistMode = useSetlistMode({
		selectedMidiPort,
		selectedMidiChannel,
	});

	const handleDeletePreset = async (id: string) => {
		await presetMode.deletePresetById(id);
		setShowDeleteModal(false);
	};

	return (
		<main className="flex flex-col w-full h-full">
			<div className="flex flex-row h-full overflow-hidden">
				{/* Navigation sidebar — always visible across all modes */}
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
					performanceMode={performanceMode}
					setPerformanceMode={setPerformanceMode}
					appMode={appMode}
					setAppMode={setAppMode}
				/>

				{/*
				 * Sidebar content registrars — null-rendering components that hook
				 * into the sidebar and display mode-specific content in its slot.
				 * Each one unmounts when its mode is no longer active, automatically
				 * clearing the sidebar slot.
				 */}
				{appMode === "presets" && !performanceMode && (
					<PresetsSidebarContent
						playlists={setlistMode.playlists}
						dragOverPlaylistId={dragOverPlaylistId}
						setDragOverPlaylistId={setDragOverPlaylistId}
						onAddPresetToPlaylist={setlistMode.handleAddPreset}
					/>
				)}

				{/* Main content area */}
				{performanceMode ? (
					<PerformanceMode
						currentPreset={currentPreset}
						handleSelectPreset={presetMode.handleSelectPreset}
					/>
				) : (
					<>
						{appMode === "presets" && (
							<>
								<PresetList
									handleSelectPreset={presetMode.handleSelectPreset}
									handleActivatePreset={presetMode.handleActivatePreset}
									currentPreset={currentPreset}
									autoSend={presetMode.autoSend}
									onToggleAutoSend={presetMode.handleToggleAutoSend}
									onSendCurrentPreset={() =>
										presetMode.handleSendCurrentPreset(currentPreset)
									}
									onRetrieveCurrentPreset={
										presetMode.handleRetrieveCurrentPreset
									}
									onRetrievePresetSlot={presetMode.handleRetrievePresetSlot}
									playlists={setlistMode.playlists}
									onAddPresetToPlaylist={setlistMode.handleAddPreset}
								/>
								<PresetDetails
									editMode={presetMode.editMode}
									currentPreset={currentPreset}
									onPresetUpdated={setCurrentPreset}
									setShowDeleteModal={setShowDeleteModal}
									setEditMode={presetMode.setEditMode}
									onWritePresetSlot={(bank, slot) =>
										presetMode.handleWritePresetSlot(currentPreset, bank, slot)
									}
								/>
							</>
						)}

						{appMode === "synthBackups" && (
							<SynthBackupsPage
								backups={synthBackupMode.backups}
								selectedBackupId={synthBackupMode.selectedBackupId}
								isBackingUp={synthBackupMode.isBackingUp}
								backupProgress={synthBackupMode.backupProgress}
								isRestoring={synthBackupMode.isRestoringBackup}
								restoreProgress={synthBackupMode.restoreProgress}
								onSelectBackup={synthBackupMode.setSelectedBackupId}
								onCreateBackup={synthBackupMode.handleCreateBackup}
								onRestoreBackupToSynth={
									synthBackupMode.handleRestoreBackupToSynth
								}
								onDeleteBackup={synthBackupMode.handleDeleteBackup}
								onExportBackup={synthBackupMode.handleExportBackup}
								onImportBackup={synthBackupMode.handleImportBackup}
								onSaveEntryAsPreset={
									synthBackupMode.handleSaveBackupEntryAsPreset
								}
								onSendEntryToSlot={synthBackupMode.handleSendBackupEntryToSlot}
								onPreviewEntryInBuffer={
									synthBackupMode.handlePreviewBackupEntryInBuffer
								}
							/>
						)}

						{appMode === "setlists" && (
							<SetlistsPage
								playlists={setlistMode.playlists}
								selectedPlaylistId={setlistMode.selectedPlaylistId}
								presets={setlistMode.presets}
								quickSendIndex={setlistMode.quickSendIndex}
								isQuickSending={setlistMode.isQuickSending}
								onSelectPlaylist={setlistMode.setSelectedPlaylistId}
								onCreatePlaylist={setlistMode.handleCreatePlaylist}
								onRenamePlaylist={setlistMode.handleRenamePlaylist}
								onDeletePlaylist={setlistMode.handleDeletePlaylist}
								onAddPreset={setlistMode.handleAddPreset}
								onRemoveEntry={setlistMode.handleRemoveEntry}
								onReorderEntries={setlistMode.handleReorderEntries}
								onStartQuickSend={setlistMode.handleStartQuickSend}
								onStepQuickSend={setlistMode.handleStepQuickSend}
								onStopQuickSend={setlistMode.handleStopQuickSend}
								onSendCurrentToBuffer={setlistMode.handleSendCurrentToBuffer}
								onPlayInPerformanceMode={(playlistId) => {
									setActivePlaylistId(playlistId);
									setAppMode("presets");
									setPerformanceMode(true);
								}}
							/>
						)}

						{appMode === "tagManager" && <TagManagerPage />}

						{appMode === "duplicateFinder" && <DuplicateFinderPage />}
					</>
				)}
			</div>

			{showDeleteModal && (
				<dialog open className="modal modal-open">
					<div className="modal-box">
						<h3 className="text-lg font-bold">Confirm Delete</h3>
						<p className="py-2 text-sm opacity-80">
							Are you sure you want to delete this preset?
						</p>
						<div className="modal-action">
							<Button
								variant="secondary"
								onClick={() => setShowDeleteModal(false)}
							>
								Cancel
							</Button>
							<Button
								variant="error"
								onClick={() => handleDeletePreset(currentPreset?.id || "")}
							>
								Delete
							</Button>
						</div>
					</div>
					<form method="dialog" className="modal-backdrop">
						<button type="button" onClick={() => setShowDeleteModal(false)}>
							close
						</button>
					</form>
				</dialog>
			)}

			<SaveDraftPresetModal
				isOpen={Boolean(presetMode.saveDraftPresetState)}
				matchingPresetName={
					presetMode.saveDraftPresetState?.matchingPreset?.name
				}
				name={presetMode.saveDraftName}
				author={presetMode.saveDraftAuthor}
				tags={presetMode.saveDraftTags}
				description={presetMode.saveDraftDescription}
				onNameChange={presetMode.setSaveDraftName}
				onAuthorChange={presetMode.setSaveDraftAuthor}
				onTagsChange={presetMode.setSaveDraftTags}
				onDescriptionChange={presetMode.setSaveDraftDescription}
				onCancel={presetMode.closeSaveDraftPresetModal}
				onSave={presetMode.handleSaveDraftPreset}
			/>
		</main>
	);
}
