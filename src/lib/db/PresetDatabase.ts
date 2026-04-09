import type { Preset } from "@/lib/presets/presetManager";

export interface PresetDatabase {
	getPresets(): Promise<Preset[]>;
	addPreset(preset: Preset): Promise<Preset>;
	updatePreset(preset: Preset): Promise<void>;
	deletePreset(id: string): Promise<void>;
	syncPresets(localPresets: Preset[]): Promise<void>;
	isAvailable(): Promise<boolean>;
	import(json: string): Promise<void>;
	export(): Promise<string>;
}
