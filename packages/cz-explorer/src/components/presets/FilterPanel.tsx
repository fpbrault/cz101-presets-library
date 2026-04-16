// src/FilterPanel.tsx

import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { FaCheckCircle, FaRegDotCircle, FaTrash } from "react-icons/fa";
import Button from "@/components/ui/Button";
import { useSearchFilter } from "@/context/SearchFilterContext";
import { fetchPresetData } from "@/lib/presets/presetManager";

const FilterPanel: React.FC = () => {
	const { selectedTags, filterMode, setFilterMode, setSelectedTags } =
		useSearchFilter();

	const { data } = useQuery({
		queryKey: ["presets", "filter-panel-tags"],
		queryFn: async () => {
			const result = await fetchPresetData(
				0,
				Number.MAX_SAFE_INTEGER,
				[],
				"",
				[],
				"inclusive",
				false,
				false,
				0,
			);
			return result.presets;
		},
		refetchOnWindowFocus: false,
	});

	const presets = data ?? [];

	const handleToggleFilterMode = () => {
		if (filterMode === "inclusive") {
			setFilterMode("exclusive");
		} else {
			setFilterMode("inclusive");
		}
	};

	const handleTagClick = (tag: string) => {
		if (selectedTags.includes(tag)) {
			setSelectedTags(selectedTags.filter((t) => t !== tag));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	const handleClearFilters = () => {
		// biome-ignore lint/suspicious/useIterableCallbackReturn: side-effect forEach intentional
		selectedTags.forEach((tag) => handleTagClick(tag));
	};

	return (
		<div className="flex flex-col h-full gap-2 overflow-auto">
			<h3>Filters</h3>
			<Button onClick={handleClearFilters} variant="error">
				Clear Filters <FaTrash size={12} />
			</Button>
			<Button onClick={handleToggleFilterMode} variant="info">
				{filterMode === "exclusive" ? (
					<>
						Match Any
						<FaRegDotCircle size={16} />
					</>
				) : (
					<>
						Match All
						<FaCheckCircle size={16} />
					</>
				)}
			</Button>
			<div className="flex flex-wrap content-start grow gap-1 overflow-scroll ">
				{Object.entries(
					presets
						.flatMap((preset) => preset.tags.map((tag) => tag.toLowerCase()))
						.reduce(
							(acc, tag) => {
								if (acc[tag]) {
									acc[tag]++;
								} else {
									acc[tag] = 1;
								}
								return acc;
							},
							{} as Record<string, number>,
						),
				).map(([tag, count]) => (
					<Button
						key={tag}
						unstyled
						className={`badge badge-lg text-lg p-3 font-bold capitalize badge-neutral ${
							selectedTags.includes(tag) ? "badge-primary" : ""
						}`}
						onClick={() => handleTagClick(tag)}
						type="button"
					>
						{tag} ({count})
					</Button>
				))}
			</div>
		</div>
	);
};

export default FilterPanel;
