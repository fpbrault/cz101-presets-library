import type React from "react";
import { useMemo, useState } from "react";
import InlineNotice from "@/components/feedback/InlineNotice";
import Button from "@/components/ui/Button";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import SetlistEntriesTable from "@/features/setlists/components/SetlistEntriesTable";
import SetlistsSidebar from "@/features/setlists/components/SetlistsSidebar";
import { useSetlistMode } from "@/features/setlists/hooks/useSetlistMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";
import { useSidebarContent } from "@/hooks/useSidebarContent";
import type { Playlist } from "@/lib/collections/playlistManager";
import type { Preset } from "@/lib/presets/presetManager";

export interface SetlistsPageViewProps {
	playlists: Playlist[];
	selectedPlaylistId: string | null;
	presets: Preset[];
	quickSendIndex: number | null;
	isQuickSending: boolean;
	onSelectPlaylist: (playlistId: string) => void;
	onCreatePlaylist: () => void;
	onRenamePlaylist: (playlistId: string, name: string) => void;
	onDeletePlaylist: (playlistId: string) => void;
	onAddPreset: (playlistId: string, presetId: string) => void;
	onRemoveEntry: (playlistId: string, entryId: string) => void;
	onReorderEntries: (
		playlistId: string,
		fromIndex: number,
		toIndex: number,
	) => void;
	onStartQuickSend: (playlistId: string) => void;
	onStepQuickSend: (direction: "prev" | "next") => void;
	onStopQuickSend: () => void;
	onSendCurrentToBuffer: () => void;
}

