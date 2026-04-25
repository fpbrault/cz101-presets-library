import { useCallback, useEffect, useMemo, useState } from "react";
import type { LibraryPreset } from "@/features/synth/types/libraryPreset";
import type { PresetEntry } from "@/features/synth/types/presetEntry";
import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";
import {
	DEFAULT_PRESET,
	deletePreset,
	exportPreset,
	importPreset,
	listPresets,
	loadCurrentPresetSession,
	loadCurrentState,
	loadPreset,
	renamePreset,
	saveCurrentPresetSession,
	saveCurrentState,
	savePreset,
} from "@/lib/synth/presetStorage";

type UseSynthPresetManagerOptions = {
	builtinPresets: Record<string, SynthPresetV1>;
	gatherState: () => SynthPresetV1;
	applyPreset: (data: SynthPresetV1) => void;
	libraryPresets?: LibraryPreset[];
	onLoadLibraryPreset?: (preset: LibraryPreset) => void;
	shouldLoadCurrentState?: () => boolean;
	presetStateKey?: string;
};

type UseSynthPresetManagerResult = {
	allPresetEntries: PresetEntry[];
	activePresetId: string | null;
	activePresetName: string;
	pendingPresetChange: PendingPresetChange | null;
	handleLoadLocal: (name: string) => void;
	handleLoadBuiltin: (name: string) => void;
	handleLoadLibrary: (preset: LibraryPreset) => void;
	handleStepPreset: (direction: -1 | 1) => void;
	handleSavePreset: (name: string) => void;
	handleDeletePreset: (name: string) => void;
	handleRenamePreset: (oldName: string, newName: string) => void;
	handleInitPreset: () => void;
	handleExportPreset: (name: string) => void;
	handleImportPreset: (json: string, filename: string) => void;
	handleExportCurrentState: (name: string) => void;
	handleSavePendingPresetChange: (name?: string) => void;
	handleDiscardPendingPresetChange: () => void;
	handleCancelPendingPresetChange: () => void;
};

type PendingNavigation =
	| { type: "local"; entryId: string; name: string }
	| { type: "builtin"; entryId: string; name: string }
	| { type: "library"; entryId: string; preset: LibraryPreset };

type PendingPresetChange = {
	activePresetName: string;
	activeLocalName: string | null;
	suggestedName: string;
};

const getBuiltinPresetEntryId = (name: string) => `builtin:${name}`;
const getLocalPresetEntryId = (name: string) => `local:${name}`;
const getLibraryPresetEntryId = (presetId: string) => `library:${presetId}`;
const presetNameCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});

function sortPresetEntries(entries: PresetEntry[]): PresetEntry[] {
	return [...entries].sort((a, b) => {
		const labelCompare = presetNameCollator.compare(a.label, b.label);
		return labelCompare === 0
			? presetNameCollator.compare(a.id, b.id)
			: labelCompare;
	});
}

function getPresetFingerprint(preset: SynthPresetV1): string {
	return JSON.stringify(preset);
}

