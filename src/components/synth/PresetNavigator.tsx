import { useMemo, useState } from "react";
import type { Preset } from "@/lib/presets/presetManager";

export type PresetEntry = {
	id: string;
	label: string;
	type: "local" | "library";
	preset?: Preset;
};

type PresetNavigatorProps = {
	presetList: string[];
	libraryPresets: Preset[];
	activePresetName: string;
	onLoadLocal: (name: string) => void;
	onLoadLibrary: (preset: Preset) => void;
	onStepPreset: (direction: -1 | 1) => void;
};

export default function PresetNavigator({
	presetList,
	libraryPresets,
	activePresetName,
	onLoadLocal,
	onLoadLibrary,
	onStepPreset,
}: PresetNavigatorProps) {
	const [panelOpen, setPanelOpen] = useState(false);

	const allEntries = useMemo<PresetEntry[]>(
		() => [
			...presetList.map((name) => ({
				id: `local:${name}`,
				label: name,
				type: "local" as const,
			})),
			...libraryPresets.map((preset) => ({
				id: `library:${preset.id}`,
				label: preset.name,
				type: "library" as const,
				preset,
			})),
		],
		[presetList, libraryPresets],
	);

	const handleLoad = (entry: PresetEntry) => {
		if (entry.type === "local") {
			onLoadLocal(entry.label);
		} else if (entry.preset) {
			onLoadLibrary(entry.preset);
		}
		setPanelOpen(false);
	};

	return (
		<div className="relative w-full max-w-3xl">
			<div className="flex items-stretch overflow-hidden rounded-xl border border-cz-border bg-cz-inset">
				<button
					type="button"
					className="flex w-12 items-center justify-center border-r border-cz-border text-cz-cream transition hover:bg-cz-surface disabled:text-cz-cream-dim/50"
					onClick={() => onStepPreset(-1)}
					disabled={allEntries.length === 0}
					aria-label="Previous preset"
				>
					&#8249;
				</button>
				<button
					type="button"
					className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-2 text-center transition hover:bg-cz-surface"
					onClick={() => setPanelOpen((open) => !open)}
				>
					<span className="text-[10px] font-mono uppercase tracking-[0.32em] text-cz-green">
						Preset
					</span>
					<span className="truncate text-lg font-mono font-bold text-cz-cream">
						{activePresetName}
					</span>
				</button>
				<button
					type="button"
					className="flex w-12 items-center justify-center border-l border-cz-border text-cz-cream transition hover:bg-cz-surface disabled:text-cz-cream-dim/50"
					onClick={() => onStepPreset(1)}
					disabled={allEntries.length === 0}
					aria-label="Next preset"
				>
					&#8250;
				</button>
			</div>

			{panelOpen && (
				<div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full overflow-hidden rounded-xl border border-cz-border bg-cz-panel shadow-2xl lg:w-[28rem]">
					<div className="border-b border-cz-border bg-cz-surface px-4 py-2 text-[10px] font-mono uppercase tracking-[0.28em] text-cz-cream-dim">
						Preset List
					</div>
					<div className="max-h-72 overflow-y-auto p-2">
						{allEntries.length === 0 ? (
							<div className="px-3 py-4 text-sm text-cz-cream-dim">
								No presets available.
							</div>
						) : (
							allEntries.map((entry) => (
								<button
									key={entry.id}
									type="button"
									className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
										entry.label === activePresetName
											? "bg-cz-green text-white"
											: "text-cz-cream hover:bg-cz-surface"
									}`}
									onClick={() => handleLoad(entry)}
								>
									<span className="truncate">{entry.label}</span>
									<span
										className={`ml-3 shrink-0 text-[10px] font-mono uppercase tracking-[0.22em] ${
											entry.label === activePresetName
												? "text-white/75"
												: "text-cz-cream-dim"
										}`}
									>
										{entry.type}
									</span>
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
