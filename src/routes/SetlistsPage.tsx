import { useState } from "react";
import { useNavigate } from "react-router";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import { useSearchFilter } from "@/context/SearchFilterContext";
import SetlistsPage from "@/features/setlists/components/SetlistsPage";
import { useSetlistMode } from "@/features/setlists/hooks/useSetlistMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";

export default function SetlistsRoutePage() {
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [performanceMode, setPerformanceMode] = useState(false);

	const navigate = useNavigate();
	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();
	const { setActivePlaylistId } = useSearchFilter();

	useMidiSetup(setMidiPorts);

	const setlistMode = useSetlistMode({
		selectedMidiPort,
		selectedMidiChannel,
	});

	const handleNavigate = (mode: AppMode) => {
		setPerformanceMode(false);
		const route = mode === "synthBackups" ? "synth-backups" : mode;
		navigate(`/${route}`);
	};

	return (
		<main className="flex flex-col w-full h-full">
			<div className="flex flex-row h-full overflow-hidden">
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
					performanceMode={performanceMode}
					setPerformanceMode={setPerformanceMode}
					appMode="setlists"
					onNavigate={handleNavigate}
				/>

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
						navigate("/presets");
					}}
				/>
			</div>
		</main>
	);
}
