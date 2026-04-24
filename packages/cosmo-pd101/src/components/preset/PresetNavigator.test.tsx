import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PresetEntry } from "@/features/synth/types/presetEntry";
import PresetNavigator from "./PresetNavigator";

const entries: PresetEntry[] = [
	{
		id: "builtin:factory-bass",
		label: "Factory Bass",
		type: "builtin",
	},
];

describe("PresetNavigator", () => {
	it("opens the full-screen library from the preset display", () => {
		const onLibraryModeChange = vi.fn();

		const { rerender } = render(
			<PresetNavigator
				allEntries={entries}
				activePresetName="Current State"
				onStepPreset={vi.fn()}
				onLibraryModeChange={onLibraryModeChange}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Preset Current State. Open library",
			}),
		);

		expect(onLibraryModeChange).toHaveBeenCalledWith(true);
		expect(screen.queryByText("Preset List")).not.toBeInTheDocument();

		rerender(
			<PresetNavigator
				allEntries={entries}
				activePresetName="Current State"
				onStepPreset={vi.fn()}
				isLibraryModeOpen={true}
				onLibraryModeChange={onLibraryModeChange}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Preset Current State. Open library",
			}),
		);
		expect(onLibraryModeChange).toHaveBeenLastCalledWith(false);
	});

	it("keeps previous and next preset stepping", () => {
		const onStepPreset = vi.fn();

		render(
			<PresetNavigator
				allEntries={entries}
				activePresetName="Current State"
				onStepPreset={onStepPreset}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Previous preset" }));
		fireEvent.click(screen.getByRole("button", { name: "Next preset" }));

		expect(onStepPreset).toHaveBeenNthCalledWith(1, -1);
		expect(onStepPreset).toHaveBeenNthCalledWith(2, 1);
	});
});