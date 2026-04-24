import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryPreset } from "@/features/synth/types/libraryPreset";
import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";
import { useSynthPresetManager } from "./useSynthPresetManager";

const storedPresets = new Map<string, SynthPresetV1>();
let storedPresetSession: unknown = null;

vi.mock("@/lib/synth/presetStorage", () => {
	const defaultPreset = {
		schemaVersion: 1,
		params: { volume: 1 },
	} as SynthPresetV1;

	return {
		DEFAULT_PRESET: defaultPreset,
		deletePreset: vi.fn((name: string) => {
			storedPresets.delete(name);
		}),
		exportPreset: vi.fn(() => null),
		importPreset: vi.fn(() => null),
		loadCurrentPresetSession: vi.fn(() => storedPresetSession),
		listPresets: vi.fn(() => [...storedPresets.keys()].sort()),
		loadCurrentState: vi.fn(() => null),
		loadPreset: vi.fn((name: string) => storedPresets.get(name) ?? null),
		renamePreset: vi.fn((oldName: string, newName: string) => {
			const preset = storedPresets.get(oldName);
			if (!preset) {
				return false;
			}
			storedPresets.set(newName, preset);
			storedPresets.delete(oldName);
			return true;
		}),
		saveCurrentState: vi.fn(),
		saveCurrentPresetSession: vi.fn((session: unknown) => {
			storedPresetSession = session;
		}),
		savePreset: vi.fn((name: string, data: SynthPresetV1) => {
			storedPresets.set(name, data);
		}),
	};
});

