import { useSearchFilter } from "@/context/SearchFilterContext";
import OptionPanel from "@/features/presets/components/OptionPanel";
import { useSidebarContent } from "@/hooks/useSidebarContent";
import type { Playlist } from "@/lib/collections/playlistManager";
import type { Preset } from "@/lib/presets/presetManager";

interface PresetsSidebarContentProps {
	currentPreset: Preset | null;
	autoSend: boolean;
	onSendCurrentPreset: () => void;
	onToggleAutoSend: () => void;
	onRetrieveCurrentPreset: () => void;
	onRetrievePresetSlot: (
		bank: "internal" | "cartridge",
		slot: number,
	) => void;
	onWritePresetSlot: (bank: "internal" | "cartridge", slot: number) => void;
	playlists: Playlist[];
	dragOverPlaylistId: string | null;
	setDragOverPlaylistId: (id: string | null) => void;
	onAddPresetToPlaylist: (playlistId: string, presetId: string) => void;
}

/**
 * Null-rendering component that registers presets-mode content into the shared
 * navigation sidebar slot via useSidebarContent. Mount this component while the
 * presets mode is active; it cleans up automatically on unmount.
 */
export default function PresetsSidebarContent({
	currentPreset,
	autoSend,
	onSendCurrentPreset,
	onToggleAutoSend,
	onRetrieveCurrentPreset,
	onRetrievePresetSlot,
	onWritePresetSlot,
	playlists,
	dragOverPlaylistId,
	setDragOverPlaylistId,
	onAddPresetToPlaylist,
}: PresetsSidebarContentProps) {
	const { activePlaylistId, setActivePlaylistId } = useSearchFilter();

	useSidebarContent(
		<>
			<OptionPanel
				currentPreset={currentPreset}
				autoSend={autoSend}
				handleSendCurrentPreset={onSendCurrentPreset}
				handleToggleAutoSend={onToggleAutoSend}
				handleRetrieveCurrentPreset={onRetrieveCurrentPreset}
				handleRetrievePresetSlot={onRetrievePresetSlot}
				handleWritePresetSlot={onWritePresetSlot}
			/>

			{playlists.length > 0 && (
				<div className="p-2 rounded-lg bg-base-300 text-xs overflow-y-auto max-h-48">
					<div className="font-bold mb-1 opacity-70 uppercase tracking-wide">
						Setlists
					</div>
					<button
						type="button"
						className={`w-full text-left px-2 py-1 rounded transition-colors ${
							!activePlaylistId
								? "bg-accent text-accent-content font-semibold"
								: "hover:bg-base-200"
						}`}
						onClick={() => setActivePlaylistId(null)}
					>
						All Presets
					</button>
					{playlists.map((playlist) => (
						<button
							key={playlist.id}
							type="button"
							className={`w-full text-left px-2 py-1 rounded transition-colors truncate ${
								activePlaylistId === playlist.id
									? "bg-accent text-accent-content font-semibold"
									: dragOverPlaylistId === playlist.id
										? "bg-success/30 ring-1 ring-success"
										: "hover:bg-base-200"
							}`}
							onClick={() => setActivePlaylistId(playlist.id)}
							title={playlist.name}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "copy";
								setDragOverPlaylistId(playlist.id);
							}}
							onDragLeave={() => setDragOverPlaylistId(null)}
							onDrop={(e) => {
								e.preventDefault();
								setDragOverPlaylistId(null);
								const presetId = e.dataTransfer.getData("text/preset-id");
								if (presetId) {
									onAddPresetToPlaylist(playlist.id, presetId);
								}
							}}
						>
							{playlist.name}
							<span className="ml-1 opacity-60">({playlist.entries.length})</span>
						</button>
					))}
				</div>
			)}
		</>,
	);

	return null;
}
