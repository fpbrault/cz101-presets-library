import type { SortingState } from "@tanstack/react-table";
import { isFactoryPresetIdentity } from "@/lib/presets/factoryPresets";
import type { Preset } from "@/lib/presets/presetManager";

export type FilterMode = "inclusive" | "exclusive";

export interface FilterPresetsOptions {
	sorting: SortingState | [];
	searchTerm: string;
	selectedTags: string[];
	filterMode: FilterMode;
	userPresetsOnly: boolean;
	favoritesOnly: boolean;
	duplicatesOnly?: boolean;
	randomOrder: boolean;
	seed: number;
	playlistPresetIds?: string[] | null;
}

function getPresetFingerprint(preset: Preset): string {
	return Array.from(preset.sysexData).join(",");
}

export function filterPresets(
	presets: Preset[],
	options: FilterPresetsOptions,
): { presets: Preset[]; totalCount: number } {
	const {
		sorting,
		searchTerm,
		selectedTags,
		filterMode,
		userPresetsOnly,
		favoritesOnly,
		duplicatesOnly,
		randomOrder,
		seed,
		playlistPresetIds,
	} = options;

	let filteredPresets = presets;

	if (playlistPresetIds !== null && playlistPresetIds !== undefined) {
		const idSet = new Set(playlistPresetIds);
		filteredPresets = filteredPresets.filter((preset) => idSet.has(preset.id));
	}

	if (userPresetsOnly) {
		filteredPresets = filteredPresets.filter(
			(preset) => !isFactoryPresetIdentity(preset),
		);
	}

	if (favoritesOnly) {
		filteredPresets = filteredPresets.filter((preset) => preset.favorite);
	}

	if (searchTerm) {
		const normalizedSearchTerm = searchTerm.toLowerCase();
		filteredPresets = filteredPresets.filter((preset) =>
			preset.name.toLowerCase().includes(normalizedSearchTerm),
		);
	}

	if (selectedTags.length > 0) {
		filteredPresets = filteredPresets.filter((preset) => {
			if (filterMode === "inclusive") {
				return selectedTags.every((tag) => preset.tags.includes(tag));
			}

			return selectedTags.some((tag) => preset.tags.includes(tag));
		});
	}

	if (duplicatesOnly) {
		const fingerprintCounts = filteredPresets.reduce(
			(acc, preset) => {
				const key = getPresetFingerprint(preset);
				acc[key] = (acc[key] ?? 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		filteredPresets = filteredPresets.filter((preset) => {
			const key = getPresetFingerprint(preset);
			return (fingerprintCounts[key] ?? 0) > 1;
		});
	}

	let sortedPresets = [...filteredPresets].sort((a, b) => {
		if (sorting.length === 0) {
			if (playlistPresetIds && !randomOrder) {
				const orderMap = new Map(playlistPresetIds.map((id, i) => [id, i]));
				return (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0);
			}
			return 0;
		}
		const { id, desc } = sorting[0];
		const order = desc ? -1 : 1;

		if (id === "favorite") {
			const aValue = a.favorite ? 1 : 0;
			const bValue = b.favorite ? 1 : 0;
			if (aValue < bValue) return -1 * order;
			if (aValue > bValue) return 1 * order;
			return 0;
		}

		const aVal = a[id as keyof Preset] ?? "";
		const bVal = b[id as keyof Preset] ?? "";
		if (aVal < (bVal as typeof aVal)) return -1 * order;
		if (aVal > (bVal as typeof aVal)) return 1 * order;
		return 0;
	});

	if (randomOrder) {
		sortedPresets = shuffleArray([...sortedPresets], seed);
	}

	return {
		presets: sortedPresets,
		totalCount: filteredPresets.length,
	};
}

const shuffleArray = (array: Preset[], seed: number) => {
	let m = array.length;
	while (m) {
		const i = Math.floor(random(seed++) * m--);
		const t = array[m];
		array[m] = array[i];
		array[i] = t;
	}
	return array;
};

const random = (seed: number) => {
	const x = Math.sin(seed++) * 10000;
	return x - Math.floor(x);
};
