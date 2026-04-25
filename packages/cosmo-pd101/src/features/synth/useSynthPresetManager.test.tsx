import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";
import {
	DEFAULT_PRESET,
	loadCurrentPresetSession,
	loadCurrentState,
	loadPreset,
	saveCurrentPresetSession,
	saveCurrentState,
	savePreset,
} from "@/lib/synth/presetStorage";
import { useSynthPresetManager } from "./useSynthPresetManager";

const clonePreset = (): SynthPresetV1 =>
	JSON.parse(JSON.stringify(DEFAULT_PRESET)) as SynthPresetV1;

const makePreset = (volume: number): SynthPresetV1 => {
	const preset = clonePreset();
	preset.params.volume = volume;
	return preset;
};

describe("useSynthPresetManager", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("hydrates saved current state and preset session on mount", () => {
		const savedState = makePreset(0.33);
		let currentState = savedState;
		const applyPreset = vi.fn((preset: SynthPresetV1) => {
			currentState = preset;
		});

		savePreset("Zulu", makePreset(0.8));
		savePreset("Alpha", makePreset(0.2));
		saveCurrentState(savedState);
		saveCurrentPresetSession({
			activePresetId: "builtin:Factory Brass",
			activePresetNameBase: "Factory Brass",
			loadedPresetFingerprint: JSON.stringify(savedState),
		});

		const { result } = renderHook(() =>
			useSynthPresetManager({
				builtinPresets: {
					"Init Bass": makePreset(0.5),
					"Factory Brass": makePreset(0.7),
				},
				gatherState: () => currentState,
				applyPreset,
			}),
		);

		expect(applyPreset).toHaveBeenCalledWith(savedState);
		expect(result.current.activePresetId).toBe("builtin:Factory Brass");
		expect(result.current.activePresetName).toBe("Factory Brass");
		expect(result.current.allPresetEntries.map((entry) => entry.id)).toEqual([
			"builtin:Factory Brass",
			"builtin:Init Bass",
			"local:Alpha",
			"local:Zulu",
		]);
	});

	it("skips preset session hydration when current state hydration is disabled", () => {
		const savedState = makePreset(0.33);
		let currentState = clonePreset();
		const applyPreset = vi.fn((preset: SynthPresetV1) => {
			currentState = preset;
		});

		saveCurrentState(savedState);
		saveCurrentPresetSession({
			activePresetId: "builtin:Factory Brass",
			activePresetNameBase: "Factory Brass",
			loadedPresetFingerprint: JSON.stringify(savedState),
		});

		const { result } = renderHook(() =>
			useSynthPresetManager({
				builtinPresets: {
					"Factory Brass": makePreset(0.7),
					Beta: makePreset(0.9),
				},
				gatherState: () => currentState,
				applyPreset,
				shouldLoadCurrentState: () => false,
			}),
		);

		expect(applyPreset).not.toHaveBeenCalled();
		expect(result.current.activePresetId).toBeNull();
		expect(result.current.activePresetName).toBe("Current State");

		act(() => {
			result.current.handleLoadBuiltin("Beta");
		});

		expect(result.current.pendingPresetChange).toBeNull();
		expect(result.current.activePresetId).toBe("builtin:Beta");
		expect(result.current.activePresetName).toBe("Beta");
	});

	it("queues pending navigation when switching presets with unsaved changes", () => {
		const alphaPreset = makePreset(0.1);
		const betaPreset = makePreset(0.9);
		let currentState = clonePreset();
		const applyPreset = vi.fn((preset: SynthPresetV1) => {
			currentState = preset;
		});

		const { result, rerender } = renderHook(
			({ presetStateKey }: { presetStateKey: string }) =>
				useSynthPresetManager({
					builtinPresets: {
						Alpha: alphaPreset,
						Beta: betaPreset,
					},
					gatherState: () => currentState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: JSON.stringify(currentState) } },
		);

		act(() => {
			result.current.handleLoadBuiltin("Alpha");
		});

		const editedState = makePreset(0.45);
		currentState = editedState;
		rerender({ presetStateKey: JSON.stringify(editedState) });

		act(() => {
			result.current.handleLoadBuiltin("Beta");
		});

		expect(applyPreset).toHaveBeenCalledTimes(1);
		expect(result.current.activePresetId).toBe("builtin:Alpha");
		expect(result.current.activePresetName).toBe("Alpha *");
		expect(result.current.pendingPresetChange).toEqual({
			activePresetName: "Alpha",
			activeLocalName: null,
			suggestedName: "Alpha",
		});
	});

	it("saves the active local preset before completing a pending navigation", () => {
		const localPreset = makePreset(0.25);
		const editedLocalPreset = makePreset(0.6);
		const betaPreset = makePreset(0.85);
		let currentState = clonePreset();
		const applyPreset = vi.fn((preset: SynthPresetV1) => {
			currentState = preset;
		});

		savePreset("Mine", localPreset);

		const { result, rerender } = renderHook(
			({ presetStateKey }: { presetStateKey: string }) =>
				useSynthPresetManager({
					builtinPresets: {
						Beta: betaPreset,
					},
					gatherState: () => currentState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: JSON.stringify(currentState) } },
		);

		act(() => {
			result.current.handleLoadLocal("Mine");
		});

		currentState = editedLocalPreset;
		rerender({ presetStateKey: JSON.stringify(editedLocalPreset) });

		act(() => {
			result.current.handleLoadBuiltin("Beta");
		});

		act(() => {
			result.current.handleSavePendingPresetChange();
		});
		rerender({ presetStateKey: JSON.stringify(currentState) });

		expect(loadPreset("Mine")).toEqual(editedLocalPreset);
		expect(result.current.pendingPresetChange).toBeNull();
		expect(result.current.activePresetId).toBe("builtin:Beta");
		expect(result.current.activePresetName).toBe("Beta");
		expect(applyPreset).toHaveBeenLastCalledWith(betaPreset);
	});

	it("persists current state and preset session after the debounce", () => {
		vi.useFakeTimers();

		const alphaPreset = makePreset(0.2);
		const editedAlpha = makePreset(0.51);
		let currentState = clonePreset();
		const applyPreset = vi.fn((preset: SynthPresetV1) => {
			currentState = preset;
		});

		const { result, rerender } = renderHook(
			({ presetStateKey }: { presetStateKey: string }) =>
				useSynthPresetManager({
					builtinPresets: {
						Alpha: alphaPreset,
					},
					gatherState: () => currentState,
					applyPreset,
					presetStateKey,
				}),
			{ initialProps: { presetStateKey: JSON.stringify(currentState) } },
		);

		act(() => {
			result.current.handleLoadBuiltin("Alpha");
		});

		currentState = editedAlpha;
		rerender({ presetStateKey: JSON.stringify(editedAlpha) });

		act(() => {
			vi.runAllTimers();
		});

		expect(loadCurrentState()).toEqual(editedAlpha);
		expect(loadCurrentPresetSession()).toEqual({
			activePresetId: "builtin:Alpha",
			activePresetNameBase: "Alpha",
			loadedPresetFingerprint: JSON.stringify(alphaPreset),
		});
	});
});