describe("useSynthPresetManager", () => {
	beforeEach(() => {
		storedPresets.clear();
		storedPresetSession = null;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const makePreset = (volume: number) =>
		({
			schemaVersion: 1,
			params: {
				volume,
				line1: {},
				line2: {},
			},
		}) as SynthPresetV1;

	const getPresetStateKey = (preset: SynthPresetV1) => JSON.stringify(preset);

	it("steps through duplicate library preset names by entry id", () => {
		const applyPreset = vi.fn();
		const onLoadLibraryPreset = vi.fn();
		const libraryPresets = [
			{ id: "preset-1", name: "Same Name" },
			{ id: "preset-2", name: "Same Name" },
			{ id: "preset-3", name: "Different Name" },
		] as LibraryPreset[];

		const { result } = renderHook(() =>
			useSynthPresetManager({
				builtinPresets: {},
				gatherState: () =>
					({
						schemaVersion: 1,
						params: { volume: 1 },
					}) as SynthPresetV1,
				applyPreset,
				libraryPresets,
				onLoadLibraryPreset,
			}),
		);

		act(() => {
			result.current.handleLoadLibrary(libraryPresets[0]);
		});

		expect(result.current.activePresetId).toBe("library:preset-1");
		expect(result.current.activePresetName).toBe("Same Name");

		act(() => {
			result.current.handleStepPreset(1);
		});

		expect(onLoadLibraryPreset).toHaveBeenLastCalledWith(libraryPresets[1]);
		expect(result.current.activePresetId).toBe("library:preset-2");
		expect(result.current.activePresetName).toBe("Same Name");

		act(() => {
			result.current.handleStepPreset(1);
		});

		expect(onLoadLibraryPreset).toHaveBeenLastCalledWith(libraryPresets[2]);
		expect(result.current.activePresetId).toBe("library:preset-3");
		expect(result.current.activePresetName).toBe("Different Name");
	});

	it("sorts preset groups alphanumerically", async () => {
		storedPresets.set("User 10", makePreset(10));
		storedPresets.set("User 2", makePreset(2));
		const libraryPresets = [
			{ id: "library-10", name: "Archive 10" },
			{ id: "library-2", name: "Archive 2" },
		] as LibraryPreset[];
		const gatherState = () => makePreset(1);
		const applyPreset = vi.fn();
		const onLoadLibraryPreset = vi.fn();

		const { result } = renderHook(() =>
			useSynthPresetManager({
				builtinPresets: {
					"Factory 10": makePreset(10),
					"Factory 2": makePreset(2),
				},
				gatherState,
				applyPreset,
				libraryPresets,
				onLoadLibraryPreset,
			}),
		);

		await waitFor(() => {
			expect(
				result.current.allPresetEntries.map((entry) => entry.label),
			).toEqual([
				"Factory 2",
				"Factory 10",
				"User 2",
				"User 10",
				"Archive 2",
				"Archive 10",
			]);
		});
	});

	it("keeps the selected preset name visible with an unsaved changes marker", () => {
		let currentPreset = makePreset(1);
		const factoryPreset = makePreset(2);
		const gatherState = () => currentPreset;
		const applyPreset = (preset: SynthPresetV1) => {
			currentPreset = preset;
		};

		const { result, rerender } = renderHook(
			({ presetStateKey }) =>
				useSynthPresetManager({
					builtinPresets: { "Factory 2": factoryPreset },
					gatherState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: getPresetStateKey(currentPreset) } },
		);

		act(() => {
			result.current.handleLoadBuiltin("Factory 2");
		});
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });
		expect(result.current.activePresetName).toBe("Factory 2");

		currentPreset = makePreset(3);
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		expect(result.current.activePresetName).toBe("Factory 2 *");
	});

	it("restores the loaded preset identity and dirty marker from saved session metadata", () => {
		const loadedPreset = makePreset(2);
		const modifiedPreset = makePreset(3);
		storedPresetSession = {
			activePresetId: "builtin:Factory 2",
			activePresetNameBase: "Factory 2",
			loadedPresetFingerprint: getPresetStateKey(loadedPreset),
		};

		const { result } = renderHook(() =>
			useSynthPresetManager({
				builtinPresets: { "Factory 2": loadedPreset },
				gatherState: () => modifiedPreset,
				applyPreset: vi.fn(),
				presetStateKey: getPresetStateKey(modifiedPreset),
			}),
		);

		expect(result.current.activePresetId).toBe("builtin:Factory 2");
		expect(result.current.activePresetName).toBe("Factory 2 *");
	});

	it("exposes dirty built-in changes as a pending save decision before navigating", () => {
		let currentPreset = makePreset(1);
		const factoryPreset = makePreset(2);
		const nextPreset = makePreset(3);
		const gatherState = () => currentPreset;
		const applyPreset = (preset: SynthPresetV1) => {
			currentPreset = preset;
		};

		const { result, rerender } = renderHook(
			({ presetStateKey }) =>
				useSynthPresetManager({
					builtinPresets: {
						"Factory 2": factoryPreset,
						"Factory 3": nextPreset,
					},
					gatherState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: getPresetStateKey(currentPreset) } },
		);

		act(() => {
			result.current.handleLoadBuiltin("Factory 2");
		});
		currentPreset = makePreset(42);
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		act(() => {
			result.current.handleLoadBuiltin("Factory 3");
		});
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		expect(result.current.pendingPresetChange).toEqual({
			activePresetName: "Factory 2",
			activeLocalName: null,
			suggestedName: "Factory 2",
		});
		expect(result.current.activePresetName).toBe("Factory 2 *");

		act(() => {
			result.current.handleSavePendingPresetChange(" Saved Copy ");
		});
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		expect(storedPresets.get("Saved Copy")).toEqual(makePreset(42));
		expect(result.current.activePresetName).toBe("Factory 3");
		expect(result.current.pendingPresetChange).toBeNull();
	});

	it("exposes dirty user preset changes as a pending overwrite decision", () => {
		const userPreset = makePreset(5);
		const nextPreset = makePreset(6);
		storedPresets.set("User 5", userPreset);
		let currentPreset = makePreset(1);
		const gatherState = () => currentPreset;
		const applyPreset = (preset: SynthPresetV1) => {
			currentPreset = preset;
		};

		const { result, rerender } = renderHook(
			({ presetStateKey }) =>
				useSynthPresetManager({
					builtinPresets: { "Factory 6": nextPreset },
					gatherState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: getPresetStateKey(currentPreset) } },
		);

		act(() => {
			result.current.handleLoadLocal("User 5");
		});
		currentPreset = makePreset(55);
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		act(() => {
			result.current.handleLoadBuiltin("Factory 6");
		});
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		expect(result.current.pendingPresetChange).toEqual({
			activePresetName: "User 5",
			activeLocalName: "User 5",
			suggestedName: "User 5",
		});

		act(() => {
			result.current.handleSavePendingPresetChange();
		});
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		expect(storedPresets.get("User 5")).toEqual(makePreset(55));
		expect(result.current.activePresetName).toBe("Factory 6");
		expect(result.current.pendingPresetChange).toBeNull();
	});

	it("can discard a pending dirty preset change", () => {
		let currentPreset = makePreset(1);
		const factoryPreset = makePreset(2);
		const nextPreset = makePreset(3);
		const gatherState = () => currentPreset;
		const applyPreset = (preset: SynthPresetV1) => {
			currentPreset = preset;
		};

		const { result, rerender } = renderHook(
			({ presetStateKey }) =>
				useSynthPresetManager({
					builtinPresets: {
						"Factory 2": factoryPreset,
						"Factory 3": nextPreset,
					},
					gatherState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: getPresetStateKey(currentPreset) } },
		);

		act(() => {
			result.current.handleLoadBuiltin("Factory 2");
		});
		currentPreset = makePreset(42);
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		act(() => {
			result.current.handleLoadBuiltin("Factory 3");
		});
		expect(result.current.pendingPresetChange).not.toBeNull();

		act(() => {
			result.current.handleDiscardPendingPresetChange();
		});
		rerender({ presetStateKey: getPresetStateKey(currentPreset) });

		expect(storedPresets.size).toBe(0);
		expect(result.current.activePresetName).toBe("Factory 3");
	});
});
