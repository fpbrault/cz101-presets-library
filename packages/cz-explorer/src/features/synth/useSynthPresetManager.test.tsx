import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Preset } from "@/lib/presets/presetManager";
import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";
import { useSynthPresetManager } from "./useSynthPresetManager";

const storedPresets = new Map<string, SynthPresetV1>();

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
		savePreset: vi.fn((name: string, data: SynthPresetV1) => {
			storedPresets.set(name, data);
		}),
	};
});

describe("useSynthPresetManager", () => {
	beforeEach(() => {
		storedPresets.clear();
	});

	it("steps through duplicate library preset names by entry id", () => {
		const applyPreset = vi.fn();
		const onLoadLibraryPreset = vi.fn();
		const libraryPresets = [
			{ id: "preset-1", name: "Same Name" },
			{ id: "preset-2", name: "Same Name" },
			{ id: "preset-3", name: "Different Name" },
		] as Preset[];

		const { result } = renderHook(() =>
			useSynthPresetManager({
				builtinPresets: {},
				gatherState: () =>
					({
						schemaVersion: 1,
						params: { volume: 1 },
					} as SynthPresetV1),
				applyPreset,
				libraryPresets,
				onLoadLibraryPreset,
			})
		);

		act(() => {
			result.current.handleLoadLibrary(libraryPresets[0] as Preset);
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
});