export const SetlistsPageView: React.FC<SetlistsPageViewProps> = ({
	playlists,
	selectedPlaylistId,
	presets,
	quickSendIndex,
	isQuickSending,
	onSelectPlaylist,
	onCreatePlaylist,
	onRenamePlaylist,
	onDeletePlaylist,
	onAddPreset,
	onRemoveEntry,
	onReorderEntries,
	onStartQuickSend,
	onStepQuickSend,
	onStopQuickSend,
	onSendCurrentToBuffer,
}) => {
	const [addPresetSearch, setAddPresetSearch] = useState("");
	const [showAddPresetModal, setShowAddPresetModal] = useState(false);

	const selectedPlaylist = useMemo(
		() => playlists.find((p) => p.id === selectedPlaylistId) ?? null,
		[playlists, selectedPlaylistId],
	);

	const filteredPresets = useMemo(() => {
		const q = addPresetSearch.toLowerCase();
		return presets.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				(p.author ?? "").toLowerCase().includes(q),
		);
	}, [presets, addPresetSearch]);

	const currentStepPreset = useMemo(() => {
		if (!selectedPlaylist || quickSendIndex === null) return null;
		const entry = selectedPlaylist.entries[quickSendIndex];
		if (!entry) return null;
		return presets.find((p) => p.id === entry.presetId) ?? null;
	}, [selectedPlaylist, quickSendIndex, presets]);

	useSidebarContent(
		<div className="p-2 rounded-lg bg-base-300 text-xs">
			<div>Setlists: {playlists.length}</div>
		</div>,
	);

	return (
		<div className="flex grow h-full overflow-hidden bg-base-300">
			<SetlistsSidebar
				playlists={playlists}
				selectedPlaylistId={selectedPlaylistId}
				onSelectPlaylist={onSelectPlaylist}
				onCreatePlaylist={onCreatePlaylist}
				onRenamePlaylist={onRenamePlaylist}
				onDeletePlaylist={onDeletePlaylist}
			/>

			<section className="flex flex-col grow h-full overflow-hidden">
				{!selectedPlaylist && (
					<div className="flex items-center justify-center grow px-4">
						<InlineNotice
							message="Select a setlist or create a new one."
							tone="neutral"
							size="md"
							className="max-w-md"
						/>
					</div>
				)}

				{selectedPlaylist && (
					<>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-base-content/10 bg-base-200/50">
							<div>
								<div className="text-lg font-bold">{selectedPlaylist.name}</div>
								<div className="text-xs opacity-70">
									{selectedPlaylist.entries.length} preset
									{selectedPlaylist.entries.length !== 1 ? "s" : ""}
								</div>
							</div>
							<div className="flex gap-2 items-center">
								<Button
									variant="accent"
									size="sm"
									onClick={() => setShowAddPresetModal(true)}
								>
									+ Add Preset
								</Button>

								{!isQuickSending ? (
									<Button
										variant="primary"
										size="sm"
										disabled={selectedPlaylist.entries.length === 0}
										onClick={() => onStartQuickSend(selectedPlaylist.id)}
									>
										▶ Quick Send
									</Button>
								) : (
									<>
										<Button
											variant="secondary"
											size="sm"
											onClick={() => onStepQuickSend("prev")}
											disabled={quickSendIndex === 0}
										>
											◀ Prev
										</Button>
										<Button
											variant="info"
											size="sm"
											onClick={onSendCurrentToBuffer}
										>
											Send to Buffer
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onClick={() => onStepQuickSend("next")}
											disabled={
												quickSendIndex === null ||
												quickSendIndex >= selectedPlaylist.entries.length - 1
											}
										>
											Next ▶
										</Button>
										<Button variant="error" size="sm" onClick={onStopQuickSend}>
											■ Stop
										</Button>
									</>
								)}
							</div>
						</div>

						{/* Quick-send current step display */}
						{isQuickSending && (
							<div className="px-4 py-2 bg-accent/10 border-b border-accent/20 flex items-center gap-3">
								<span className="text-xs opacity-70">
									Step {quickSendIndex !== null ? quickSendIndex + 1 : "-"} of{" "}
									{selectedPlaylist.entries.length}
								</span>
								{currentStepPreset && (
									<span className="text-sm font-bold text-accent">
										▶ {currentStepPreset.name}
									</span>
								)}
							</div>
						)}

						<SetlistEntriesTable
							playlist={selectedPlaylist}
							presets={presets}
							quickSendIndex={quickSendIndex}
							onRemoveEntry={onRemoveEntry}
							onReorderEntries={onReorderEntries}
						/>
					</>
				)}
			</section>

			{/* Add Preset Modal */}
			{showAddPresetModal && selectedPlaylist && (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
					<div className="bg-base-100 rounded-xl shadow-xl p-5 w-lg max-h-[80vh] flex flex-col gap-3">
						<h2 className="text-lg font-bold">Add Preset to Setlist</h2>
						<input
							className="input input-sm input-bordered w-full"
							placeholder="Search by name or author…"
							value={addPresetSearch}
							onChange={(e) => setAddPresetSearch(e.target.value)}
						/>
						<div className="overflow-auto grow">
							<table className="table table-xs table-zebra w-full">
								<thead>
									<tr>
										<th>Name</th>
										<th>Author</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{filteredPresets.slice(0, 100).map((preset) => (
										<tr key={preset.id}>
											<td>{preset.name}</td>
											<td className="text-xs opacity-70">{preset.author}</td>
											<td>
												<Button
													variant="primary"
													size="sm"
													onClick={() => {
														onAddPreset(selectedPlaylist.id, preset.id);
													}}
												>
													Add
												</Button>
											</td>
										</tr>
									))}
									{filteredPresets.length === 0 && (
										<tr>
											<td colSpan={3} className="text-center opacity-60">
												No presets found.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<div className="flex justify-end">
							<Button
								variant="secondary"
								onClick={() => {
									setShowAddPresetModal(false);
									setAddPresetSearch("");
								}}
							>
								Done
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default function SetlistsRoutePage() {
	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	useMidiSetup(setMidiPorts);

	const setlistMode = useSetlistMode({
		selectedMidiPort,
		selectedMidiChannel,
	});

	return (
		<SetlistsPageView
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
		/>
	);
}
