import factoryPresetsData from "@/assets/factory_presets.json";

export const FACTORY_PRESET_AUTHOR = "Temple of CZ";

export type FactoryPresetIdentity = {
	id: string;
	isFactoryPreset?: boolean;
};

const FACTORY_PRESET_IDS = new Set(
	(factoryPresetsData as Array<{ id?: string }>).map((preset) =>
		String(preset.id ?? ""),
	),
);

export function isFactoryPresetIdentity(
	preset: FactoryPresetIdentity,
): boolean {
	if (preset.isFactoryPreset === true) {
		return true;
	}

	return FACTORY_PRESET_IDS.has(String(preset.id));
}

export type FactoryPresetJson = {
	id?: string;
	name?: string;
	createdDate?: string;
	modifiedDate?: string;
	filename?: string;
	sysexData?: number[];
	tags?: unknown[];
	author?: string;
	description?: string;
	favorite?: boolean;
	rating?: 1 | 2 | 3 | 4 | 5;
};

export function getFactoryPresetJson(): FactoryPresetJson[] {
	return factoryPresetsData as FactoryPresetJson[];
}
