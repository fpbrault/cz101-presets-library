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

type CpalStreamInfo = {
	sample_rate: number;
	channels: number;
};

export default function App() {
	const gatherState = useSynthStore((s) => s.gatherState);
	const applyPreset = useSynthStore((s) => s.applyPreset);
	const velocityCurve = useSynthStore((s) => s.velocityCurve);
	const presetStateKey = useSynthStore((s) => JSON.stringify(s.gatherState()));
	const [midiInputId, setMidiInputId] = useState("all");
	const [outputChannelStart, setOutputChannelStart] = useState(1);
	const [audioSampleRate, setAudioSampleRate] = useState(44100);
	const [audioBufferSize, setAudioBufferSize] = useState(512);
	const [audioDeviceId, setAudioDeviceId] = useState("default");
	const pendingSampleBatchesRef = useRef<Float32Array[]>([]);
	const pendingSampleCountRef = useRef(0);
	const flushScheduledRef = useRef(false);

	// ── cpal audio output ──────────────────────────────────────────────────────
	// WKWebView does not support AudioContext.setSinkId() on macOS < 14.4, so we
	// route audio through a Rust cpal stream instead.  The capture callback is
	// called on every ScriptProcessorNode buffer and forwards raw PCM to cpal.
	const flushCapturedSamples = useCallback(() => {
		if (pendingSampleCountRef.current === 0) {
			return;
		}

		const batches = pendingSampleBatchesRef.current;
		const total = pendingSampleCountRef.current;
		pendingSampleBatchesRef.current = [];
		pendingSampleCountRef.current = 0;

		const merged = new Float32Array(total);
		let offset = 0;
		for (const chunk of batches) {
			merged.set(chunk, offset);
			offset += chunk.length;
		}

		void invoke("push_audio_samples", {
			samples: Array.from(merged),
		})
			.catch((error) => {
				console.error("[standalone] Failed to push captured samples:", error);
			});
	}, []);

	const onCaptureSamples = useCallback((stereoInterleaved: Float32Array) => {
		pendingSampleBatchesRef.current.push(stereoInterleaved);
		pendingSampleCountRef.current += stereoInterleaved.length;

		const minBatchFloats = 4096;
		if (pendingSampleCountRef.current >= minBatchFloats) {
			flushScheduledRef.current = false;
			flushCapturedSamples();
			return;
		}

		if (!flushScheduledRef.current) {
			flushScheduledRef.current = true;
			setTimeout(() => {
				flushScheduledRef.current = false;
				flushCapturedSamples();
			}, 3);
		}
	}, [flushCapturedSamples]);

	// Start (or restart) the cpal stream whenever the selected device changes.
	useEffect(() => {
		void invoke<CpalStreamInfo>("start_cpal_output", {
			deviceName: audioDeviceId,
		})
			.then((streamInfo) => {
				// Lock engine rate to the active hardware stream to avoid pitch drift.
				if (streamInfo.sample_rate > 0) {
					setAudioSampleRate(streamInfo.sample_rate);
					void invoke("update_audio_setting", {
						key: "sample_rate",
						value: streamInfo.sample_rate,
					}).catch(() => undefined);
				}
			})
			.catch((err) => {
				console.error("[standalone] Failed to start cpal output:", err);
			});
		return () => {
			pendingSampleBatchesRef.current = [];
			pendingSampleCountRef.current = 0;
			flushScheduledRef.current = false;
			void invoke("stop_cpal_output").catch(() => undefined);
		};
	}, [audioDeviceId]);

	const { audioCtxRef, analyserNodeRef, workletNodeRef, paramsRef } =
		useAudioEngine({
			synthWasmUrl,
			synthBindingsUrl,
			pdVisualizerWorkletUrl,
			outputChannelStart,
			sampleRate: audioSampleRate,
			bufferSize: audioBufferSize,
			audioDeviceId,
			onCaptureSamples,
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
				setOutputChannelStart(settings.output_channel_start || 1);
				setAudioBufferSize(settings.buffer_size || 512);
				setAudioDeviceId(settings.audio_device || "default");
			} catch (error) {
				console.error("[standalone] Failed to load audio settings:", error);
			}
		};

		void loadAudioSettings();

		let unlisten: (() => void) | null = null;
		void listen<AudioSettings>("audio-settings-updated", (event) => {
			setMidiInputId(event.payload.midi_input_device || "all");
			setOutputChannelStart(event.payload.output_channel_start || 1);
			setAudioBufferSize(event.payload.buffer_size || 512);
			setAudioDeviceId(event.payload.audio_device || "default");
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
