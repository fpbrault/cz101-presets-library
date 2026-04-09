import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SetlistsPageView } from "@/routes/SetlistsPage";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

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
};

describe("SetlistsPage (user playlists)", () => {
	it("has no accessibility violations", async () => {
		const { container } = renderWithProviders(
			<SetlistsPageView {...noopProps} />,
		);

		await expectNoAxeViolations(container);
	});

	it("shows a notice when no playlist is selected", () => {
		renderWithProviders(<SetlistsPageView {...noopProps} />);

		expect(
			screen.getByText("Select a setlist or create a new one."),
		).toBeTruthy();
	});
});
