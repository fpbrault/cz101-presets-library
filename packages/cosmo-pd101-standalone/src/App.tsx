import {
	DEFAULT_SYNTH_PRESETS,
	noteToFreq,
	pdVisualizerWorkletUrl,
	SynthRenderer,
	synthBindingsUrl,
	synthWasmUrl,
	useAudioEngine,
	useLcdControlReadout,
	useNoteHandling,
	useSynthParamsToWorklet,
	useSynthPresetManager,
	useSynthStore,
	useSynthUiStore,
} from "@cosmo/cosmo-pd101";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Settings as SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioSettings } from "./types/audio";

export default function App() {
	const gatherState = useSynthStore((s) => s.gatherState);
	const applyPreset = useSynthStore((s) => s.applyPreset);
	const velocityCurve = useSynthStore((s) => s.velocityCurve);
	const presetStateKey = useSynthStore((s) => JSON.stringify(s.gatherState()));
	const [midiInputId, setMidiInputId] = useState("all");

	const { audioCtxRef, analyserNodeRef, workletNodeRef, paramsRef } =
		useAudioEngine({
			synthWasmUrl,
			synthBindingsUrl,
			pdVisualizerWorkletUrl,
		});

	const lastHeldFreqRef = useRef(220);
	const activeAsidePanel = useSynthUiStore((s) => s.activeAsidePanel);
	const setActiveAsidePanel = useSynthUiStore((s) => s.setActiveAsidePanel);
	const { lcdControlReadout, pushLcdControlReadout } = useLcdControlReadout();

	const { activeNotes, sendNoteOn, sendNoteOff } = useNoteHandling({
		velocityCurve,
		workletNodeRef,
		midiInputId,
	});

	const heldNote =
		activeNotes.length > 0 ? activeNotes[activeNotes.length - 1] : null;
	const effectivePitchHz = heldNote != null ? noteToFreq(heldNote) : 220;
	lastHeldFreqRef.current = effectivePitchHz;

	useSynthParamsToWorklet({
		workletNodeRef,
		paramsRef,
		effectivePitchHz,
		extPmAmount: 0,
		gatherState,
	});

	const shouldLoadCurrentState = useCallback(() => true, []);

	useEffect(() => {
		const loadAudioSettings = async () => {
			try {
				const settings = await invoke<AudioSettings>("get_audio_settings");
				setMidiInputId(settings.midi_input_device || "all");
			} catch (error) {
				console.error("[standalone] Failed to load audio settings:", error);
			}
		};

		void loadAudioSettings();

		let unlisten: (() => void) | null = null;
		void listen<AudioSettings>("audio-settings-updated", (event) => {
			setMidiInputId(event.payload.midi_input_device || "all");
		}).then((fn) => {
			unlisten = fn;
		});

		return () => {
			unlisten?.();
		};
	}, []);

	useEffect(() => {
		const tryResumeAudio = () => {
			const ctx = audioCtxRef.current;
			if (!ctx || ctx.state !== "suspended") return;
			void ctx.resume().catch((error) => {
				console.warn("[standalone] Failed to resume audio context:", error);
			});
		};

		window.addEventListener("pointerdown", tryResumeAudio);
		window.addEventListener("keydown", tryResumeAudio);
		window.addEventListener("touchstart", tryResumeAudio);

		return () => {
			window.removeEventListener("pointerdown", tryResumeAudio);
			window.removeEventListener("keydown", tryResumeAudio);
			window.removeEventListener("touchstart", tryResumeAudio);
		};
	}, [audioCtxRef]);

	const {
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
	} = useSynthPresetManager({
		builtinPresets: DEFAULT_SYNTH_PRESETS,
		gatherState,
		applyPreset,
		shouldLoadCurrentState,
		presetStateKey,
	});

	const lcdPrimaryText = useMemo(
		() => `PRESET ${activePresetName.toUpperCase()}`,
		[activePresetName],
	);

	return (
		<SynthRenderer
			headerProps={{
				allEntries: allPresetEntries,
				activeEntryId: activePresetId,
				activePresetName,
				pendingPresetChange,
				onLoadLocal: handleLoadLocal,
				onLoadLibrary: handleLoadLibrary,
				onLoadBuiltin: handleLoadBuiltin,
				onStepPreset: handleStepPreset,
				onSavePreset: handleSavePreset,
				onDeletePreset: handleDeletePreset,
				onRenamePreset: handleRenamePreset,
				onInitPreset: handleInitPreset,
				onExportPreset: handleExportPreset,
				onExportCurrentState: handleExportCurrentState,
				onImportPreset: handleImportPreset,
				onSavePendingPresetChange: handleSavePendingPresetChange,
				onDiscardPendingPresetChange: handleDiscardPendingPresetChange,
				onCancelPendingPresetChange: handleCancelPendingPresetChange,
			}}
			frameClassName="h-full bg-cz-panel flex flex-col overflow-hidden w-full"
			lcdPrimaryText={lcdPrimaryText}
			lcdSecondaryText={""}
			lcdTransientReadout={lcdControlReadout}
			effectivePitchHz={lastHeldFreqRef.current}
			analyserNodeRef={analyserNodeRef}
			audioCtxRef={audioCtxRef}
			activeAsidePanel={activeAsidePanel}
			onAsidePanelChange={setActiveAsidePanel}
			onControlReadout={pushLcdControlReadout}
			miniKeyboard={{
				activeNotes,
				onNoteOn: sendNoteOn,
				onNoteOff: sendNoteOff,
			}}
			bottomBarExtra={
				<button
					type="button"
					onClick={() => void invoke("open_settings_window")}
					className="flex items-center gap-1 h-6 rounded-sm border border-cz-border bg-black/30 px-2 text-[0.56rem] font-mono tracking-[0.12em] text-cz-cream/85 hover:bg-white/10 transition-colors"
					aria-label="Open audio and MIDI settings"
				>
					<SettingsIcon size={12} />
					SETTINGS
				</button>
			}
		/>
	);
}

