import type { Preset } from "@/lib/presets/presetManager";
import PresetNavigator, { type PresetEntry } from "./PresetNavigator";

type SynthHeaderProps = {
	allEntries: PresetEntry[];
	activePresetName: string;
	onLoadLocal: (name: string) => void;
	onLoadLibrary: (preset: Preset) => void;
	onLoadBuiltin: (name: string) => void;
	onStepPreset: (direction: -1 | 1) => void;
	onSavePreset: (name: string) => void;
	onDeletePreset: (name: string) => void;
	onRenamePreset: (oldName: string, newName: string) => void;
	onExportPreset: (name: string) => void;
	onExportCurrentState: (name: string) => void;
	onImportPreset: (json: string, filename: string) => void;
	onInitPreset: () => void;
};

export default function SynthHeader({
	allEntries,
	activePresetName,
	onLoadLocal,
	onLoadLibrary,
	onLoadBuiltin,
	onStepPreset,
	onSavePreset,
	onDeletePreset,
	onRenamePreset,
	onExportPreset,
	onExportCurrentState,
	onImportPreset,
	onInitPreset,
}: SynthHeaderProps) {
	return (
		<header className="shrink-0 flex flex-col gap-3 border-b-4 border-cz-border bg-cz-body px-8 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:flex-row lg:items-center lg:justify-between">
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
				onLoadLocal={onLoadLocal}
				onLoadLibrary={onLoadLibrary}
				onLoadBuiltin={onLoadBuiltin}
				onStepPreset={onStepPreset}
				onSavePreset={onSavePreset}
				onDeletePreset={onDeletePreset}
				onRenamePreset={onRenamePreset}
				onExportPreset={onExportPreset}
				onExportCurrentState={onExportCurrentState}
				onImportPreset={onImportPreset}
				onInitPreset={onInitPreset}
			/>

			<div className="hidden sm:flex flex-col justify-center border-l border-cz-border pl-4">
				<span className="text-4xs font-mono uppercase tracking-[0.3em] text-cz-light-blue">
					Phase Distortion
				</span>
				<span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-cz-cream">
					Synthesizer Lab
				</span>
			</div>
		</header>
	);
}
