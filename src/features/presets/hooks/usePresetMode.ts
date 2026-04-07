import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import {
	addPreset,
	createPresetData,
	deletePreset,
	type Preset,
	restorePresetToBuffer,
	retrieveCurrentPresetFromSynth,
	retrievePresetSlotFromSynth,
	writePresetToSynthSlot,
} from "@/lib/presets/presetManager";
import { loadFromLocalStorage, saveToLocalStorage } from "@/utils/utils";

type AppMode = "presets" | "synthBackups" | "setlists";

interface SaveDraftPresetState {
	sysexData: Uint8Array;
	matchingPreset?: Preset;
	suggestedName: string;
}

interface UsePresetModeParams {
	selectedMidiPort: string;
	selectedMidiChannel: number;
	setCurrentPreset: (preset: Preset | null) => void;
	setAppMode: (mode: AppMode) => void;
}

export function usePresetMode({
	selectedMidiPort,
	selectedMidiChannel,
	setCurrentPreset,
	setAppMode,
}: UsePresetModeParams) {
	const queryClient = useQueryClient();
	const { notifySuccess, notifyInfo, notifyError } = useToast();
	const [editMode, setEditMode] = useState(false);
	const [autoSend, setAutoSend] = useState(
		loadFromLocalStorage("autoSend", false),
	);

	const [saveDraftPresetState, setSaveDraftPresetState] =
		useState<SaveDraftPresetState | null>(null);
	const [saveDraftName, setSaveDraftName] = useState("");
	const [saveDraftAuthor, setSaveDraftAuthor] = useState("");
	const [saveDraftTags, setSaveDraftTags] = useState("");
	const [saveDraftDescription, setSaveDraftDescription] = useState("");

	const openSaveDraftPresetModal = (
		sysexData: Uint8Array,
		matchingPreset: Preset | undefined,
		suggestedName: string,
	) => {
		setSaveDraftPresetState({
			sysexData,
			matchingPreset,
			suggestedName,
		});

		setSaveDraftName(matchingPreset?.name || suggestedName);
		setSaveDraftAuthor(matchingPreset?.author || "User");
		setSaveDraftTags((matchingPreset?.tags || []).join(", "));
		setSaveDraftDescription(matchingPreset?.description || "");
	};

	const closeSaveDraftPresetModal = () => {
		setSaveDraftPresetState(null);
		setSaveDraftName("");
		setSaveDraftAuthor("");
		setSaveDraftTags("");
		setSaveDraftDescription("");
	};

	const handleSaveDraftPreset = async () => {
		if (!saveDraftPresetState) return;

		const draftPresets = await createPresetData(
			`${saveDraftPresetState.suggestedName}.syx`,
			saveDraftPresetState.sysexData,
		);

		const preset = draftPresets[0];
		if (!preset) {
			notifyError("Failed to create a preset from retrieved SysEx data.");
			return;
		}

		const toSave: Preset = {
			...preset,
			name: saveDraftName.trim() || preset.name,
			author: saveDraftAuthor.trim() || "User",
			description: saveDraftDescription.trim(),
			tags: saveDraftTags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		};

		const saved = await addPreset(toSave);
		await queryClient.invalidateQueries({ queryKey: ["presets"] });
		setCurrentPreset(saved);
		setAppMode("presets");
		notifySuccess("Retrieved preset saved to library.");
		closeSaveDraftPresetModal();
	};

	const deletePresetById = async (id: string) => {
		await deletePreset(id);
		await queryClient.invalidateQueries({ queryKey: ["presets"] });
		setCurrentPreset(null);
	};

	const handleToggleAutoSend = () => {
		setAutoSend((prevAutoSend: boolean) => {
			const newAutoSend = !prevAutoSend;
			saveToLocalStorage("autoSend", newAutoSend);
			return newAutoSend;
		});
	};

	const handleSelectPreset = (preset: Preset) => {
		setCurrentPreset(preset);

		if (autoSend && preset && selectedMidiPort) {
			restorePresetToBuffer(preset, selectedMidiPort, selectedMidiChannel);
		}
	};

	const handleActivatePreset = (preset: Preset) => {
		setCurrentPreset(preset);

		if (selectedMidiPort) {
			restorePresetToBuffer(preset, selectedMidiPort, selectedMidiChannel);
		}
	};

	const handleSendCurrentPreset = (currentPreset: Preset | null) => {
		if (currentPreset && selectedMidiPort) {
			restorePresetToBuffer(
				currentPreset,
				selectedMidiPort,
				selectedMidiChannel,
			);
		}
	};

	const handleRetrieveCurrentPreset = async () => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before retrieving presets.");
			return;
		}

		try {
			const { sysexData, matchingPreset } =
				await retrieveCurrentPresetFromSynth(
					selectedMidiPort,
					selectedMidiChannel,
				);
			openSaveDraftPresetModal(sysexData, matchingPreset, "retrieved-current");
			notifyInfo(
				matchingPreset
					? `Retrieved current preset. Matched library preset: ${matchingPreset.name}.`
					: "Retrieved current preset. No exact library match found.",
			);
		} catch (error) {
			notifyError((error as Error).message);
		}
	};

	const handleRetrievePresetSlot = async (
		bank: "internal" | "cartridge",
		slot: number,
	) => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before retrieving presets.");
			return;
		}

		try {
			const { sysexData, matchingPreset } = await retrievePresetSlotFromSynth(
				selectedMidiPort,
				selectedMidiChannel,
				bank,
				slot,
			);
			openSaveDraftPresetModal(sysexData, matchingPreset, `${bank}-${slot}`);
			notifyInfo(
				matchingPreset
					? `Retrieved ${bank} slot ${slot}. Matched library preset: ${matchingPreset.name}.`
					: `Retrieved ${bank} slot ${slot}. No exact library match found.`,
			);
		} catch (error) {
			notifyError((error as Error).message);
		}
	};

	const handleWritePresetSlot = async (
		currentPreset: Preset | null,
		bank: "internal" | "cartridge",
		slot: number,
	) => {
		if (!selectedMidiPort) {
			notifyInfo("Select a MIDI port before writing presets.");
			return;
		}

		if (!currentPreset) {
			notifyInfo("Select a preset before writing to synth slot.");
			return;
		}

		try {
			await writePresetToSynthSlot(
				currentPreset,
				selectedMidiPort,
				selectedMidiChannel,
				bank,
				slot,
			);
			notifySuccess(
				`Wrote preset ${currentPreset.name} to ${bank} slot ${slot}.`,
			);
		} catch (error) {
			notifyError((error as Error).message);
		}
	};

	return {
		editMode,
		setEditMode,
		autoSend,
		saveDraftPresetState,
		saveDraftName,
		setSaveDraftName,
		saveDraftAuthor,
		setSaveDraftAuthor,
		saveDraftTags,
		setSaveDraftTags,
		saveDraftDescription,
		setSaveDraftDescription,
		openSaveDraftPresetModal,
		closeSaveDraftPresetModal,
		handleSaveDraftPreset,
		deletePresetById,
		handleToggleAutoSend,
		handleSelectPreset,
		handleActivatePreset,
		handleSendCurrentPreset,
		handleRetrieveCurrentPreset,
		handleRetrievePresetSlot,
		handleWritePresetSlot,
	};
}
