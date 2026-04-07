import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SetlistsPage from "@/features/setlists/components/SetlistsPage";
import type { Playlist } from "@/lib/collections/playlistManager";
import type { Preset } from "@/lib/presets/presetManager";
import { fixture } from "@/test/browserFixture";


const noopProps = {
	playlists: [],
	selectedPlaylistId: null,
	presets: [],
	quickSendIndex: null,
	isQuickSending: false,
	onSelectPlaylist: vi.fn(),
	onCreatePlaylist: vi.fn(),
	onRenamePlaylist: vi.fn(),
	onDeletePlaylist: vi.fn(),
	onAddPreset: vi.fn(),
	onRemoveEntry: vi.fn(),
	onReorderEntries: vi.fn(),
	onStartQuickSend: vi.fn(),
	onStepQuickSend: vi.fn(),
	onStopQuickSend: vi.fn(),
	onSendCurrentToBuffer: vi.fn(),
	onPlayInPerformanceMode: vi.fn(),
};

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
	return {
		id: "setlist-1",
		name: "Test Setlist",
		createdAt: new Date().toISOString(),
		entries: [],
		...overrides,
	};
}

function makePreset(overrides: Partial<Preset> = {}): Preset {
	return {
		id: "preset-1",
		name: "Bass 1",
		createdDate: "2024-01-01",
		modifiedDate: "2024-01-01",
		filename: "bass-1.syx",
		sysexData: new Uint8Array([0xf0, 0x44, 0xf7]),
		tags: [],
		author: "Demo",
		description: "",
		...overrides,
	};
}

describe("SetlistsPage (browser)", () => {
	it("shows a notice when no setlist is selected", async () => {
		await fixture(<SetlistsPage {...noopProps} />);
		expect(screen.getByText(/select a setlist/i)).toBeTruthy();
	});

	it("does not show the notice when a setlist is selected", async () => {
		const playlist = makePlaylist();
		await fixture(
			<SetlistsPage
				{...noopProps}
				playlists={[playlist]}
				selectedPlaylistId={playlist.id}
			/>,
		);
		expect(screen.queryByText(/select a setlist/i)).toBeNull();
	});

	it("renders the selected setlist name", async () => {
		const playlist = makePlaylist({ name: "Live Gig 2024" });
		await fixture(
			<SetlistsPage
				{...noopProps}
				playlists={[playlist]}
				selectedPlaylistId={playlist.id}
			/>,
		);
		expect(screen.getAllByText("Live Gig 2024").length).toBeGreaterThan(0);
	});

	it("renders multiple setlists in the sidebar", async () => {
		const playlists = [
			makePlaylist({ id: "setlist-1", name: "Setlist One" }),
			makePlaylist({ id: "setlist-2", name: "Setlist Two" }),
		];
		await fixture(
			<SetlistsPage
				{...noopProps}
				playlists={playlists}
			/>,
		);
		expect(screen.getByText("Setlist One")).toBeTruthy();
		expect(screen.getByText("Setlist Two")).toBeTruthy();
	});

	it("calls onSelectPlaylist when a setlist item is clicked", async () => {
		const user = userEvent.setup();
		const onSelectPlaylist = vi.fn();
		const playlist = makePlaylist({ id: "setlist-click", name: "Click Me" });

		await fixture(
			<SetlistsPage
				{...noopProps}
				playlists={[playlist]}
				onSelectPlaylist={onSelectPlaylist}
			/>,
		);

		await user.click(screen.getByText("Click Me"));
		expect(onSelectPlaylist).toHaveBeenCalledWith("setlist-click");
	});

	it("shows entry rows for a selected setlist", async () => {
		const playlist = makePlaylist({
			id: "setlist-entries",
			entries: [
				{
					id: "entry-1",
					presetId: "preset-1",
				},
				{
					id: "entry-2",
					presetId: "preset-2",
				},
			],
		});
		const presets = [
			makePreset({ id: "preset-1", name: "Bass 1" }),
			makePreset({ id: "preset-2", name: "Pad 2", filename: "pad-2.syx" }),
		];

		await fixture(
			<SetlistsPage
				{...noopProps}
				playlists={[playlist]}
				selectedPlaylistId={playlist.id}
				presets={presets}
			/>,
		);

		expect(screen.getByText("Bass 1")).toBeTruthy();
		expect(screen.getByText("Pad 2")).toBeTruthy();
	});
});
