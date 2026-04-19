import { useCallback, useEffect, useMemo, useState } from "react";
import type { PresetEntry } from "@/components/synth/PresetNavigator";
import type { Preset } from "@/lib/presets/presetManager";
import {
	DEFAULT_PRESET,
	deletePreset,
	exportPreset,
	importPreset,
	listPresets,
	loadCurrentState,
	loadPreset,
	renamePreset,
	type SynthPresetData,
	saveCurrentState,
	savePreset,
} from "@/lib/synth/presetStorage";

type UseSynthPresetManagerOptions = {
	builtinPresets: Record<string, SynthPresetData>;
	gatherState: () => SynthPresetData;
	applyPreset: (data: SynthPresetData) => void;
	libraryPresets?: Preset[];
	onLoadLibraryPreset?: (preset: Preset) => void;
	shouldLoadCurrentState?: () => boolean;
};

type UseSynthPresetManagerResult = {
	allPresetEntries: PresetEntry[];
	activePresetName: string;
	handleLoadLocal: (name: string) => void;
	handleLoadBuiltin: (name: string) => void;
	handleLoadLibrary: (preset: Preset) => void;
	handleStepPreset: (direction: -1 | 1) => void;
	handleSavePreset: (name: string) => void;
	handleDeletePreset: (name: string) => void;
	handleRenamePreset: (oldName: string, newName: string) => void;
	handleInitPreset: () => void;
	handleExportPreset: (name: string) => void;
	handleImportPreset: (json: string, filename: string) => void;
	handleExportCurrentState: (name: string) => void;
};

export function useSynthPresetManager({
	builtinPresets,
	gatherState,
	applyPreset,
	libraryPresets = [],
	onLoadLibraryPreset,
	shouldLoadCurrentState,
}: UseSynthPresetManagerOptions): UseSynthPresetManagerResult {
	const [presetList, setPresetList] = useState<string[]>([]);
	const [activePresetName, setActivePresetName] = useState("Current State");

	const handleLoadLocal = useCallback(
		(name: string) => {
			const data = loadPreset(name);
			if (!data) return;
			applyPreset(data);
			setActivePresetName(name);
		},
		[applyPreset],
	);

	const handleLoadBuiltin = useCallback(
		(name: string) => {
			const data = builtinPresets[name];
			if (!data) return;
			applyPreset(data);
			setActivePresetName(name);
		},
		[applyPreset, builtinPresets],
	);

	const handleLoadLibrary = useCallback(
		(preset: Preset) => {
			if (!onLoadLibraryPreset) return;
			onLoadLibraryPreset(preset);
			setActivePresetName(preset.name);
		},
		[onLoadLibraryPreset],
	);

	const allPresetEntries = useMemo(
		(): PresetEntry[] => [
			...Object.keys(builtinPresets).map((name) => ({
				id: `builtin:${name}`,
				label: name,
				type: "builtin" as const,
			})),
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
		[builtinPresets, presetList, libraryPresets],
	);

	const activePresetIndex = useMemo(
		() =>
			allPresetEntries.findIndex((entry) => entry.label === activePresetName),
		[allPresetEntries, activePresetName],
	);

	const handleStepPreset = useCallback(
		(direction: -1 | 1) => {
			if (allPresetEntries.length === 0) return;
			const base = activePresetIndex >= 0 ? activePresetIndex : 0;
			const next =
				(base + direction + allPresetEntries.length) % allPresetEntries.length;
			const entry = allPresetEntries[next];
			if (!entry) return;
			if (entry.type === "local") {
				handleLoadLocal(entry.label);
				return;
			}
			if (entry.type === "builtin") {
				handleLoadBuiltin(entry.label);
				return;
			}
			if (entry.type === "library" && "preset" in entry && entry.preset) {
				handleLoadLibrary(entry.preset);
			}
		},
		[
			allPresetEntries,
			activePresetIndex,
			handleLoadLocal,
			handleLoadBuiltin,
			handleLoadLibrary,
		],
	);

	const handleSavePreset = useCallback(
		(name: string) => {
			savePreset(name, gatherState());
			setPresetList(listPresets());
			setActivePresetName(name);
		},
		[gatherState],
	);

	const handleDeletePreset = useCallback((name: string) => {
		deletePreset(name);
		setPresetList(listPresets());
		setActivePresetName((prev) => (prev === name ? "Current State" : prev));
	}, []);

	const handleRenamePreset = useCallback((oldName: string, newName: string) => {
		const trimmed = newName.trim();
		if (!trimmed || trimmed === oldName) return;
		renamePreset(oldName, trimmed);
		setPresetList(listPresets());
		setActivePresetName((prev) => (prev === oldName ? trimmed : prev));
	}, []);

	const handleInitPreset = useCallback(() => {
		applyPreset(DEFAULT_PRESET);
		setActivePresetName("Current State");
	}, [applyPreset]);

	const handleExportPreset = useCallback((name: string) => {
		const json = exportPreset(name);
		if (!json) return;
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${name}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	const handleImportPreset = useCallback(
		(json: string, filename: string) => {
			const data = importPreset(json);
			if (!data) return;
			const name = filename.trim() || "imported";
			const existing = listPresets();
			let candidate = name;
			let n = 2;
			while (existing.includes(candidate)) {
				candidate = `${name} ${n++}`;
			}
			savePreset(candidate, data);
			setPresetList(listPresets());
			applyPreset(data);
			setActivePresetName(candidate);
		},
		[applyPreset],
	);

	const handleExportCurrentState = useCallback(
		(name: string) => {
			const state = gatherState();
			const json = JSON.stringify({ _name: name, ...state }, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${name}.json`;
			a.click();
			URL.revokeObjectURL(url);
		},
		[gatherState],
	);

	useEffect(() => {
		setPresetList(listPresets());
		const shouldLoad = shouldLoadCurrentState ? shouldLoadCurrentState() : true;
		if (!shouldLoad) return;
		const saved = loadCurrentState();
		if (saved) applyPreset(saved);
	}, [applyPreset, shouldLoadCurrentState]);

	useEffect(() => {
		const timer = setTimeout(() => {
			saveCurrentState(gatherState());
		}, 500);
		return () => clearTimeout(timer);
	}, [gatherState]);

	return {
		allPresetEntries,
		activePresetName,
		handleLoadLocal,
		handleLoadBuiltin,
		handleLoadLibrary,
		handleStepPreset,
		handleSavePreset,
		handleDeletePreset,
		handleRenamePreset,
		handleInitPreset,
		handleExportPreset,
		handleImportPreset,
		handleExportCurrentState,
	};
}
