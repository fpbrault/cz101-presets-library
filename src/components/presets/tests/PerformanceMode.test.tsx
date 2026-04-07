import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PerformanceMode from "@/components/presets/PerformanceMode";
import type { Preset } from "@/lib/presets/presetManager";
import { fetchPresetData } from "@/lib/presets/presetManager";
import { renderWithProviders } from "@/test/renderWithProviders";

vi.mock("@/lib/presets/presetManager", async () => {
	const actual = await vi.importActual("@/lib/presets/presetManager");
	return {
		...actual,
		fetchPresetData: vi.fn(),
	};
});

vi.mock("webmidi", () => ({
	WebMidi: {
		enabled: true,
		getOutputByName: vi.fn(),
		enable: vi.fn().mockResolvedValue(true),
	},
}));

const makeMockPresets = (): Preset[] =>
	[
		{ id: "1", name: "Preset 1", tags: ["tag1", "tag2"], number: 1 },
		{ id: "2", name: "Preset 2", tags: ["tag2", "tag3"], number: 2 },
		{ id: "3", name: "Preset 3", tags: ["tag1"], number: 3 },
		{ id: "4", name: "Preset 4", tags: ["tag3"], number: 4 },
		{ id: "5", name: "Preset 5", tags: ["tag1", "tag3"], number: 5 },
		{ id: "6", name: "Preset 6", tags: ["tag2"], number: 6 },
		{ id: "7", name: "Preset 7", tags: ["tag1", "tag2", "tag3"], number: 7 },
		{ id: "8", name: "Preset 8", tags: ["tag2"], number: 8 },
		{ id: "9", name: "Preset 9", tags: ["tag1"], number: 9 },
	].map((p) => ({
		...p,
		createdDate: new Date().toISOString(),
		modifiedDate: new Date().toISOString(),
		filename: `p${p.number}.syx`,
		sysexData: new Uint8Array(),
	})) as Preset[];

describe("PerformanceMode", () => {
	const mockHandleSelectPreset = vi.fn();
	let mockPresets: Preset[];

	beforeEach(() => {
		mockPresets = makeMockPresets();
		vi.clearAllMocks();
		vi.mocked(fetchPresetData).mockResolvedValue({
			presets: mockPresets,
		} as unknown as Awaited<ReturnType<typeof fetchPresetData>>);

		// Mock document.fullscreenElement if it doesn't exist
		if (!Object.getOwnPropertyDescriptor(document, "fullscreenElement")) {
			Object.defineProperty(document, "fullscreenElement", {
				get: () => null,
				configurable: true,
			});
		}
	});

	it("renders preset buttons", async () => {
		renderWithProviders(
			<PerformanceMode
				currentPreset={mockPresets[0]}
				handleSelectPreset={mockHandleSelectPreset}
			/>,
		);

		const presetButton = await screen.findByText("Preset 1");
		expect(presetButton).toBeTruthy();
	});

	it("calls handleSelectPreset when a preset button is clicked", async () => {
		renderWithProviders(
			<PerformanceMode
				currentPreset={mockPresets[0]}
				handleSelectPreset={mockHandleSelectPreset}
			/>,
		);

		const presetButton = await screen.findByText("Preset 2");
		fireEvent.click(presetButton);

		expect(mockHandleSelectPreset).toHaveBeenCalledWith(mockPresets[1]);
	});

	it("filters presets by tags", async () => {
		renderWithProviders(
			<PerformanceMode
				currentPreset={mockPresets[0]}
				handleSelectPreset={mockHandleSelectPreset}
			/>,
		);

		await screen.findByText("Preset 1");

		const tagFilter = screen.getByText(/tag1/i);
		fireEvent.click(tagFilter);
	});

	it("toggles fullscreen", async () => {
		const exitFullscreen = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(document, "fullscreenElement", "get").mockReturnValue(null);
		if (!document.exitFullscreen) {
			(document as any).exitFullscreen = vi.fn().mockResolvedValue(undefined);
		} else {
			vi.spyOn(document, "exitFullscreen").mockImplementation(
				exitFullscreen as () => Promise<void>,
			);
		}

		renderWithProviders(
			<PerformanceMode
				currentPreset={mockPresets[0]}
				handleSelectPreset={mockHandleSelectPreset}
			/>,
		);

		const fullscreenBtn = screen.getByText(/Toggle Fullscreen/i);
		expect(fullscreenBtn).toBeTruthy();
	});
});
