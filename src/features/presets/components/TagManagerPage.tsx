import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import InlineNotice from "@/components/feedback/InlineNotice";
import SelectInput from "@/components/forms/SelectInput";
import TextInput from "@/components/forms/TextInput";
import Button from "@/components/ui/Button";
import { useSidebarContent } from "@/hooks/useSidebarContent";
import {
	deleteTagGlobally,
	fetchPresetData,
	renameTagGlobally,
} from "@/lib/presets/presetManager";

export default function TagManagerPage() {
	const queryClient = useQueryClient();
	const [sourceTag, setSourceTag] = useState("");
	const [targetTag, setTargetTag] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data: allPresets = [] } = useQuery({
		queryKey: ["presets", "tag-manager"],
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
				false,
				false,
			);
			return result.presets;
		},
		refetchOnWindowFocus: false,
	});

	const availableTags = useMemo<[string, number][]>(() => {
		const tagCounts: Record<string, number> = {};
		allPresets.forEach((preset) => {
			preset.tags.forEach((tag) => {
				const normalizedTag = tag.toLowerCase();
				tagCounts[normalizedTag] = (tagCounts[normalizedTag] ?? 0) + 1;
			});
		});
		return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
	}, [allPresets]);

	const hasTags = availableTags.length > 0;

	const actionLabel = useMemo(() => {
		if (!sourceTag || !targetTag) {
			return "Rename/Merge";
		}
		return sourceTag === targetTag
			? "Rename/Merge"
			: "Rename/Merge into target";
	}, [sourceTag, targetTag]);

	useSidebarContent(
		<div className="p-2 rounded-lg bg-base-300 text-xs">
			<div>Tags: {availableTags.length}</div>
		</div>,
	);

	return (
		<div className="flex grow h-full overflow-hidden bg-base-300">
			<section className="flex grow items-start justify-center overflow-auto p-6">
				<div className="w-full max-w-3xl rounded-xl border border-base-content/15 bg-base-100 p-6">
					<h1 className="text-2xl font-bold">Tag Manager</h1>
					<p className="mt-1 text-sm opacity-70">
						Rename, merge, or delete tags across your preset library.
					</p>

					{!hasTags && (
						<div className="mt-6">
							<InlineNotice
								message="No tags available to manage."
								tone="neutral"
								size="md"
							/>
						</div>
					)}

					{hasTags && (
						<div className="mt-6 grid grid-cols-1 gap-4">
							<div className="form-control">
								<span className="label-text">Source tag</span>
								<SelectInput
									value={sourceTag}
									onChange={(e) => {
										setSourceTag(e.target.value);
										if (!targetTag) {
											setTargetTag(e.target.value);
										}
									}}
								>
									<option value="">Select tag</option>
									{availableTags.map(([tag, count]) => (
										<option key={tag} value={tag}>
											{tag} ({count})
										</option>
									))}
								</SelectInput>
							</div>

							<div className="form-control">
								<span className="label-text">Target tag (rename/merge)</span>
								<TextInput
									value={targetTag}
									placeholder="e.g. bass"
									onChange={(e) => setTargetTag(e.target.value.toLowerCase())}
								/>
							</div>

							<div className="flex flex-wrap justify-end gap-2 mt-2">
								<Button
									variant="error"
									disabled={!sourceTag || isSubmitting}
									onClick={async () => {
										setIsSubmitting(true);
										try {
											await deleteTagGlobally(sourceTag);
											await queryClient.invalidateQueries({
												queryKey: ["presets"],
											});
											setSourceTag("");
											setTargetTag("");
										} finally {
											setIsSubmitting(false);
										}
									}}
								>
									Delete Tag
								</Button>
								<Button
									variant="primary"
									disabled={!sourceTag || !targetTag.trim() || isSubmitting}
									onClick={async () => {
										setIsSubmitting(true);
										try {
											await renameTagGlobally(sourceTag, targetTag);
											await queryClient.invalidateQueries({
												queryKey: ["presets"],
											});
											setSourceTag("");
											setTargetTag("");
										} finally {
											setIsSubmitting(false);
										}
									}}
								>
									{actionLabel}
								</Button>
							</div>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
