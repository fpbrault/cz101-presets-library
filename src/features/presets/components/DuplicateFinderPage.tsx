import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FaPlay } from "react-icons/fa";
import InlineNotice from "@/components/feedback/InlineNotice";
import Button from "@/components/ui/Button";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import { useToast } from "@/context/ToastContext";
import { useSidebarContent } from "@/hooks/useSidebarContent";
import {
	deletePreset,
	fetchPresetData,
	normalizeSysexForLibrary,
	type Preset,
	restorePresetToBuffer,
} from "@/lib/presets/presetManager";

interface DuplicateGroup {
	fingerprint: string;
	presets: Preset[];
}

function getSuggestedKeepIndex(presets: Preset[]): number {
	const favoriteIndex = presets.findIndex((preset) => Boolean(preset.favorite));
	return favoriteIndex >= 0 ? favoriteIndex : 0;
}

function getPresetFingerprint(preset: Preset): string {
	const normalized = normalizeSysexForLibrary(preset.sysexData);
	const framed =
		normalized[0] === 0xf0 && normalized[normalized.length - 1] === 0xf7
			? normalized
			: new Uint8Array([0xf0, ...normalized, 0xf7]);

	for (let offset = 5; offset <= 16; offset++) {
		if (framed.length >= offset + 256 + 1) {
			const payload = framed.slice(offset, offset + 256);
			if (payload.every((byte) => byte >= 0x00 && byte <= 0x0f)) {
				return `payload:${Array.from(payload).join(",")}`;
			}
		}
	}

	return `canonical:${Array.from(framed).join(",")}`;
}

export default function DuplicateFinderPage() {
	const queryClient = useQueryClient();
	const { selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();
	const { notifyInfo, notifyError } = useToast();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isDeleting, setIsDeleting] = useState(false);
	const [previewingPresetId, setPreviewingPresetId] = useState<string | null>(
		null,
	);

	const { data: duplicatePresets = [] } = useQuery({
		queryKey: ["presets", "duplicate-review"],
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
				true,
				false,
			);
			return result.presets;
		},
		refetchOnWindowFocus: false,
	});

	const groups = useMemo<DuplicateGroup[]>(() => {
		const grouped = duplicatePresets.reduce(
			(acc, preset) => {
				const key = getPresetFingerprint(preset);
				if (!acc[key]) {
					acc[key] = [];
				}
				acc[key].push(preset);
				return acc;
			},
			{} as Record<string, Preset[]>,
		);

		return Object.entries(grouped).map(([fingerprint, groupedPresets]) => ({
			fingerprint,
			presets: [...groupedPresets].sort((a, b) => {
				const favoriteDelta =
					Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
				if (favoriteDelta !== 0) {
					return favoriteDelta;
				}
				return a.name.localeCompare(b.name);
			}),
		}));
	}, [duplicatePresets]);

	const totalDuplicates = useMemo(
		() => groups.reduce((acc, group) => acc + group.presets.length, 0),
		[groups],
	);

	const togglePreset = (id: string) => {
		if (selectedIds.includes(id)) {
			setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
			return;
		}
		setSelectedIds([...selectedIds, id]);
	};

	const handleSelectAllExceptFirst = () => {
		const nextIds = groups.flatMap((group) => {
			const keepIndex = getSuggestedKeepIndex(group.presets);
			return group.presets
				.filter((_, index) => index !== keepIndex)
				.map((preset) => preset.id);
		});
		setSelectedIds(nextIds);
	};

	const handlePreviewPreset = async (preset: Preset) => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before previewing presets.");
			return;
		}

		setPreviewingPresetId(preset.id);
		try {
			await restorePresetToBuffer(
				preset,
				selectedMidiPort,
				selectedMidiChannel,
			);
		} catch (error) {
			notifyError((error as Error).message);
		} finally {
			setPreviewingPresetId(null);
		}
	};

	useSidebarContent(
		<div className="p-2 rounded-lg bg-base-300 text-xs">
			<div>Duplicate groups: {groups.length}</div>
			<div>Total duplicate presets: {totalDuplicates}</div>
		</div>,
	);

	return (
		<div className="flex grow min-w-0 h-full overflow-hidden bg-base-300">
			<section className="flex grow min-w-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
				<div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-hidden rounded-xl border border-base-content/15 bg-base-100 p-4 lg:p-6">
					<h1 className="text-2xl font-bold">Duplicate Finder</h1>
					<p className="mt-1 text-sm opacity-70">
						{groups.length} duplicate groups, {totalDuplicates} total duplicate
						presets.
					</p>

					{groups.length === 0 ? (
						<div className="mt-6">
							<InlineNotice
								message="No duplicates found."
								tone="success"
								size="md"
							/>
						</div>
					) : (
						<div className="mt-6 space-y-3 min-w-0 overflow-x-hidden">
							{groups.map((group, groupIndex) => (
								<div
									key={group.fingerprint}
									className="p-3 border rounded-lg border-base-content/15 min-w-0 overflow-x-hidden"
								>
									<div className="mb-2 text-sm font-semibold">
										Group {groupIndex + 1} ({group.presets.length} presets)
									</div>
									<div className="space-y-2 min-w-0 overflow-x-hidden">
										{(() => {
											const keepIndex = getSuggestedKeepIndex(group.presets);
											return group.presets.map((preset, presetIndex) => {
												const checked = selectedIds.includes(preset.id);
												const isPreviewing = previewingPresetId === preset.id;
												return (
													<div
														key={preset.id}
														className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-2 rounded-md bg-base-200/60 min-w-0 overflow-hidden"
													>
														<label className="flex items-center gap-2 min-w-0 overflow-hidden cursor-pointer">
															<input
																type="checkbox"
																className="checkbox checkbox-sm"
																checked={checked}
																onChange={() => togglePreset(preset.id)}
															/>
															<span className="font-medium truncate min-w-0">
																{preset.name}
															</span>
															{preset.favorite && (
																<span className="badge badge-warning badge-sm">
																	Favorite
																</span>
															)}
															<span className="text-xs opacity-70 truncate min-w-0">
																by {preset.author || "Unknown"}
															</span>
														</label>
														<div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 shrink-0">
															<Button
																variant="info"
																size="sm"
																className="btn btn-xs"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	void handlePreviewPreset(preset);
																}}
																disabled={isPreviewing}
																title="Preview in synth buffer"
															>
																<FaPlay size={10} />
																{isPreviewing ? "Sending" : "Preview"}
															</Button>
															{presetIndex === keepIndex && (
																<span className="badge badge-success badge-sm">
																	Suggested keep
																</span>
															)}
														</div>
													</div>
												);
											});
										})()}
									</div>
								</div>
							))}
						</div>
					)}

					<div className="flex flex-wrap justify-end gap-2 mt-6">
						<Button
							variant="neutral"
							onClick={() => setSelectedIds([])}
							disabled={isDeleting || selectedIds.length === 0}
						>
							Clear Selection
						</Button>
						<Button
							variant="accent"
							onClick={handleSelectAllExceptFirst}
							disabled={isDeleting || groups.length === 0}
						>
							Select All Except Suggested Keep
						</Button>
						<Button
							variant="error"
							disabled={isDeleting || selectedIds.length === 0}
							onClick={async () => {
								setIsDeleting(true);
								try {
									await Promise.all(selectedIds.map((id) => deletePreset(id)));
									await queryClient.invalidateQueries({
										queryKey: ["presets"],
									});
									setSelectedIds([]);
								} finally {
									setIsDeleting(false);
								}
							}}
						>
							Delete Selected ({selectedIds.length})
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
