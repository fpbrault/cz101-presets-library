import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FilterPanel from "@/components/presets/FilterPanel";
import { useSearchFilter } from "@/context/SearchFilterContext";
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
		(useSearchFilter as any).mockReturnValue({
			selectedTags: mockSelectedTags,
			filterMode: "inclusive",
			setFilterMode: mockSetFilterMode,
			setSelectedTags: mockSetSelectedTags,
		});
	});

	it("renders the title", async () => {
		(fetchPresetData as any).mockResolvedValue({ presets: [] });
		renderWithProviders(<FilterPanel />);
		expect(screen.getByText("Filters")).toBeTruthy();
	});

	it("toggles filter mode when the button is clicked", async () => {
		(fetchPresetData as any).mockResolvedValue({ presets: [] });
		renderWithProviders(<FilterPanel />);

		const modeButton = screen.getByRole("button", { name: /Match All/i });
		fireEvent.click(modeButton);

		expect(mockSetFilterMode).toHaveBeenCalledWith("exclusive");
	});

	it("clears filters when the clear button is clicked", async () => {
		const presetsWithTags = [
			{ id: "1", name: "Preset 1", tags: ["tag1", "tag2"] },
		];
		(fetchPresetData as any).mockResolvedValue({ presets: presetsWithTags });

		// Set up mock with existing selected tags
		(useSearchFilter as any).mockReturnValue({
			selectedTags: ["tag1"],
			filterMode: "inclusive",
			setFilterMode: mockSetFilterMode,
			setSelectedTags: mockSetSelectedTags,
		});

		renderWithProviders(<FilterPanel />);

		const clearButton = screen.getByRole("button", { name: /Clear Filters/i });
		fireEvent.click(clearButton);

		expect(mockSetSelectedTags).toHaveBeenCalledWith([]);
	});

	it("toggles a tag when clicked", async () => {
		const presetsWithTags = [{ id: "1", name: "Preset 1", tags: ["tag1"] }];
		(fetchPresetData as any).mockResolvedValue({ presets: presetsWithTags });

		renderWithProviders(<FilterPanel />);

		// Wait for async query to resolve and render tags
		const tagBadge = await screen.findByText(/tag1 \(1\)/i);
		fireEvent.click(tagBadge);

		expect(mockSetSelectedTags).toHaveBeenCalledWith(["tag1"]);
	});

	it("deselects a tag when it is already selected", async () => {
		const presetsWithTags = [{ id: "1", name: "Preset 1", tags: ["tag1"] }];
		(fetchPresetData as any).mockResolvedValue({ presets: presetsWithTags });
		(useSearchFilter as any).mockReturnValue({
			selectedTags: ["tag1"],
			filterMode: "inclusive",
			setFilterMode: mockSetFilterMode,
			setSelectedTags: mockSetSelectedTags,
		});

		renderWithProviders(<FilterPanel />);

		const tagBadge = await screen.findByText(/tag1 \(1\)/i);
		fireEvent.click(tagBadge);

		expect(mockSetSelectedTags).toHaveBeenCalledWith([]);
	});
});
