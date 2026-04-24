import type { ReactNode } from "react";
import type { LibraryPreset } from "@/features/synth/types/libraryPreset";
import type { PresetEntry } from "@/features/synth/types/presetEntry";
import PresetNavigator from "./PresetNavigator";

export type SynthHeaderProps = {
	allEntries: PresetEntry[];
	activeEntryId: string | null;
	activePresetName: string;
	pendingPresetChange?: {
		activePresetName: string;
		activeLocalName: string | null;
		suggestedName: string;
	} | null;
	onLoadLocal: (name: string) => void;
	onLoadLibrary: (preset: LibraryPreset) => void;
	onLoadBuiltin: (name: string) => void;
	onStepPreset: (direction: -1 | 1) => void;
	onSavePreset: (name: string) => void;
	onDeletePreset: (name: string) => void;
	onRenamePreset: (oldName: string, newName: string) => void;
	onExportPreset: (name: string) => void;
	onExportCurrentState: (name: string) => void;
	onImportPreset: (json: string, filename: string) => void;
	onInitPreset: () => void;
	onSavePendingPresetChange?: (name?: string) => void;
	onDiscardPendingPresetChange?: () => void;
	onCancelPendingPresetChange?: () => void;
	isLibraryModeOpen?: boolean;
	onLibraryModeChange?: (open: boolean) => void;
	trailingContent?: ReactNode;
};

export default function SynthHeader({
	allEntries,
	activePresetName,
	onStepPreset,
	isLibraryModeOpen = false,
	onLibraryModeChange,
	trailingContent,
}: SynthHeaderProps) {
	return (
		<header className="shrink-0 flex flex-col gap-3 border-b-4 border-cz-border bg-cz-body px-8 py-2 shadow-inner lg:flex-row lg:items-center lg:justify-between">
			{/* Hardware nameplate logo */}
			<div className="flex items-center gap-4 shrink-0">
				<div className="flex flex-col items-start leading-none select-none">
					<div className="flex items-baseline gap-2">
						<span
							className="text-[2.1rem] font-black uppercase leading-none text-cz-cream"
							style={{ fontFamily: "'Michroma', sans-serif" }}
						>
							COSMO
						</span>
						<span className="text-[2.1rem] font-black uppercase leading-none font-['Arial_Narrow','Arial',sans-serif] tracking-[-0.02em] [-webkit-text-stroke:1.5px_var(--color-cz-gold)] text-transparent">
							PD-101
						</span>
					</div>
					<span className="mt-0.75 block h-0.75 w-full bg-cz-gold rounded-full" />
				</div>
			</div>

			<PresetNavigator
				allEntries={allEntries}
				activePresetName={activePresetName}
				onStepPreset={onStepPreset}
				isLibraryModeOpen={isLibraryModeOpen}
				onLibraryModeChange={onLibraryModeChange}
			/>

			<div className="hidden sm:flex flex-col justify-center border-l border-cz-border pl-4">
				<span className="text-4xs font-mono uppercase tracking-[0.3em] text-cz-light-blue">
					Phase Distortion
				</span>
				<span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-cz-cream">
					Synthesizer Lab
				</span>
			</div>

			{trailingContent}
		</header>
	);
}
