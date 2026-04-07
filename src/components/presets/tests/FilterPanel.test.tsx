import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FilterPanel from "@/components/presets/FilterPanel";
import { useSearchFilter } from "@/context/SearchFilterContext";
import type { Preset } from "@/lib/presets/presetManager";
import { fetchPresetData } from "@/lib/presets/presetManager";
import { renderWithProviders } from "@/test/renderWithProviders";

// Mock the search filter context
vi.mock("@/context/SearchFilterContext", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/context/SearchFilterContext")>();
	return {
		...actual,
		useSearchFilter: vi.fn(),
	};
});

// Mock the preset manager
vi.mock("@/lib/presets/presetManager", () => ({
	fetchPresetData: vi.fn(),
}));

describe("FilterPanel", () => {
	const mockSetFilterMode = vi.fn();
	const mockSetSelectedTags = vi.fn();
	const mockSelectedTags: string[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useSearchFilter).mockReturnValue({
			selectedTags: mockSelectedTags,
			filterMode: "inclusive",
			setFilterMode: mockSetFilterMode,
			setSelectedTags: mockSetSelectedTags,
		} as unknown as ReturnType<typeof useSearchFilter>);
	});

	it("renders the title", async () => {
		vi.mocked(fetchPresetData).mockResolvedValue({
			presets: [],
			totalCount: 0,
		});
		renderWithProviders(<FilterPanel />);
		expect(screen.getByText("Filters")).toBeTruthy();
	});

	it("toggles filter mode when the button is clicked", async () => {
		vi.mocked(fetchPresetData).mockResolvedValue({
			presets: [],
			totalCount: 0,
		});
		renderWithProviders(<FilterPanel />);

		const modeButton = screen.getByRole("button", { name: /Match All/i });
		fireEvent.click(modeButton);

		expect(mockSetFilterMode).toHaveBeenCalledWith("exclusive");
	});

	it("clears filters when the clear button is clicked", async () => {
		const presetsWithTags = [
			{ id: "1", name: "Preset 1", tags: ["tag1", "tag2"] },
		];
		vi.mocked(fetchPresetData).mockResolvedValue({
			presets: presetsWithTags as unknown as Preset[],
			totalCount: presetsWithTags.length,
		});

		// Set up mock with existing selected tags
		vi.mocked(useSearchFilter).mockReturnValue({
			selectedTags: ["tag1"],
			filterMode: "inclusive",
			setFilterMode: mockSetFilterMode,
			setSelectedTags: mockSetSelectedTags,
		} as unknown as ReturnType<typeof useSearchFilter>);

		renderWithProviders(<FilterPanel />);

		const clearButton = screen.getByRole("button", { name: /Clear Filters/i });
		fireEvent.click(clearButton);

		expect(mockSetSelectedTags).toHaveBeenCalledWith([]);
	});

	it("toggles a tag when clicked", async () => {
		const presetsWithTags = [{ id: "1", name: "Preset 1", tags: ["tag1"] }];
		vi.mocked(fetchPresetData).mockResolvedValue({
			presets: presetsWithTags as unknown as Preset[],
			totalCount: presetsWithTags.length,
		});

		renderWithProviders(<FilterPanel />);

		// Wait for async query to resolve and render tags
		const tagBadge = await screen.findByText(/tag1 \(1\)/i);
		fireEvent.click(tagBadge);

		expect(mockSetSelectedTags).toHaveBeenCalledWith(["tag1"]);
	});

	it("deselects a tag when it is already selected", async () => {
		const presetsWithTags = [{ id: "1", name: "Preset 1", tags: ["tag1"] }];
		vi.mocked(fetchPresetData).mockResolvedValue({
			presets: presetsWithTags as unknown as Preset[],
			totalCount: presetsWithTags.length,
		});
		vi.mocked(useSearchFilter).mockReturnValue({
			selectedTags: ["tag1"],
			filterMode: "inclusive",
			setFilterMode: mockSetFilterMode,
			setSelectedTags: mockSetSelectedTags,
		} as unknown as ReturnType<typeof useSearchFilter>);

		renderWithProviders(<FilterPanel />);

		const tagBadge = await screen.findByText(/tag1 \(1\)/i);
		fireEvent.click(tagBadge);

		expect(mockSetSelectedTags).toHaveBeenCalledWith([]);
	});
});
