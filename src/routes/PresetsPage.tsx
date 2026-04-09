import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import PresetDetails from "@/components/presets/PresetDetails";
import PresetList from "@/components/presets/PresetList";
import Button from "@/components/ui/Button";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import PresetsSidebarContent from "@/features/presets/components/PresetsSidebarContent";
import SaveDraftPresetModal from "@/features/presets/components/SaveDraftPresetModal";
import { usePresetMode } from "@/features/presets/hooks/usePresetMode";
import { useSetlistMode } from "@/features/setlists/hooks/useSetlistMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";
import type { Preset } from "@/lib/presets/presetManager";

export default function PresetsPage() {
	const navigate = useNavigate();
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [currentPreset, setCurrentPreset] = useState<Preset | null>(null);

	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(
		null,
	);

	useMidiSetup(setMidiPorts);

	const presetMode = usePresetMode({
		selectedMidiPort,
		selectedMidiChannel,
		setCurrentPreset,
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
	});

	const setlistMode = useSetlistMode({
		selectedMidiPort,
		selectedMidiChannel,
	});

	const handleDeletePreset = async (id: string) => {
		await presetMode.deletePresetById(id);
		setShowDeleteModal(false);
	};

	const handleNavigate = (mode: AppMode) => {
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
					performanceMode={false}
					setPerformanceMode={() =>
						(window.location.href = currentPreset
							? `/performance?presetId=${currentPreset.id}`
							: "/performance")
					}
					appMode="presets"
					onNavigate={handleNavigate}
				/>

				<PresetsSidebarContent
					playlists={setlistMode.playlists}
					dragOverPlaylistId={dragOverPlaylistId}
					setDragOverPlaylistId={setDragOverPlaylistId}
					onAddPresetToPlaylist={setlistMode.handleAddPreset}
				/>

				<PresetList
					handleSelectPreset={presetMode.handleSelectPreset}
					handleActivatePreset={presetMode.handleActivatePreset}
					currentPreset={currentPreset}
					autoSend={presetMode.autoSend}
					onToggleAutoSend={presetMode.handleToggleAutoSend}
					onSendCurrentPreset={() =>
						presetMode.handleSendCurrentPreset(currentPreset)
					}
					onRetrieveCurrentPreset={presetMode.handleRetrieveCurrentPreset}
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
						<Button
							type="button"
							onClick={() => setShowDeleteModal(false)}
							unstyled
						>
							close
						</Button>
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
