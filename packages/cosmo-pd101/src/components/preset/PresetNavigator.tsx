import type { PresetEntry } from "@/features/synth/types/presetEntry";

type PresetNavigatorProps = {
	allEntries: PresetEntry[];
	activePresetName: string;
	onStepPreset: (direction: -1 | 1) => void;
	isLibraryModeOpen?: boolean;
	onLibraryModeChange?: (open: boolean) => void;
};

export default function PresetNavigator({
	allEntries,
	activePresetName,
	onStepPreset,
	isLibraryModeOpen = false,
	onLibraryModeChange,
}: PresetNavigatorProps) {
	const toggleLibrary = () => onLibraryModeChange?.(!isLibraryModeOpen);

	return (
		<div className="relative w-full max-w-3xl">
			<div className="flex items-center gap-1">
				<button
					type="button"
					className="cz-btn-arrow"
					onClick={() => onStepPreset(-1)}
					disabled={allEntries.length === 0}
					aria-label="Previous preset"
				>
					<svg
						viewBox="0 -960 960 960"
						className="w-10 h-10 fill-cz-cream"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path d="M640-197 200-477l440-280v560Zm-60-280Zm0 171v-342L311-477l269 171Z" />
					</svg>
				</button>

				<div className="flex flex-1 items-stretch overflow-hidden rounded-xl border border-cz-border bg-cz-inset">
					<button
						type="button"
						className={`flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-2 text-center transition ${
							isLibraryModeOpen
								? "bg-cz-surface text-white"
								: "hover:bg-cz-surface"
						}`}
						onClick={toggleLibrary}
						aria-expanded={isLibraryModeOpen}
						aria-label={`Preset ${activePresetName}. Open library`}
					>
						<span className="text-3xs font-mono uppercase tracking-[0.32em] text-cz-gold">
							Preset
						</span>
						<span className="truncate text-lg font-mono font-bold text-cz-cream">
							{activePresetName}
						</span>
					</button>
				</div>

				<button
					type="button"
					className="cz-btn-arrow"
					onClick={() => onStepPreset(1)}
					disabled={allEntries.length === 0}
					aria-label="Next preset"
				>
					<svg
						viewBox="0 -960 960 960"
						className="w-10 h-10 fill-cz-cream rotate-180"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path d="M640-197 200-477l440-280v560Zm-60-280Zm0 171v-342L311-477l269 171Z" />
					</svg>
				</button>
			</div>
		</div>
	);
}