import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryPreset } from "@/features/synth/types/libraryPreset";
import type { PresetEntry } from "@/features/synth/types/presetEntry";
import PresetNavigator from "./PresetNavigator";

const libraryPreset: LibraryPreset = {
	id: "library-1",
	name: "Archive Pad",
};

const entries: PresetEntry[] = [
	{
		id: "builtin:factory-bass",
		label: "Factory Bass",
		type: "builtin",
	},
	{
		id: "local:local-keys",
		label: "Local Keys",
		type: "local",
	},
	{
		id: "library:archive-pad",
		label: libraryPreset.name,
		type: "library",
		preset: libraryPreset,
	},
];

function createProps() {
	return {
		allEntries: entries,
		activeEntryId: null,
		activePresetName: "Current State",
		onLoadLocal: vi.fn(),
		onLoadLibrary: vi.fn(),
		onLoadBuiltin: vi.fn(),
		onStepPreset: vi.fn(),
		onSavePreset: vi.fn(),
		onDeletePreset: vi.fn(),
		onRenamePreset: vi.fn(),
		onExportPreset: vi.fn(),
		onExportCurrentState: vi.fn(),
		onImportPreset: vi.fn(),
		onInitPreset: vi.fn(),
	};
}

function openPresetPanel() {
	fireEvent.click(screen.getByRole("button", { name: /^preset /i }));
}

describe("PresetNavigator", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("routes preset selection to the matching callbacks", () => {
		const props = createProps();
		const { rerender } = render(<PresetNavigator {...props} />);

		openPresetPanel();
		fireEvent.click(screen.getByRole("button", { name: /factory bass/i }));
		expect(props.onLoadBuiltin).toHaveBeenCalledWith("Factory Bass");
		expect(screen.queryByText("Preset List")).not.toBeInTheDocument();

		rerender(<PresetNavigator {...props} activePresetName="Factory Bass" />);
		openPresetPanel();
		fireEvent.click(screen.getByRole("button", { name: /local keys/i }));
		expect(props.onLoadLocal).toHaveBeenCalledWith("Local Keys");

		rerender(<PresetNavigator {...props} activePresetName="Local Keys" />);
		openPresetPanel();
		fireEvent.click(screen.getByRole("button", { name: /archive pad/i }));
		expect(props.onLoadLibrary).toHaveBeenCalledWith(libraryPreset);
	});

	it("trims save and export names before invoking callbacks", () => {
		const props = createProps();
		render(<PresetNavigator {...props} />);

		openPresetPanel();
		const saveInput = screen.getByPlaceholderText("Preset name…");
		fireEvent.change(saveInput, { target: { value: "  New Patch  " } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(props.onSavePreset).toHaveBeenCalledWith("New Patch");
		expect(saveInput).toHaveValue("");

		fireEvent.change(saveInput, { target: { value: "  Snapshot  " } });
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		expect(props.onExportCurrentState).toHaveBeenCalledWith("Snapshot");
	});

	it("commits inline renames with trimmed values and ignores cancelled edits", () => {
		const props = createProps();
		render(<PresetNavigator {...props} />);

		openPresetPanel();
		fireEvent.click(screen.getByTitle("Rename preset"));

		const renameInput = screen.getByDisplayValue("Local Keys");
		fireEvent.change(renameInput, { target: { value: "  Renamed Keys  " } });
		fireEvent.keyDown(renameInput, { key: "Enter" });
		expect(props.onRenamePreset).toHaveBeenCalledWith(
			"Local Keys",
			"Renamed Keys",
		);

		fireEvent.click(screen.getByTitle("Rename preset"));
		const cancelledInput = screen.getByDisplayValue("Local Keys");
		fireEvent.change(cancelledInput, { target: { value: "Ignored Name" } });
		fireEvent.keyDown(cancelledInput, { key: "Escape" });
		expect(props.onRenamePreset).toHaveBeenCalledTimes(1);
	});

	it("shows an import error when the imported JSON is rejected", async () => {
		const props = createProps();
		props.onImportPreset.mockImplementation(() => {
			throw new Error("bad preset");
		});

		class MockFileReader {
			public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

			readAsText() {
				this.onload?.({
					target: { result: '{"invalid":true}' },
				} as ProgressEvent<FileReader>);
			}
		}

		vi.stubGlobal("FileReader", MockFileReader);

		const { container } = render(<PresetNavigator {...props} />);
		openPresetPanel();

		const fileInput = container.querySelector('input[type="file"]');
		if (!(fileInput instanceof HTMLInputElement)) {
			throw new Error("expected hidden file input");
		}

		const file = new File(["{}"], "bad-patch.json", {
			type: "application/json",
		});
		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			expect(props.onImportPreset).toHaveBeenCalledWith(
				'{"invalid":true}',
				"bad-patch",
			);
		});
		expect(screen.getByText("Invalid preset file.")).toBeInTheDocument();
	});
});
