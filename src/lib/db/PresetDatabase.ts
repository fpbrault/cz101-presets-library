import type { Preset } from "@/lib/presets/types";

export type { Preset };

export interface PresetDatabase {
	getPresets(): Promise<Preset[]>;
	getPresetById(id: string): Promise<Preset | null>;
	addPreset(preset: Preset): Promise<Preset>;
	updatePreset(preset: Preset): Promise<void>;
	deletePreset(id: string): Promise<void>;
	syncPresets(localPresets: Preset[]): Promise<void>;
	isAvailable(): Promise<boolean>;
	import(json: string): Promise<void>;
	export(): Promise<string>;
}
