import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import {
	addPresetToPlaylist,
	createPlaylist,
	deletePlaylist,
	getPlaylists,
	type Playlist,
	removePlaylistEntry,
	renamePlaylist,
	reorderPlaylistEntries,
} from "@/lib/collections/playlistManager";
import {
	getPresets,
	type Preset,
	writeSysexDataToTemporaryBuffer,
} from "@/lib/presets/presetManager";

interface UseSetlistModeParams {
	selectedMidiPort: string;
	selectedMidiChannel: number;
}

export function useSetlistMode({
	selectedMidiPort,
	selectedMidiChannel,
}: UseSetlistModeParams) {
	const { notifySuccess, notifyInfo, notifyError } = useToast();
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
		null,
	);
	const [presets, setPresets] = useState<Preset[]>([]);
	const [quickSendIndex, setQuickSendIndex] = useState<number | null>(null);
	const [isQuickSending, setIsQuickSending] = useState(false);

	const refreshPlaylists = () => {
		const next = getPlaylists();
		setPlaylists(next);
		if (selectedPlaylistId && !next.some((p) => p.id === selectedPlaylistId)) {
			setSelectedPlaylistId(next[0]?.id ?? null);
		}
		if (!selectedPlaylistId && next.length > 0) {
			setSelectedPlaylistId(next[0].id);
		}
	};

	useEffect(() => {
		refreshPlaylists();

		const refreshPresetsFromDb = async () => {
			const allPresets = await getPresets();
			setPresets(allPresets);
		};
		refreshPresetsFromDb();

		const handlePlaylistsUpdated = () => refreshPlaylists();
		window.addEventListener("playlists-updated", handlePlaylistsUpdated);
		return () =>
			window.removeEventListener("playlists-updated", handlePlaylistsUpdated);
	}, [refreshPlaylists]);

	const handleCreatePlaylist = () => {
		const playlist = createPlaylist("New Setlist");
		refreshPlaylists();
		setSelectedPlaylistId(playlist.id);
	};

	const handleRenamePlaylist = (playlistId: string, name: string) => {
		renamePlaylist(playlistId, name);
		refreshPlaylists();
	};

	const handleDeletePlaylist = (playlistId: string) => {
		deletePlaylist(playlistId);
		if (quickSendIndex !== null) {
			setIsQuickSending(false);
			setQuickSendIndex(null);
		}
		refreshPlaylists();
	};

	const handleAddPreset = (playlistId: string, presetId: string) => {
		addPresetToPlaylist(playlistId, presetId);
		refreshPlaylists();
	};

	const handleRemoveEntry = (playlistId: string, entryId: string) => {
		removePlaylistEntry(playlistId, entryId);
		refreshPlaylists();
	};

	const handleReorderEntries = (
		playlistId: string,
		fromIndex: number,
		toIndex: number,
	) => {
		const playlist = playlists.find((p) => p.id === playlistId);
		if (!playlist) return;
		const entries = [...playlist.entries];
		const [moved] = entries.splice(fromIndex, 1);
		entries.splice(toIndex, 0, moved);
		reorderPlaylistEntries(playlistId, entries);
		refreshPlaylists();
	};

	const handleStartQuickSend = (playlistId: string) => {
		setSelectedPlaylistId(playlistId);
		setQuickSendIndex(0);
		setIsQuickSending(true);
	};

	const handleStepQuickSend = (direction: "prev" | "next") => {
		const playlist = playlists.find((p) => p.id === selectedPlaylistId);
		if (!playlist || quickSendIndex === null) return;
		const next =
			direction === "next"
				? Math.min(quickSendIndex + 1, playlist.entries.length - 1)
				: Math.max(quickSendIndex - 1, 0);
		setQuickSendIndex(next);
	};

	const handleStopQuickSend = () => {
		setIsQuickSending(false);
		setQuickSendIndex(null);
	};

	const handleSendCurrentToBuffer = async () => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before sending presets.");
			return;
		}

		const playlist = playlists.find((p) => p.id === selectedPlaylistId);
		if (!playlist || quickSendIndex === null) return;

		const entry = playlist.entries[quickSendIndex];
		if (!entry) return;

		const preset = presets.find((p) => p.id === entry.presetId);
		if (!preset) {
			notifyError("Preset not found in library.");
			return;
		}

		await writeSysexDataToTemporaryBuffer(
			preset.sysexData,
			selectedMidiPort,
			selectedMidiChannel,
		);

		notifySuccess(`Sent "${preset.name}" to temporary buffer.`);
	};

	return {
		playlists,
		selectedPlaylistId,
		setSelectedPlaylistId,
		presets,
		quickSendIndex,
		isQuickSending,
		handleCreatePlaylist,
		handleRenamePlaylist,
		handleDeletePlaylist,
		handleAddPreset,
		handleRemoveEntry,
		handleReorderEntries,
		handleStartQuickSend,
		handleStepQuickSend,
		handleStopQuickSend,
		handleSendCurrentToBuffer,
	};
}