export function useSynthPresetManager({
	builtinPresets,
	gatherState,
	applyPreset,
	libraryPresets = [],
	onLoadLibraryPreset,
	shouldLoadCurrentState,
	presetStateKey,
}: UseSynthPresetManagerOptions): UseSynthPresetManagerResult {
	const [presetList, setPresetList] = useState<string[]>([]);
	const shouldHydratePersistedState = useMemo(
		() => (shouldLoadCurrentState ? shouldLoadCurrentState() : true),
		[shouldLoadCurrentState],
	);
	const initialPresetSession = useMemo(
		() => (shouldHydratePersistedState ? loadCurrentPresetSession() : null),
		[shouldHydratePersistedState],
	);
	const [activePresetId, setActivePresetId] = useState<string | null>(
		initialPresetSession?.activePresetId ?? null,
	);
	const [activePresetNameBase, setActivePresetNameBase] = useState(
		initialPresetSession?.activePresetNameBase ?? "Current State",
	);
	const [loadedPresetFingerprint, setLoadedPresetFingerprint] = useState<
		string | null
	>(initialPresetSession?.loadedPresetFingerprint ?? null);
	const [pendingNavigation, setPendingNavigation] =
		useState<PendingNavigation | null>(null);
	const currentPresetFingerprint =
		presetStateKey ?? getPresetFingerprint(gatherState());
	const hasUnsavedChanges =
		loadedPresetFingerprint !== null &&
		currentPresetFingerprint !== loadedPresetFingerprint;
	const activePresetName = hasUnsavedChanges
		? `${activePresetNameBase} *`
		: activePresetNameBase;
	const activeLocalName = activePresetId?.startsWith("local:")
		? activePresetNameBase
		: null;
	const pendingPresetChange = pendingNavigation
		? {
				activePresetName: activePresetNameBase,
				activeLocalName,
				suggestedName:
					activePresetNameBase === "Current State" ? "" : activePresetNameBase,
			}
		: null;

	const captureLoadedPresetFingerprint = useCallback(() => {
		setLoadedPresetFingerprint(getPresetFingerprint(gatherState()));
	}, [gatherState]);

	const requestPresetChange = useCallback(
		(navigation: PendingNavigation) => {
			if (!hasUnsavedChanges || navigation.entryId === activePresetId)
				return true;
			setPendingNavigation(navigation);
			return false;
		},
		[activePresetId, hasUnsavedChanges],
	);

	const loadLocalPreset = useCallback(
		(name: string) => {
			const data = loadPreset(name);
			if (!data) return;
			applyPreset(data);
			setActivePresetId(getLocalPresetEntryId(name));
			setActivePresetNameBase(name);
			captureLoadedPresetFingerprint();
		},
		[applyPreset, captureLoadedPresetFingerprint],
	);

	const loadBuiltinPreset = useCallback(
		(name: string) => {
			const data = builtinPresets[name];
			if (!data) return;
			applyPreset(data);
			setActivePresetId(getBuiltinPresetEntryId(name));
			setActivePresetNameBase(name);
			captureLoadedPresetFingerprint();
		},
		[applyPreset, builtinPresets, captureLoadedPresetFingerprint],
	);

	const loadLibraryPreset = useCallback(
		(preset: LibraryPreset) => {
			if (!onLoadLibraryPreset) return;
			onLoadLibraryPreset(preset);
			setActivePresetId(getLibraryPresetEntryId(preset.id));
			setActivePresetNameBase(preset.name);
			captureLoadedPresetFingerprint();
		},
		[captureLoadedPresetFingerprint, onLoadLibraryPreset],
	);

	const handleLoadLocal = useCallback(
		(name: string) => {
			const nextEntryId = getLocalPresetEntryId(name);
			if (!requestPresetChange({ type: "local", entryId: nextEntryId, name })) {
				return;
			}
			loadLocalPreset(name);
		},
		[loadLocalPreset, requestPresetChange],
	);

	const handleLoadBuiltin = useCallback(
		(name: string) => {
			const nextEntryId = getBuiltinPresetEntryId(name);
			if (
				!requestPresetChange({ type: "builtin", entryId: nextEntryId, name })
			) {
				return;
			}
			loadBuiltinPreset(name);
		},
		[loadBuiltinPreset, requestPresetChange],
	);

	const handleLoadLibrary = useCallback(
		(preset: LibraryPreset) => {
			const nextEntryId = getLibraryPresetEntryId(preset.id);
			if (
				!requestPresetChange({ type: "library", entryId: nextEntryId, preset })
			) {
				return;
			}
			loadLibraryPreset(preset);
		},
		[loadLibraryPreset, requestPresetChange],
	);

	const allPresetEntries = useMemo(
		(): PresetEntry[] => [
			...sortPresetEntries(
				Object.keys(builtinPresets).map((name) => ({
					id: getBuiltinPresetEntryId(name),
					label: name,
					type: "builtin" as const,
				})),
			),
			...sortPresetEntries(
				presetList.map((name) => ({
					id: getLocalPresetEntryId(name),
					label: name,
					type: "local" as const,
				})),
			),
			...sortPresetEntries(
				libraryPresets.map((preset) => ({
					id: getLibraryPresetEntryId(preset.id),
					label: preset.name,
					type: "library" as const,
					preset,
				})),
			),
		],
		[builtinPresets, presetList, libraryPresets],
	);

	const activePresetIndex = useMemo(
		() => allPresetEntries.findIndex((entry) => entry.id === activePresetId),
		[allPresetEntries, activePresetId],
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

	const completePendingNavigation = useCallback(
		(navigation: PendingNavigation | null) => {
			if (!navigation) return;
			setPendingNavigation(null);
			if (navigation.type === "local") {
				loadLocalPreset(navigation.name);
				return;
			}
			if (navigation.type === "builtin") {
				loadBuiltinPreset(navigation.name);
				return;
			}
			loadLibraryPreset(navigation.preset);
		},
		[loadBuiltinPreset, loadLibraryPreset, loadLocalPreset],
	);

	const handleSavePendingPresetChange = useCallback(
		(name?: string) => {
			const navigation = pendingNavigation;
			if (!navigation) return;
			const saveName = activeLocalName ?? name?.trim();
			if (!saveName) return;
			savePreset(saveName, gatherState());
			setPresetList(listPresets());
			captureLoadedPresetFingerprint();
			completePendingNavigation(navigation);
		},
		[
			activeLocalName,
			captureLoadedPresetFingerprint,
			completePendingNavigation,
			gatherState,
			pendingNavigation,
		],
	);

	const handleDiscardPendingPresetChange = useCallback(() => {
		completePendingNavigation(pendingNavigation);
	}, [completePendingNavigation, pendingNavigation]);

	const handleCancelPendingPresetChange = useCallback(() => {
		setPendingNavigation(null);
	}, []);

	const handleSavePreset = useCallback(
		(name: string) => {
			savePreset(name, gatherState());
			setPresetList(listPresets());
			setActivePresetId(getLocalPresetEntryId(name));
			setActivePresetNameBase(name);
			captureLoadedPresetFingerprint();
		},
		[captureLoadedPresetFingerprint, gatherState],
	);

	const handleDeletePreset = useCallback(
		(name: string) => {
			deletePreset(name);
			setPresetList(listPresets());
			setActivePresetId((prev) =>
				prev === getLocalPresetEntryId(name) ? null : prev,
			);
			setActivePresetNameBase((prev) =>
				prev === name ? "Current State" : prev,
			);
			setLoadedPresetFingerprint((prev) =>
				activePresetId === getLocalPresetEntryId(name) ? null : prev,
			);
		},
		[activePresetId],
	);

	const handleRenamePreset = useCallback((oldName: string, newName: string) => {
		const trimmed = newName.trim();
		if (!trimmed || trimmed === oldName) return;
		renamePreset(oldName, trimmed);
		setPresetList(listPresets());
		setActivePresetId((prev) =>
			prev === getLocalPresetEntryId(oldName)
				? getLocalPresetEntryId(trimmed)
				: prev,
		);
		setActivePresetNameBase((prev) => (prev === oldName ? trimmed : prev));
	}, []);

	const handleInitPreset = useCallback(() => {
		applyPreset(DEFAULT_PRESET);
		setActivePresetId(null);
		setActivePresetNameBase("Current State");
		captureLoadedPresetFingerprint();
	}, [applyPreset, captureLoadedPresetFingerprint]);

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
			setActivePresetId(getLocalPresetEntryId(candidate));
			setActivePresetNameBase(candidate);
			captureLoadedPresetFingerprint();
		},
		[applyPreset, captureLoadedPresetFingerprint],
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
		if (!shouldHydratePersistedState) return;
		const saved = loadCurrentState();
		if (saved) applyPreset(saved);
	}, [applyPreset, shouldHydratePersistedState]);

	useEffect(() => {
		const timer = setTimeout(() => {
			saveCurrentState(gatherState());
			saveCurrentPresetSession({
				activePresetId,
				activePresetNameBase,
				loadedPresetFingerprint,
			});
		}, 500);
		return () => clearTimeout(timer);
	}, [
		activePresetId,
		activePresetNameBase,
		gatherState,
		loadedPresetFingerprint,
	]);

	return {
		allPresetEntries,
		activePresetId,
		activePresetName,
		pendingPresetChange,
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
		handleSavePendingPresetChange,
		handleDiscardPendingPresetChange,
		handleCancelPendingPresetChange,
	};
}
