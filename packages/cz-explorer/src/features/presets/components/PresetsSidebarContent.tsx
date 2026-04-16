import Button from "@/components/ui/Button";
import { useSearchFilter } from "@/context/SearchFilterContext";
import { useSidebarContent } from "@/hooks/useSidebarContent";
import type { Playlist } from "@/lib/collections/playlistManager";

interface PresetsSidebarContentProps {
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
	playlists,
	dragOverPlaylistId,
	setDragOverPlaylistId,
	onAddPresetToPlaylist,
}: PresetsSidebarContentProps) {
	const { activePlaylistId, setActivePlaylistId } = useSearchFilter();

	useSidebarContent(
		playlists.length > 0 && (
			<div className="p-2 rounded-lg bg-base-300 text-xs overflow-y-auto max-h-48">
				<div className="font-bold mb-1 opacity-70 uppercase tracking-wide">
					Setlists
				</div>
				<Button
					type="button"
					unstyled
					className={`w-full text-left px-2 py-1 rounded transition-colors ${
						!activePlaylistId
							? "bg-accent text-accent-content font-semibold"
							: "hover:bg-base-200"
					}`}
					onClick={() => setActivePlaylistId(null)}
				>
					All Presets
				</Button>
				{playlists.map((playlist) => (
					<Button
						key={playlist.id}
						type="button"
						unstyled
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
					</Button>
				))}
			</div>
		),
	);

	// This component has no visual output of its own. It exists solely to
	// register the presets-mode content into the shared sidebar slot via
	// useSidebarContent, and cleans up automatically when it unmounts.
	return null;
}
