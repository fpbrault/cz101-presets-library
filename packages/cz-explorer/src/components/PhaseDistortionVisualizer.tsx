import {
	convertDecodedPatchToSynthPreset,
	DEFAULT_SYNTH_PRESETS,
	decodeCzPatch,
	type LibraryPreset,
	noteToFreq,
	pdVisualizerWorkletUrl,
	type StepEnvData,
	SYNTH_UI_STATE_STORAGE_KEY,
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
import { useQuery } from "@tanstack/react-query";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
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
	const line1DcoEnv = useSynthStore((s) => s.line1DcoEnv);
	const setLine1DcoEnv = useSynthStore((s) => s.setLine1DcoEnv);
	const line1DcwEnv = useSynthStore((s) => s.line1DcwEnv);
	const setLine1DcwEnv = useSynthStore((s) => s.setLine1DcwEnv);
	const line1DcaEnv = useSynthStore((s) => s.line1DcaEnv);
	const setLine1DcaEnv = useSynthStore((s) => s.setLine1DcaEnv);
	const line2DcoEnv = useSynthStore((s) => s.line2DcoEnv);
	const setLine2DcoEnv = useSynthStore((s) => s.setLine2DcoEnv);
	const line2DcwEnv = useSynthStore((s) => s.line2DcwEnv);
	const setLine2DcwEnv = useSynthStore((s) => s.setLine2DcwEnv);
	const line2DcaEnv = useSynthStore((s) => s.line2DcaEnv);
	const setLine2DcaEnv = useSynthStore((s) => s.setLine2DcaEnv);
	const polyMode = useSynthStore((s) => s.polyMode);
	const velocityTarget = useSynthStore((s) => s.velocityTarget);
	const lineSelect = useSynthStore((s) => s.lineSelect);
	const filterEnabled = useSynthStore((s) => s.filterEnabled);
	const gatherState = useSynthStore((s) => s.gatherState);
	const applyPreset = useSynthStore((s) => s.applyPreset);
	const presetStateKey = useSynthStore((s) => JSON.stringify(s.gatherState()));

	const [extPmAmount] = useState(0);
	const activeAsidePanel = useSynthUiStore((s) => s.activeAsidePanel);
	const setActiveAsidePanel = useSynthUiStore((s) => s.setActiveAsidePanel);

	useEffect(() => {
		try {
			if (localStorage.getItem(SYNTH_UI_STATE_STORAGE_KEY) !== null) {
				return;
			}
		} catch {
			return;
		}

		setActiveAsidePanel("scope");
	}, [setActiveAsidePanel]);

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
		extPmAmount,
		gatherState,
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
		libraryPresets,
		onLoadLibraryPreset: handleLoadLibraryPreset,
		presetStateKey,
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
