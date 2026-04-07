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

interface RawFactoryPreset {
	id?: string | number;
	name?: string;
	createdDate?: string;
	modifiedDate?: string;
	filename?: string;
	sysexData?: number[];
	tags?: unknown[];
	description?: string;
	favorite?: boolean;
	rating?: number;
}

export function getFactoryPresetJson(): RawFactoryPreset[] {
	return factoryPresetsData as RawFactoryPreset[];
}
