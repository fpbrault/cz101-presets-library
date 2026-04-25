import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryPreset } from "@/features/synth/types/libraryPreset";
import type { PresetEntry } from "@/features/synth/types/presetEntry";
import PresetLibrary from "./PresetLibrary";

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
		activeEntryId: "local:local-keys",
		activePresetName: "Local Keys",
		onLoadBuiltin: vi.fn(),
		onLoadLocal: vi.fn(),
		onLoadLibrary: vi.fn(),
		onSavePreset: vi.fn(),
		onDeletePreset: vi.fn(),
		onRenamePreset: vi.fn(),
		onExportPreset: vi.fn(),
		onExportCurrentState: vi.fn(),
		onImportPreset: vi.fn(),
		onInitPreset: vi.fn(),
		onSavePendingPresetChange: vi.fn(),
		onDiscardPendingPresetChange: vi.fn(),
		onCancelPendingPresetChange: vi.fn(),
		onClose: vi.fn(),
	};
}

describe("PresetLibrary", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("routes preset selection to the matching callbacks", () => {
		const props = createProps();
		render(<PresetLibrary {...props} />);

		fireEvent.click(screen.getByRole("button", { name: "Factory Bass" }));
		fireEvent.click(screen.getByRole("button", { name: "Local Keys" }));
		fireEvent.click(screen.getByRole("button", { name: "Archive Pad" }));

		expect(props.onLoadBuiltin).toHaveBeenCalledWith("Factory Bass");
		expect(props.onLoadLocal).toHaveBeenCalledWith("Local Keys");
		expect(props.onLoadLibrary).toHaveBeenCalledWith(libraryPreset);
	});

	it("saves, exports, imports, initializes, renames, and deletes from full-screen controls", async () => {
		const props = createProps();
		class MockFileReader {
			public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

			readAsText() {
				this.onload?.({
					target: { result: '{"schemaVersion":1}' },
				} as ProgressEvent<FileReader>);
			}
		}
		vi.stubGlobal("FileReader", MockFileReader);

		const { container } = render(<PresetLibrary {...props} />);

		const saveInput = screen.getByPlaceholderText("Preset name");
		fireEvent.change(saveInput, { target: { value: "  New Patch  " } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(props.onSavePreset).toHaveBeenCalledWith("New Patch");

		fireEvent.change(saveInput, { target: { value: "  Snapshot  " } });
		fireEvent.click(screen.getByRole("button", { name: "Export current state" }));
		expect(props.onExportCurrentState).toHaveBeenCalledWith("Snapshot");

		fireEvent.click(screen.getByRole("button", { name: "Init" }));
		expect(props.onInitPreset).toHaveBeenCalled();

		const fileInput = container.querySelector('input[type="file"]');
		if (!(fileInput instanceof HTMLInputElement)) {
			throw new Error("expected hidden file input");
		}
		fireEvent.change(fileInput, {
			target: {
				files: [new File(["{}"], "imported-patch.json")],
			},
		});
		await waitFor(() => {
			expect(props.onImportPreset).toHaveBeenCalledWith(
				'{"schemaVersion":1}',
				"imported-patch",
			);
		});

		fireEvent.click(screen.getByRole("button", { name: "Rename Local Keys" }));
		fireEvent.change(screen.getByDisplayValue("Local Keys"), {
			target: { value: "  Renamed Keys  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirm rename" }));
		expect(props.onRenamePreset).toHaveBeenCalledWith(
			"Local Keys",
			"Renamed Keys",
		);

		fireEvent.click(screen.getByRole("button", { name: "Delete Local Keys" }));
		fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
		expect(props.onDeletePreset).toHaveBeenCalledWith("Local Keys");
	});

	it("supports keyboard navigation in the list", () => {
		const props = createProps();
		render(<PresetLibrary {...props} />);

		const list = screen.getByRole("listbox", { name: "Preset library" });
		fireEvent.keyDown(list, { key: "ArrowDown" });
		fireEvent.keyDown(list, { key: "Enter" });

		expect(props.onLoadLibrary).toHaveBeenCalledWith(libraryPreset);
	});

	it("closes back to the synth view", () => {
		const props = createProps();
		render(<PresetLibrary {...props} />);

		fireEvent.click(screen.getByRole("button", { name: "Return" }));

		expect(props.onClose).toHaveBeenCalled();
	});
});