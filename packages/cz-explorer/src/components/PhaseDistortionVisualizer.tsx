import {
	type AsidePanelTab,
	convertDecodedPatchToSynthPreset,
	DEFAULT_SYNTH_PRESETS,
	decodeCzPatch,
	type LibraryPreset,
	noteToFreq,
	pdVisualizerWorkletUrl,
	type StepEnvData,
	SynthRenderer,
	synthBindingsUrl,
	synthWasmUrl,
	useAudioEngine,
	useLcdControlReadout,
	useNoteHandling,
	useSynthParamsToWorklet,
	useSynthPresetManager,
	useSynthState,
} from "@cosmo/cosmo-pd101";
import { useQuery } from "@tanstack/react-query";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { fetchPresetData, type Preset } from "@/lib/presets/presetManager";

type PhaseDistortionVisualizerProps = {
	frameStyle?: CSSProperties;
	headerExtra?: ReactNode;
};

type PhaseDistortionVisualizerBaseProps = PhaseDistortionVisualizerProps & {
	libraryPresets?: Preset[];
};

export function SharedPhaseDistortionVisualizer({
	frameStyle,
	headerExtra,
	libraryPresets = [],
}: PhaseDistortionVisualizerBaseProps = {}) {
	const { t } = useTranslation("synth");
	const synthState = useSynthState();
	const {
		warpAAmount,
		warpBAmount,
		warpAAlgo,
		warpBAlgo,
		algo2A,
		algo2B,
		algoBlendA,
		algoBlendB,
		intPmAmount,
		intPmRatio,
		pmPre,
		phaseModEnabled,
		windowType,
		volume,
		line1Level,
		line2Level,
		line1Octave,
		line2Octave,
		line1Detune,
		line2Detune,
		line1DcoEnv,
		setLine1DcoEnv,
		line1DcwEnv,
		setLine1DcwEnv,
		line1DcaEnv,
		setLine1DcaEnv,
		line1CzSlotAWaveform,
		line1CzSlotBWaveform,
		line1CzWindow,
		line1AlgoControlsA,
		line1AlgoControlsB,
		line2DcoEnv,
		setLine2DcoEnv,
		line2DcwEnv,
		setLine2DcwEnv,
		line2DcaEnv,
		setLine2DcaEnv,
		line2CzSlotAWaveform,
		line2CzSlotBWaveform,
		line2CzWindow,
		line2AlgoControlsA,
		line2AlgoControlsB,
		polyMode,
		legato,
		velocityTarget,
		chorusRate,
		chorusDepth,
		chorusEnabled,
		chorusMix,
		delayTime,
		delayFeedback,
		delayEnabled,
		delayMix,
		reverbSize,
		reverbEnabled,
		reverbMix,
		lineSelect,
		modMode,
		line1DcwKeyFollow,
		line2DcwKeyFollow,
		vibratoEnabled,
		vibratoWave,
		vibratoRate,
		vibratoDepth,
		vibratoDelay,
		portamentoEnabled,
		portamentoMode,
		portamentoRate,
		portamentoTime,
		lfoEnabled,
		lfoWaveform,
		lfoRate,
		lfoDepth,
		lfoOffset,
		lfoTarget,
		filterEnabled,
		filterType,
		filterCutoff,
		filterResonance,
		filterEnvAmount,
		pitchBendRange,
		modWheelVibratoDepth,
		modMatrix,
		gatherState,
		applyPreset,
	} = synthState;

	const [extPmAmount] = useState(0);
	const [activeAsidePanel, setActiveAsidePanel] =
		useState<AsidePanelTab>("scope");

	const { audioCtxRef, analyserNodeRef, workletNodeRef, paramsRef } =
		useAudioEngine({
			synthWasmUrl,
			synthBindingsUrl,
			pdVisualizerWorkletUrl,
		});

	const { activeNotes, sendNoteOn, sendNoteOff } = useNoteHandling({
		workletNodeRef,
		velocityTarget,
	});

	const { lcdControlReadout, pushLcdControlReadout, formatEnvReadout } =
		useLcdControlReadout();

	const heldNote =
		activeNotes.length > 0 ? activeNotes[activeNotes.length - 1] : null;
	const currentFreq = heldNote != null ? noteToFreq(heldNote) : 220;

	useSynthParamsToWorklet({
		workletNodeRef,
		paramsRef,
		effectivePitchHz: currentFreq,
		lineSelect,
		modMode,
		warpAAmount,
		warpBAmount,
		line1Level,
		line2Level,
		warpAAlgo,
		warpBAlgo,
		intPmAmount,
		intPmRatio,
		phaseModEnabled,
		extPmAmount,
		pmPre,
		windowType,
		volume,
		line1Detune,
		line2Detune,
		line1Octave,
		line2Octave,
		line1DcoEnv,
		line1DcwEnv,
		line1DcaEnv,
		line1CzSlotAWaveform,
		line1CzSlotBWaveform,
		line1CzWindow,
		line1AlgoControlsA,
		line1AlgoControlsB,
		line2DcoEnv,
		line2DcwEnv,
		line2DcaEnv,
		line2CzSlotAWaveform,
		line2CzSlotBWaveform,
		line2CzWindow,
		line2AlgoControlsA,
		line2AlgoControlsB,
		polyMode,
		legato,
		velocityTarget,
		chorusRate,
		chorusDepth,
		chorusEnabled,
		chorusMix,
		delayTime,
		delayFeedback,
		delayEnabled,
		delayMix,
		reverbSize,
		reverbEnabled,
		reverbMix,
		algo2A,
		algo2B,
		algoBlendA,
		algoBlendB,
		line1DcwKeyFollow,
		line2DcwKeyFollow,
		vibratoEnabled,
		vibratoWave,
		vibratoRate,
		vibratoDepth,
		vibratoDelay,
		portamentoEnabled,
		portamentoMode,
		portamentoRate,
		portamentoTime,
		lfoEnabled,
		lfoWaveform,
		lfoRate,
		lfoDepth,
		lfoOffset,
		lfoTarget,
		filterEnabled,
		filterType,
		filterCutoff,
		filterResonance,
		filterEnvAmount,
		pitchBendRange,
		modWheelVibratoDepth,
		modMatrix,
	});

	const handleLoadLibraryPreset = useCallback(
		(preset: LibraryPreset) => {
			if (preset.sysexData) {
				const decoded = decodeCzPatch(preset.sysexData);
				if (decoded) {
					const synthPreset = convertDecodedPatchToSynthPreset(decoded);
					applyPreset(synthPreset);
				}
			}
		},
		[applyPreset],
	);

	const {
		allPresetEntries,
		activePresetId,
		activePresetName,
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
	} = useSynthPresetManager({
		builtinPresets: DEFAULT_SYNTH_PRESETS,
		gatherState,
		applyPreset,
		libraryPresets,
		onLoadLibraryPreset: handleLoadLibraryPreset,
	});

	const lastHeldFreqRef = useRef(currentFreq);
	lastHeldFreqRef.current = currentFreq;
	const effectivePitchHz = lastHeldFreqRef.current;

	const handleLine1DcoEnvChange = useCallback(
		(next: StepEnvData) => {
			setLine1DcoEnv(next);
			pushLcdControlReadout("line1DcoEnv", formatEnvReadout(line1DcoEnv, next));
		},
		[formatEnvReadout, line1DcoEnv, pushLcdControlReadout, setLine1DcoEnv],
	);

	const handleLine1DcwEnvChange = useCallback(
		(next: StepEnvData) => {
			setLine1DcwEnv(next);
			pushLcdControlReadout("line1DcwEnv", formatEnvReadout(line1DcwEnv, next));
		},
		[formatEnvReadout, line1DcwEnv, pushLcdControlReadout, setLine1DcwEnv],
	);

	const handleLine1DcaEnvChange = useCallback(
		(next: StepEnvData) => {
			setLine1DcaEnv(next);
			pushLcdControlReadout("line1DcaEnv", formatEnvReadout(line1DcaEnv, next));
		},
		[formatEnvReadout, line1DcaEnv, pushLcdControlReadout, setLine1DcaEnv],
	);

	const handleLine2DcoEnvChange = useCallback(
		(next: StepEnvData) => {
			setLine2DcoEnv(next);
			pushLcdControlReadout("line2DcoEnv", formatEnvReadout(line2DcoEnv, next));
		},
		[formatEnvReadout, line2DcoEnv, pushLcdControlReadout, setLine2DcoEnv],
	);

	const handleLine2DcwEnvChange = useCallback(
		(next: StepEnvData) => {
			setLine2DcwEnv(next);
			pushLcdControlReadout("line2DcwEnv", formatEnvReadout(line2DcwEnv, next));
		},
		[formatEnvReadout, line2DcwEnv, pushLcdControlReadout, setLine2DcwEnv],
	);

	const handleLine2DcaEnvChange = useCallback(
		(next: StepEnvData) => {
			setLine2DcaEnv(next);
			pushLcdControlReadout("line2DcaEnv", formatEnvReadout(line2DcaEnv, next));
		},
		[formatEnvReadout, line2DcaEnv, pushLcdControlReadout, setLine2DcaEnv],
	);

	const lcdPrimaryText = useMemo(() => {
		if (heldNote != null) {
			return t("display.noteWithFreq", {
				note: heldNote,
				freq: effectivePitchHz.toFixed(1),
				defaultValue: `NOTE ${heldNote} ${effectivePitchHz.toFixed(1)}HZ`,
			});
		}
		return t("display.preset", {
			preset: activePresetName.toUpperCase(),
			defaultValue: `PRESET ${activePresetName.toUpperCase()}`,
		});
	}, [heldNote, effectivePitchHz, activePresetName, t]);

	const lcdSecondaryText = useMemo(() => {
		const filterStatus = filterEnabled
			? t("states.filterOn", { defaultValue: "FILT ON" })
			: t("states.filterOff", { defaultValue: "FILT OFF" });
		return t("display.linePolyFilter", {
			line: lineSelect,
			poly: polyMode.toUpperCase(),
			filter: filterStatus,
			defaultValue: `LINE ${lineSelect} | ${polyMode.toUpperCase()} | ${filterStatus}`,
		});
	}, [lineSelect, polyMode, filterEnabled, t]);

	return (
		<SynthRenderer
			synthState={synthState}
			headerProps={{
				allEntries: allPresetEntries,
				activeEntryId: activePresetId,
				activePresetName,
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
			}}
			frameClassName="h-full min-h-0 min-w-0 bg-cz-panel flex flex-col overflow-hidden w-full"
			frameStyle={frameStyle}
			headerExtra={headerExtra}
			lcdPrimaryText={lcdPrimaryText}
			lcdSecondaryText={lcdSecondaryText}
			lcdTransientReadout={lcdControlReadout}
			effectivePitchHz={effectivePitchHz}
			analyserNodeRef={analyserNodeRef}
			audioCtxRef={audioCtxRef}
			activeAsidePanel={activeAsidePanel}
			onAsidePanelChange={setActiveAsidePanel}
			onControlReadout={pushLcdControlReadout}
			envOverrideHandlers={{
				onLine1DcoEnvChange: handleLine1DcoEnvChange,
				onLine1DcwEnvChange: handleLine1DcwEnvChange,
				onLine1DcaEnvChange: handleLine1DcaEnvChange,
				onLine2DcoEnvChange: handleLine2DcoEnvChange,
				onLine2DcwEnvChange: handleLine2DcwEnvChange,
				onLine2DcaEnvChange: handleLine2DcaEnvChange,
			}}
			miniKeyboard={{
				activeNotes,
				onNoteOn: sendNoteOn,
				onNoteOff: sendNoteOff,
			}}
		/>
	);
}

export default function PhaseDistortionVisualizer(
	props: PhaseDistortionVisualizerProps = {},
) {
	const { data } = useQuery({
		queryKey: ["presets"],
		queryFn: () =>
			fetchPresetData(0, -1, [], "", [], "inclusive", false, false, 0),
		staleTime: 1000 * 60 * 5,
	});
	const libraryPresets = data?.presets ?? [];

	return (
		<SharedPhaseDistortionVisualizer
			{...props}
			libraryPresets={libraryPresets}
		/>
	);
}
