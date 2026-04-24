import type { LibraryPreset } from "./libraryPreset";

export type PresetEntry = {
	id: string;
	label: string;
	type: "local" | "library" | "builtin";
	preset?: LibraryPreset;
};
