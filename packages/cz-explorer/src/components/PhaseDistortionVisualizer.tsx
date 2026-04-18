import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSynthPresetManager } from "@/features/synth/useSynthPresetManager";
import {
	type PolyMode,
	useSynthState,
	type VelocityTarget,
} from "@/features/synth/useSynthState";
import { decodeCzPatch } from "@/lib/midi/czSysexDecoder";
import { fetchPresetData, type Preset } from "@/lib/presets/presetManager";
import { convertDecodedPatchToSynthPreset } from "@/lib/synth/czPresetConverter";
import { DEFAULT_SYNTH_PRESETS } from "@/lib/synth/defaultPresets";
import {
	pdVisualizerWorkletUrl,
	synthBindingsUrl,
	synthWasmUrl,
} from "@/lib/synth/pdVisualizerWorkletUrl";
import {
	computeWaveform,
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	noteToFreq,
	PC_KEY_TO_NOTE,
	PD_ALGOS,
	type StepEnvData,
} from "./pdAlgorithms";
import { drawPhaseMap, drawScope, drawSingleScope } from "./pdCanvas";
import { SingleCycleDisplay } from "./SingleCycleDisplay";
import AsidePanelSwitcher from "./synth/AsidePanelSwitcher";
import ChorusPanel from "./synth/ChorusPanel";
import DelayPanel from "./synth/DelayPanel";
import GlobalVoicePanel from "./synth/GlobalVoicePanel";
import LfoPanel from "./synth/LfoPanel";
import PhaseLinesSection from "./synth/PhaseLinesSection";
import PhaseModPanel from "./synth/PhaseModPanel";
import PortamentoPanel from "./synth/PortamentoPanel";
import ReverbPanel from "./synth/ReverbPanel";
import ScopePanel from "./synth/ScopePanel";
import SynthFilterPanel from "./synth/SynthFilterPanel";
import SynthLcdDisplay from "./synth/SynthLcdDisplay";
import SynthPageFrame from "./synth/SynthPageFrame";
import VibratoPanel from "./synth/VibratoPanel";
import CzButton from "./ui/CzButton";

type AsidePanelTab =
	| "scope"
	| "global"
	| "phaseMod"
	| "vibrato"
	| "portamento"
	| "lfo"
	| "filter"
	| "chorus"
	| "delay"
	| "reverb";

const ASIDE_PANEL_TABS: Array<{
	id: AsidePanelTab;
	topLabel: string;
	bottomLabel: string;
}> = [
	{ id: "global", topLabel: "Global", bottomLabel: "" },
	{ id: "portamento", topLabel: "Porta", bottomLabel: "mento" },
	{ id: "phaseMod", topLabel: "Phase", bottomLabel: "Mod" },
	{ id: "vibrato", topLabel: "Vibrato", bottomLabel: "" },
	{ id: "lfo", topLabel: "LFO", bottomLabel: "" },
	{ id: "scope", topLabel: "Scope", bottomLabel: "View" },
	{ id: "filter", topLabel: "Filter", bottomLabel: "" },
	{ id: "chorus", topLabel: "Chorus", bottomLabel: "FX" },
	{ id: "delay", topLabel: "Delay", bottomLabel: "FX" },
	{ id: "reverb", topLabel: "Reverb", bottomLabel: "FX" },
];

const LCD_CONTROL_LABELS: Record<string, string> = {
	warpAAmount: "Line 1 DCW",
	warpBAmount: "Line 2 DCW",
	warpAAlgo: "Line 1 Wave",
	warpBAlgo: "Line 2 Wave",
	algoBlendA: "Line 1 Blend",
	algoBlendB: "Line 2 Blend",
	intPmAmount: "PM Amount",
	intPmRatio: "PM Ratio",
	phaseModEnabled: "Phase Mod",
	pmPre: "PM Mode",
	windowType: "Window",
	volume: "Volume",
	line1Level: "Line 1 Level",
	line2Level: "Line 2 Level",
	line1Octave: "Line 1 Octave",
	line2Octave: "Line 2 Octave",
	line1Detune: "Line 1 Detune",
	line2Detune: "Line 2 Detune",
	line1DcoDepth: "Line 1 Pitch Env",
	line2DcoDepth: "Line 2 Pitch Env",
	line1DcoEnv: "Line 1 DCO Env",
	line1DcwEnv: "Line 1 DCW Env",
	line1DcaEnv: "Line 1 DCA Env",
	line2DcoEnv: "Line 2 DCO Env",
	line2DcwEnv: "Line 2 DCW Env",
	line2DcaEnv: "Line 2 DCA Env",
	line1DcwComp: "Line 1 Key Follow",
	line2DcwComp: "Line 2 Key Follow",
	polyMode: "Voice Mode",
	velocityTarget: "Velocity",
	pitchBendRange: "Bend Range",
	modWheelVibratoDepth: "Mod to Vibrato",
	lineSelect: "Line Select",
	modMode: "Modulation",
	vibratoEnabled: "Vibrato",
	vibratoWave: "Vibrato Wave",
	vibratoRate: "Vibrato Rate",
	vibratoDepth: "Vibrato Depth",
	vibratoDelay: "Vibrato Delay",
	portamentoEnabled: "Portamento",
	portamentoMode: "Portamento Mode",
	portamentoRate: "Portamento Rate",
	portamentoTime: "Portamento Time",
	lfoEnabled: "LFO",
	lfoWaveform: "LFO Wave",
	lfoRate: "LFO Rate",
	lfoDepth: "LFO Depth",
	lfoOffset: "LFO Offset",
	lfoTarget: "LFO Target",
	filterEnabled: "Filter",
	filterType: "Filter Type",
	filterCutoff: "Filter Cutoff",
	filterResonance: "Filter Resonance",
	filterEnvAmount: "Filter Env",
	chorusRate: "Chorus Rate",
	chorusDepth: "Chorus Depth",
	chorusEnabled: "Chorus",
	chorusMix: "Chorus Mix",
	delayTime: "Delay Time",
	delayFeedback: "Delay Feedback",
	delayEnabled: "Delay",
	delayMix: "Delay Mix",
	reverbSize: "Reverb Size",
	reverbEnabled: "Reverb",
	reverbMix: "Reverb Mix",
	scopeCycles: "Scope Cycles",
	scopeVerticalZoom: "Scope Zoom",
	scopeTriggerLevel: "Scope Trigger",
};

function formatLcdControlValue(
	key: string,
	value: string | number | boolean,
): string {
	if (typeof value === "boolean") return value ? "ON" : "OFF";

	if (typeof value === "string") {
		if (key === "polyMode") return value === "poly8" ? "POLY 8" : "MONO";
		if (key === "windowType") return value.toUpperCase();
		if (key === "velocityTarget") return value.toUpperCase();
		if (key === "lineSelect") return value;
		if (key === "modMode") return value.toUpperCase();
		if (key === "lfoTarget") return value.toUpperCase();
		if (key === "filterType") return value.toUpperCase();
		if (key === "lfoWaveform") return value.toUpperCase();
		if (key === "portamentoMode") return value.toUpperCase();
		return value.toUpperCase();
	}

	if (key === "volume") return `${Math.round(value * 100)}%`;
	if (key === "line1Level" || key === "line2Level")
		return `${Math.round(value * 100)}%`;
	if (key === "pitchBendRange") return `${Math.round(value)} ST`;
	if (key === "vibratoDelay") return `${Math.round(value)} MS`;
	if (key === "filterCutoff") return `${Math.round(value)} HZ`;
	if (key === "delayTime") return `${value.toFixed(2)} S`;
	if (key === "portamentoTime") return `${value.toFixed(2)} S`;
	if (
		key === "chorusMix" ||
		key === "delayMix" ||
		key === "reverbMix" ||
		key === "filterResonance" ||
		key === "filterEnvAmount"
	) {
		return value.toFixed(2);
	}
	if (
		key === "intPmAmount" ||
		key === "intPmRatio" ||
		key === "chorusRate" ||
		key === "chorusDepth" ||
		key === "reverbSize" ||
		key === "scopeVerticalZoom"
	) {
		return value.toFixed(2);
	}

	return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export default function PhaseDistortionVisualizer() {
	const { data: libraryPresets = [] } = useQuery({
		queryKey: ["presets"],
		queryFn: fetchPresetData as any,
		staleTime: 1000 * 60 * 5,
	}) as { data?: Preset[] };

	const synthState = useSynthState();
	const {
		warpAAmount,
		setWarpAAmount,
		warpBAmount,
		setWarpBAmount,
		warpAAlgo,
		setWarpAAlgo,
		warpBAlgo,
		setWarpBAlgo,
		algo2A,
		setAlgo2A,
		algo2B,
		setAlgo2B,
		algoBlendA,
		setAlgoBlendA,
		algoBlendB,
		setAlgoBlendB,
		intPmAmount,
		setIntPmAmount,
		intPmRatio,
		setIntPmRatio,
		pmPre,
		setPmPre,
		phaseModEnabled,
		setPhaseModEnabled,
		windowType,
		volume,
		setVolume,
		line1Level,
		setLine1Level,
		line2Level,
		setLine2Level,
		line1Octave,
		setLine1Octave,
		line2Octave,
		setLine2Octave,
		line1Detune,
		setLine1Detune,
		line2Detune,
		setLine2Detune,
		line1DcoDepth,
		setLine1DcoDepth,
		line2DcoDepth,
		setLine2DcoDepth,
		line1DcwComp,
		setLine1DcwComp,
		line2DcwComp,
		setLine2DcwComp,
		line1DcoEnv,
		setLine1DcoEnv,
		line1DcwEnv,
		setLine1DcwEnv,
		line1DcaEnv,
		setLine1DcaEnv,
		line2DcoEnv,
		setLine2DcoEnv,
		line2DcwEnv,
		setLine2DcwEnv,
		line2DcaEnv,
		setLine2DcaEnv,
		polyMode,
		setPolyMode,
		legato,
		velocityTarget,
		setVelocityTarget,
		chorusRate,
		setChorusRate,
		chorusDepth,
		setChorusDepth,
		chorusEnabled,
		setChorusEnabled,
		chorusMix,
		setChorusMix,
		delayTime,
		setDelayTime,
		delayFeedback,
		setDelayFeedback,
		delayEnabled,
		setDelayEnabled,
		delayMix,
		setDelayMix,
		reverbSize,
		setReverbSize,
		reverbEnabled,
		setReverbEnabled,
		reverbMix,
		setReverbMix,
		lineSelect,
		setLineSelect,
		modMode,
		setModMode,
		line1DcwKeyFollow,
		setLine1DcwKeyFollow,
		line2DcwKeyFollow,
		setLine2DcwKeyFollow,
		vibratoEnabled,
		setVibratoEnabled,
		vibratoWave,
		setVibratoWave,
		vibratoRate,
		setVibratoRate,
		vibratoDepth,
		setVibratoDepth,
		vibratoDelay,
		setVibratoDelay,
		portamentoEnabled,
		setPortamentoEnabled,
		portamentoMode,
		setPortamentoMode,
		portamentoRate,
		setPortamentoRate,
		portamentoTime,
		setPortamentoTime,
		lfoEnabled,
		setLfoEnabled,
		lfoWaveform,
		setLfoWaveform,
		lfoRate,
		setLfoRate,
		lfoDepth,
		setLfoDepth,
		lfoOffset,
		setLfoOffset,
		lfoTarget,
		setLfoTarget,
		filterEnabled,
		setFilterEnabled,
		filterType,
		setFilterType,
		filterCutoff,
		setFilterCutoff,
		filterResonance,
		setFilterResonance,
		filterEnvAmount,
		setFilterEnvAmount,
		pitchBendRange,
		setPitchBendRange,
		modWheelVibratoDepth,
		setModWheelVibratoDepth,
		gatherState,
		applyPreset,
	} = synthState;

	const [extPmAmount] = useState(0);
	const [scopeCycles, setScopeCycles] = useState(2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(1.0);
	const [scopeTriggerMode] = useState<"off" | "rise" | "fall">("rise");
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(128);
	const [activePhaseLineTab, setActivePhaseLineTab] = useState<
		"line1" | "line2"
	>("line1");
	const [activeAsidePanel, setActiveAsidePanel] =
		useState<AsidePanelTab>("scope");
	const [_sustainOn, setSustainOn] = useState(false);
	const [activeNotes, setActiveNotes] = useState<number[]>([]);

	const [lcdControlReadout, setLcdControlReadout] = useState<{
		label: string;
		value: string;
	} | null>(null);

	const handleLoadLibraryPreset = useCallback(
		(preset: Preset) => {
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

	// ── Audio engine ──────────────────────────────────────────────────────────
	const audioCtxRef = useRef<AudioContext | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const analyserNodeRef = useRef<AnalyserNode | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);
	const audioInitRef = useRef(false);
	const paramsRef = useRef({
		lineSelect: "L1+L2",
		octave: 0,
		line1: {
			waveform: 1,
			waveform2: 1,
			algo2: null as string | null,
			algoBlend: 0,
			window: "off",
			dcaBase: 1.0,
			dcwBase: 0,
			dcoDepth: 12,
			modulation: 0,
			warpAlgo: "cz101",
			detuneCents: 0,
			octave: 0,
			dcoEnv: DEFAULT_DCO_ENV,
			dcwEnv: DEFAULT_DCW_ENV,
			dcaEnv: DEFAULT_DCA_ENV,
		},
		line2: {
			waveform: 1,
			waveform2: 1,
			algo2: null as string | null,
			algoBlend: 0,
			window: "off",
			dcaBase: 1.0,
			dcwBase: 0,
			dcoDepth: 12,
			modulation: 0,
			warpAlgo: "cz101",
			detuneCents: 0,
			octave: 0,
			dcoEnv: DEFAULT_DCO_ENV,
			dcwEnv: DEFAULT_DCW_ENV,
			dcaEnv: DEFAULT_DCA_ENV,
		},
		intPmAmount: 0,
		intPmRatio: 1,
		extPmAmount: 0,
		pmPre: true,
		frequency: 220,
		volume: 0.4,
		polyMode: "poly8" as PolyMode,
		legato: false,
		velocityTarget: "amp" as VelocityTarget,
		chorus: { rate: 0.8, depth: 0.003, mix: 0 },
		delay: { time: 0.3, feedback: 0.35, mix: 0 },
		reverb: { size: 0.5, mix: 0 },
	});
	const sustainRef = useRef(false);

	// ── Canvas refs ───────────────────────────────────────────────────────────
	const line1CanvasRef = useRef<HTMLCanvasElement>(null);
	const line2CanvasRef = useRef<HTMLCanvasElement>(null);
	const combinedCanvasRef = useRef<HTMLCanvasElement>(null);
	const phaseCanvasRef = useRef<HTMLCanvasElement>(null);
	const oscilloscopeCanvasRef = useRef<HTMLCanvasElement>(null);
	const pressedPcKeysRef = useRef<Set<string>>(new Set());
	const lastHeldFreqRef = useRef(220);

	const heldNote =
		activeNotes.length > 0 ? activeNotes[activeNotes.length - 1] : null;
	const previousControlSnapshotRef =
		useRef<Record<string, string | number | boolean>>();
	const lcdReadoutTimeoutRef = useRef<number | null>(null);
	let effectivePitchHz = lastHeldFreqRef.current;
	if (heldNote != null) {
		lastHeldFreqRef.current = noteToFreq(heldNote);
		effectivePitchHz = lastHeldFreqRef.current;
	}

	const sustainLevel1 = line1DcwEnv.steps[line1DcwEnv.sustainStep]?.level ?? 1;
	const sustainLevelA = line1DcaEnv.steps[line1DcaEnv.sustainStep]?.level ?? 1;
	const sustainLevel2 = line2DcwEnv.steps[line2DcwEnv.sustainStep]?.level ?? 1;
	const sustainLevelB = line2DcaEnv.steps[line2DcaEnv.sustainStep]?.level ?? 1;

	const effectiveWarpA = warpAAmount * sustainLevel1;
	const effectiveWarpB = warpBAmount * sustainLevel2;
	const effectiveLevelA = line1Level * sustainLevelA;
	const effectiveLevelB = line2Level * sustainLevelB;

	const pushLcdControlReadout = useCallback((key: string, value: unknown) => {
		if (!(key in LCD_CONTROL_LABELS)) return;
		if (
			typeof value !== "string" &&
			typeof value !== "number" &&
			typeof value !== "boolean"
		) {
			return;
		}

		setLcdControlReadout({
			label: LCD_CONTROL_LABELS[key] ?? key,
			value: formatLcdControlValue(key, value),
		});
		if (lcdReadoutTimeoutRef.current != null) {
			window.clearTimeout(lcdReadoutTimeoutRef.current);
		}
		lcdReadoutTimeoutRef.current = window.setTimeout(() => {
			setLcdControlReadout(null);
		}, 1200);
	}, []);

	const formatEnvReadout = useCallback(
		(prev: StepEnvData, next: StepEnvData) => {
			if (prev.stepCount !== next.stepCount) {
				return `STEPS ${next.stepCount}`;
			}
			if (prev.loop !== next.loop) {
				return `LOOP ${next.loop ? "ON" : "OFF"}`;
			}
			if (prev.sustainStep !== next.sustainStep) {
				return `SUS S${next.sustainStep + 1}`;
			}

			const maxSteps = Math.max(prev.steps.length, next.steps.length);
			for (let index = 0; index < maxSteps; index++) {
				const prevStep = prev.steps[index];
				const nextStep = next.steps[index];
				if (!nextStep) continue;
				if (
					!prevStep ||
					prevStep.level !== nextStep.level ||
					prevStep.rate !== nextStep.rate
				) {
					const level = Math.round(nextStep.level * 99);
					const rate = Math.round(nextStep.rate);
					return `S${index + 1} L${level} R${rate}`;
				}
			}

			const sustainIndex = Math.max(
				0,
				Math.min(next.sustainStep, next.steps.length - 1),
			);
			const sustain = next.steps[sustainIndex];
			const sustainLevel = Math.round((sustain?.level ?? 0) * 99);
			const sustainRate = Math.round(sustain?.rate ?? 0);
			return `S${sustainIndex + 1} L${sustainLevel} R${sustainRate}`;
		},
		[],
	);

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

	useEffect(() => {
		return () => {
			if (lcdReadoutTimeoutRef.current != null) {
				window.clearTimeout(lcdReadoutTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const snapshot: Record<string, string | number | boolean> = {
			warpAAmount,
			warpBAmount,
			warpAAlgo,
			warpBAlgo,
			algoBlendA,
			algoBlendB,
			intPmAmount: phaseModEnabled ? intPmAmount : 0,
			intPmRatio,
			phaseModEnabled,
			pmPre,
			windowType,
			volume,
			line1Level,
			line2Level,
			line1Octave,
			line2Octave,
			line1Detune,
			line2Detune,
			line1DcoDepth,
			line2DcoDepth,
			line1DcwComp,
			line2DcwComp,
			polyMode,
			velocityTarget,
			pitchBendRange,
			modWheelVibratoDepth,
			lineSelect,
			modMode,
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
			scopeCycles,
			scopeVerticalZoom,
			scopeTriggerLevel,
		};

		const previous = previousControlSnapshotRef.current;
		previousControlSnapshotRef.current = snapshot;
		if (!previous) return;

		const changed = Object.entries(snapshot).filter(
			([key, value]) => previous[key] !== value,
		);
		if (changed.length === 0 || changed.length > 3) return;

		const latestChange = changed[changed.length - 1];
		if (!latestChange) return;
		const [changedKey, changedValue] = latestChange;
		pushLcdControlReadout(changedKey, changedValue);
	}, [
		warpAAmount,
		warpBAmount,
		warpAAlgo,
		warpBAlgo,
		algoBlendA,
		algoBlendB,
		intPmAmount,
		intPmRatio,
		phaseModEnabled,
		pmPre,
		windowType,
		volume,
		line1Level,
		line2Level,
		line1Octave,
		line2Octave,
		line1Detune,
		line2Detune,
		line1DcoDepth,
		line2DcoDepth,
		line1DcwComp,
		line2DcwComp,
		polyMode,
		velocityTarget,
		pitchBendRange,
		modWheelVibratoDepth,
		lineSelect,
		modMode,
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
		scopeCycles,
		scopeVerticalZoom,
		scopeTriggerLevel,
		pushLcdControlReadout,
	]);

	const lcdPrimaryText = useMemo(() => {
		if (heldNote != null) {
			return `NOTE ${heldNote}  ${effectivePitchHz.toFixed(1)} HZ`;
		}
		return `PRESET ${activePresetName.toUpperCase()}`;
	}, [heldNote, effectivePitchHz, activePresetName]);

	const lcdSecondaryText = useMemo(() => {
		const filterStatus = filterEnabled ? "FILT ON" : "FILT OFF";
		return `LINE ${lineSelect} | ${polyMode.toUpperCase()} | ${filterStatus}`;
	}, [lineSelect, polyMode, filterEnabled]);

	const asidePanels: Record<AsidePanelTab, React.ReactNode> = {
		scope: (
			<ScopePanel
				oscilloscopeCanvasRef={oscilloscopeCanvasRef}
				effectivePitchHz={effectivePitchHz}
				scopeCycles={scopeCycles}
				setScopeCycles={setScopeCycles}
				scopeVerticalZoom={scopeVerticalZoom}
				setScopeVerticalZoom={setScopeVerticalZoom}
				scopeTriggerLevel={scopeTriggerLevel}
				setScopeTriggerLevel={setScopeTriggerLevel}
			/>
		),
		global: (
			<GlobalVoicePanel
				volume={volume}
				setVolume={setVolume}
				polyMode={polyMode}
				setPolyMode={setPolyMode}
				velocityTarget={velocityTarget}
				setVelocityTarget={setVelocityTarget}
				pitchBendRange={pitchBendRange}
				setPitchBendRange={setPitchBendRange}
				modWheelVibratoDepth={modWheelVibratoDepth}
				setModWheelVibratoDepth={setModWheelVibratoDepth}
			/>
		),
		phaseMod: (
			<PhaseModPanel
				phaseModEnabled={phaseModEnabled}
				setPhaseModEnabled={setPhaseModEnabled}
				intPmAmount={intPmAmount}
				setIntPmAmount={setIntPmAmount}
				intPmRatio={intPmRatio}
				setIntPmRatio={setIntPmRatio}
				pmPre={pmPre}
				setPmPre={setPmPre}
			/>
		),
		vibrato: (
			<VibratoPanel
				vibratoEnabled={vibratoEnabled}
				setVibratoEnabled={setVibratoEnabled}
				vibratoWave={vibratoWave}
				setVibratoWave={setVibratoWave}
				vibratoRate={vibratoRate}
				setVibratoRate={setVibratoRate}
				vibratoDepth={vibratoDepth}
				setVibratoDepth={setVibratoDepth}
				vibratoDelay={vibratoDelay}
				setVibratoDelay={setVibratoDelay}
			/>
		),
		portamento: (
			<PortamentoPanel
				portamentoEnabled={portamentoEnabled}
				setPortamentoEnabled={setPortamentoEnabled}
				portamentoMode={portamentoMode}
				setPortamentoMode={setPortamentoMode}
				portamentoRate={portamentoRate}
				setPortamentoRate={setPortamentoRate}
				portamentoTime={portamentoTime}
				setPortamentoTime={setPortamentoTime}
			/>
		),
		lfo: (
			<LfoPanel
				lfoEnabled={lfoEnabled}
				setLfoEnabled={setLfoEnabled}
				lfoWaveform={lfoWaveform}
				setLfoWaveform={setLfoWaveform}
				lfoRate={lfoRate}
				setLfoRate={setLfoRate}
				lfoDepth={lfoDepth}
				setLfoDepth={setLfoDepth}
				lfoOffset={lfoOffset}
				setLfoOffset={setLfoOffset}
				lfoTarget={lfoTarget}
				setLfoTarget={setLfoTarget}
			/>
		),
		filter: (
			<SynthFilterPanel
				filterEnabled={filterEnabled}
				setFilterEnabled={setFilterEnabled}
				filterType={filterType}
				setFilterType={setFilterType}
				filterCutoff={filterCutoff}
				setFilterCutoff={setFilterCutoff}
				filterResonance={filterResonance}
				setFilterResonance={setFilterResonance}
				filterEnvAmount={filterEnvAmount}
				setFilterEnvAmount={setFilterEnvAmount}
			/>
		),
		chorus: (
			<ChorusPanel
				enabled={chorusEnabled}
				setEnabled={setChorusEnabled}
				rate={chorusRate}
				setRate={setChorusRate}
				depth={chorusDepth}
				setDepth={setChorusDepth}
				mix={chorusMix}
				setMix={setChorusMix}
			/>
		),
		delay: (
			<DelayPanel
				enabled={delayEnabled}
				setEnabled={setDelayEnabled}
				time={delayTime}
				setTime={setDelayTime}
				feedback={delayFeedback}
				setFeedback={setDelayFeedback}
				mix={delayMix}
				setMix={setDelayMix}
			/>
		),
		reverb: (
			<ReverbPanel
				enabled={reverbEnabled}
				setEnabled={setReverbEnabled}
				size={reverbSize}
				setSize={setReverbSize}
				mix={reverbMix}
				setMix={setReverbMix}
			/>
		),
	};

	const waveform = useMemo(
		() =>
			computeWaveform({
				warpAAmount: effectiveWarpA,
				warpBAmount: effectiveWarpB,
				warpAAlgo,
				warpBAlgo,
				algo2A,
				algo2B,
				algoBlendA,
				algoBlendB,
				intPmAmount: phaseModEnabled ? intPmAmount : 0,
				intPmRatio,
				extPmAmount,
				pmPre,
				windowType,
				line1Level: effectiveLevelA,
				line2Level: effectiveLevelB,
			}),
		[
			effectiveWarpA,
			effectiveWarpB,
			effectiveLevelA,
			effectiveLevelB,
			warpAAlgo,
			warpBAlgo,
			algo2A,
			algo2B,
			algoBlendA,
			algoBlendB,
			phaseModEnabled,
			intPmAmount,
			intPmRatio,
			extPmAmount,
			pmPre,
			windowType,
		],
	);

	// ── Sync params to worklet ────────────────────────────────────────────────
	useEffect(() => {
		const algoA =
			PD_ALGOS.find((a) => String(a.value) === String(warpAAlgo)) ??
			PD_ALGOS[0];
		const algoB =
			PD_ALGOS.find((a) => String(a.value) === String(warpBAlgo)) ??
			PD_ALGOS[0];
		const algo2ADef = algo2A
			? (PD_ALGOS.find((a) => String(a.value) === String(algo2A)) ?? null)
			: null;
		const algo2BDef = algo2B
			? (PD_ALGOS.find((a) => String(a.value) === String(algo2B)) ?? null)
			: null;

		const params = {
			lineSelect,
			modMode,
			octave: 0,
			line1: {
				waveform: algoA.waveform,
				waveform2: algo2ADef?.waveform ?? 1,
				algo2: algo2ADef?.algo ?? null,
				algoBlend: algoBlendA,
				window: windowType,
				dcaBase: line1Level,
				dcwBase: warpAAmount,
				dcoDepth: line1DcoDepth,
				modulation: 0,
				dcwComp: line1DcwComp,
				warpAlgo: algoA.algo,
				detuneCents: line1Detune,
				octave: line1Octave,
				dcoEnv: line1DcoEnv,
				dcwEnv: line1DcwEnv,
				dcaEnv: line1DcaEnv,
				keyFollow: line1DcwKeyFollow,
			},
			line2: {
				waveform: algoB.waveform,
				waveform2: algo2BDef?.waveform ?? 1,
				algo2: algo2BDef?.algo ?? null,
				algoBlend: algoBlendB,
				window: windowType,
				dcaBase: line2Level,
				dcwBase: warpBAmount,
				dcoDepth: line2DcoDepth,
				modulation: 0,
				dcwComp: line2DcwComp,
				warpAlgo: algoB.algo,
				detuneCents: line2Detune,
				octave: line2Octave,
				dcoEnv: line2DcoEnv,
				dcwEnv: line2DcwEnv,
				dcaEnv: line2DcaEnv,
				keyFollow: line2DcwKeyFollow,
			},
			intPmAmount: phaseModEnabled ? intPmAmount : 0,
			intPmRatio,
			extPmAmount,
			pmPre,
			frequency: effectivePitchHz,
			volume,
			polyMode,
			legato,
			velocityTarget,
			chorus: {
				enabled: chorusEnabled,
				rate: chorusRate,
				depth: chorusDepth,
				mix: chorusEnabled ? chorusMix : 0,
			},
			delay: {
				enabled: delayEnabled,
				time: delayTime,
				feedback: delayFeedback,
				mix: delayEnabled ? delayMix : 0,
			},
			reverb: {
				enabled: reverbEnabled,
				size: reverbSize,
				mix: reverbEnabled ? reverbMix : 0,
			},
			vibrato: {
				enabled: vibratoEnabled,
				waveform: vibratoWave,
				rate: vibratoRate,
				depth: vibratoDepth,
				delay: vibratoDelay,
			},
			portamento: {
				enabled: portamentoEnabled,
				mode: portamentoMode,
				rate: portamentoRate,
				time: portamentoTime,
			},
			lfo: {
				enabled: lfoEnabled,
				waveform: lfoWaveform,
				rate: lfoRate,
				depth: lfoDepth,
				offset: lfoOffset,
				target: lfoTarget,
			},
			filter: {
				enabled: filterEnabled,
				type: filterType,
				cutoff: filterCutoff,
				resonance: filterResonance,
				envAmount: filterEnvAmount,
			},
			pitchBendRange,
			modWheelVibratoDepth,
		};
		paramsRef.current = params;
		if (!workletNodeRef.current) return;
		workletNodeRef.current.port.postMessage({ type: "setParams", params });
	}, [
		warpAAmount,
		warpBAmount,
		line1Level,
		line2Level,
		line1DcoDepth,
		line2DcoDepth,
		line1DcwComp,
		line2DcwComp,
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
		line2DcoEnv,
		line2DcwEnv,
		line2DcaEnv,
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
		effectivePitchHz,
		algo2A,
		algo2B,
		algoBlendA,
		algoBlendB,
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
	]);

	// ── Audio context init ────────────────────────────────────────────────────
	useEffect(() => {
		if (audioInitRef.current) return;
		audioInitRef.current = true;
		let disposed = false;
		const init = async () => {
			try {
				const ctx = new AudioContext();
				if (disposed) {
					ctx.close();
					return;
				}
				// Fetch WASM binary and JS bindings in parallel before loading worklet.
				// The worklet renders silence until it receives the "init" message.
				const [wasmResponse, bindingsResponse] = await Promise.all([
					fetch(synthWasmUrl),
					fetch(synthBindingsUrl),
				]);
				if (!wasmResponse.ok) {
					throw new Error(
						`Failed to fetch WASM (${wasmResponse.status}): ${synthWasmUrl}`,
					);
				}
				if (!bindingsResponse.ok) {
					throw new Error(
						`Failed to fetch WASM bindings (${bindingsResponse.status}): ${synthBindingsUrl}`,
					);
				}
				const [wasmBytes, bindingsJs] = await Promise.all([
					wasmResponse.arrayBuffer(),
					bindingsResponse.text(),
				]);
				await ctx.audioWorklet.addModule(pdVisualizerWorkletUrl);
				const workletNode = new AudioWorkletNode(ctx, "cosmo-processor");
				if (disposed) {
					workletNode.disconnect();
					ctx.close();
					return;
				}
				workletNode.port.onmessage = (e) => {
					if (e.data?.type === "ready") {
						workletNodeRef.current = workletNode;
						workletNode.port.postMessage({
							type: "setParams",
							params: paramsRef.current,
						});
					} else if (e.data?.type === "error") {
						console.error("[CZ Synth WASM] Worklet error:", e.data.message);
					}
				};
				// Transfer ownership of wasmBytes (zero-copy) to the worklet
				workletNode.port.postMessage({ type: "init", wasmBytes, bindingsJs }, [
					wasmBytes,
				]);
				const gainNode = ctx.createGain();
				gainNode.gain.value = 1;
				const analyserNode = new AnalyserNode(ctx, { fftSize: 2048 });
				workletNode.connect(gainNode);
				gainNode.connect(analyserNode);
				analyserNode.connect(ctx.destination);
				audioCtxRef.current = ctx;
				gainNodeRef.current = gainNode;
				analyserNodeRef.current = analyserNode;
				if (ctx.state === "suspended") await ctx.resume();
			} catch (err) {
				console.error("[PD Visualizer] Audio init failed:", err);
				audioInitRef.current = false;
			}
		};
		init();
		return () => {
			disposed = true;
			audioInitRef.current = false;
			workletNodeRef.current?.disconnect();
			workletNodeRef.current = null;
			gainNodeRef.current?.disconnect();
			gainNodeRef.current = null;
			analyserNodeRef.current?.disconnect();
			analyserNodeRef.current = null;
			audioCtxRef.current?.close();
			audioCtxRef.current = null;
		};
	}, []);

	// ── Oscilloscope animation ────────────────────────────────────────────────
	useEffect(() => {
		const canvas = oscilloscopeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;
		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
			const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
			const dpr = window.devicePixelRatio || 1;
			const pixelWidth = Math.floor(drawWidth * dpr);
			const pixelHeight = Math.floor(drawHeight * dpr);
			if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const analyser = analyserNodeRef.current;
			if (!analyser) {
				ctx.fillStyle = "#051005";
				ctx.fillRect(0, 0, drawWidth, drawHeight);
				ctx.strokeStyle = "rgba(0, 120, 0, 0.35)";
				ctx.beginPath();
				ctx.moveTo(0, drawHeight / 2);
				ctx.lineTo(drawWidth, drawHeight / 2);
				ctx.stroke();
				return;
			}
			const data = new Uint8Array(analyser.fftSize);
			analyser.getByteTimeDomainData(data);
			const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
			const hz = Math.max(1, effectivePitchHz);
			const samplesPerCycle = Math.max(8, Math.round(sampleRate / hz));
			const viewSamples = Math.max(
				32,
				Math.min(data.length - 2, Math.round(samplesPerCycle * scopeCycles)),
			);
			let start = Math.max(1, Math.floor((data.length - viewSamples) / 2));
			if (scopeTriggerMode !== "off") {
				const endLimit = data.length - viewSamples - 1;
				for (let i = 1; i < endLimit; i++) {
					const prev = data[i - 1];
					const curr = data[i];
					const riseHit = prev < scopeTriggerLevel && curr >= scopeTriggerLevel;
					const fallHit = prev > scopeTriggerLevel && curr <= scopeTriggerLevel;
					if (
						(scopeTriggerMode === "rise" && riseHit) ||
						(scopeTriggerMode === "fall" && fallHit)
					) {
						start = i;
						break;
					}
				}
			}
			let mean = 0;
			for (let i = 0; i < viewSamples; i++) mean += data[start + i];
			mean /= viewSamples;
			ctx.clearRect(0, 0, drawWidth, drawHeight);
			ctx.strokeStyle = "rgba(0, 120, 0, 0.35)";
			ctx.lineWidth = 1;
			for (let y = 0.25; y < 1; y += 0.25) {
				ctx.beginPath();
				ctx.moveTo(0, drawHeight * y);
				ctx.lineTo(drawWidth, drawHeight * y);
				ctx.stroke();
			}
			for (let x = 0.1; x < 1; x += 0.1) {
				ctx.beginPath();
				ctx.moveTo(drawWidth * x, 0);
				ctx.lineTo(drawWidth * x, drawHeight);
				ctx.stroke();
			}
			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, drawHeight / 2);
			ctx.lineTo(drawWidth, drawHeight / 2);
			ctx.stroke();
			ctx.shadowColor = "#3dff3d";
			ctx.shadowBlur = 8;
			ctx.strokeStyle = "#3dff3d";
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < viewSamples; i++) {
				const x = (i / (viewSamples - 1)) * drawWidth;
				const centered = (data[start + i] - mean) / 128;
				const y =
					drawHeight / 2 - centered * (drawHeight / 2 - 8) * scopeVerticalZoom;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
			ctx.shadowBlur = 0;
		};
		draw();
		return () => window.cancelAnimationFrame(raf);
	}, [
		effectivePitchHz,
		scopeCycles,
		scopeVerticalZoom,
		scopeTriggerMode,
		scopeTriggerLevel,
	]);

	// ── Waveform canvas draws ─────────────────────────────────────────────────
	useEffect(() => {
		if (combinedCanvasRef.current)
			drawScope(combinedCanvasRef.current, waveform.out1, waveform.out2);
		if (line1CanvasRef.current)
			drawSingleScope(line1CanvasRef.current, waveform.out1, "#2563eb");
		if (line2CanvasRef.current)
			drawSingleScope(line2CanvasRef.current, waveform.out2, "#ec4899");
		if (phaseCanvasRef.current)
			drawPhaseMap(phaseCanvasRef.current, waveform.phase);
	}, [waveform]);

	// ── Note handling ─────────────────────────────────────────────────────────
	const activeNotesRef = useRef<Set<number>>(new Set());
	// Notes released while sustain was on — need noteOff when sustain released
	const sustainedButReleasedRef = useRef<Set<number>>(new Set());

	const sendNoteOn = useCallback(
		(note: number, velocity = 100) => {
			if (activeNotesRef.current.has(note)) return;
			activeNotesRef.current.add(note);
			// In mono mode, Rust handles voice transition natively
			setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
			workletNodeRef.current?.port.postMessage({
				type: "noteOn",
				note,
				frequency: noteToFreq(note),
				velocity: velocityTarget !== "off" ? velocity / 127 : 0,
			});
		},
		[velocityTarget],
	);

	const sendNoteOff = useCallback((note: number) => {
		activeNotesRef.current.delete(note);
		setActiveNotes((prev) => prev.filter((n) => n !== note));
		if (sustainRef.current) {
			// Sustain is on: defer noteOff until sustain released
			sustainedButReleasedRef.current.add(note);
		} else {
			workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
		}
	}, []);

	const setSustain = useCallback((on: boolean) => {
		sustainRef.current = on;
		setSustainOn(on);
		workletNodeRef.current?.port.postMessage({ type: "sustain", on });
		if (!on) {
			// Sustain released: send deferred noteOffs for notes no longer held
			for (const note of sustainedButReleasedRef.current) {
				if (!activeNotesRef.current.has(note)) {
					workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
				}
			}
			sustainedButReleasedRef.current.clear();
		}
	}, []);

	const sendPitchBend = useCallback((value: number) => {
		// value: normalised [-1, 1]
		workletNodeRef.current?.port.postMessage({ type: "pitchBend", value });
	}, []);

	const sendModWheel = useCallback((value: number) => {
		// value: normalised [0, 1]
		workletNodeRef.current?.port.postMessage({ type: "modWheel", value });
	}, []);

	// ── Keyboard input ────────────────────────────────────────────────────────
	useEffect(() => {
		const isTypingTarget = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement | null)?.tagName;
			return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
		};

		const keyDown = (event: KeyboardEvent) => {
			if (isTypingTarget(event)) return;
			if (event.key === " ") {
				event.preventDefault();
				if (!sustainRef.current) setSustain(true);
				return;
			}
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			event.preventDefault();
			if (pressedPcKeysRef.current.has(key)) return;
			pressedPcKeysRef.current.add(key);
			sendNoteOn(note);
		};
		const keyUp = (event: KeyboardEvent) => {
			if (isTypingTarget(event)) return;
			if (event.key === " ") {
				setSustain(false);
				return;
			}
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			pressedPcKeysRef.current.delete(key);
			sendNoteOff(note);
		};
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		return () => {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
		};
	}, [sendNoteOff, sendNoteOn, setSustain]);

	// ── MIDI input ────────────────────────────────────────────────────────────
	useEffect(() => {
		if (!("requestMIDIAccess" in navigator) || !navigator.requestMIDIAccess)
			return;
		let disposed = false;
		const cleanupHandlers: Array<() => void> = [];
		navigator
			.requestMIDIAccess()
			.then((access) => {
				if (disposed) return;
				const bindInputs = () => {
					for (const input of access.inputs.values()) {
						const handler = (event: MIDIMessageEvent) => {
							const data = event.data;
							if (data == null || data.length < 2) return;
							const status = data[0] & 0xf0;
							// CC messages
							if (status === 0xb0) {
								if (data[1] === 1) {
									// CC1: mod wheel
									sendModWheel(data[2] / 127);
								} else if (data[1] === 64) {
									// CC64: sustain pedal
									setSustain(data[2] >= 64);
								}
								return;
							}
							// Pitch bend (0xE0) — 14-bit value in bytes 1+2
							if (status === 0xe0 && data.length >= 3) {
								const raw = (data[2] << 7) | data[1];
								sendPitchBend((raw - 8192) / 8192);
								return;
							}
							if (data.length < 3) return;
							const note = data[1];
							const velocity = data[2];
							if (status === 0x90 && velocity > 0) sendNoteOn(note, velocity);
							if (status === 0x80 || (status === 0x90 && velocity === 0))
								sendNoteOff(note);
						};
						input.onmidimessage = handler;
						cleanupHandlers.push(() => {
							input.onmidimessage = null;
						});
					}
				};
				bindInputs();
				access.onstatechange = () => {
					cleanupHandlers.splice(0).forEach((fn) => void fn());
					bindInputs();
				};
				cleanupHandlers.push(() => {
					access.onstatechange = null;
				});
			})
			.catch(() => {});
		return () => {
			disposed = true;
			cleanupHandlers.forEach((fn) => void fn());
		};
	}, [sendNoteOff, sendNoteOn, setSustain, sendPitchBend, sendModWheel]);

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<SynthPageFrame
			className="h-full min-h-0 min-w-0 bg-cz-panel flex flex-col overflow-hidden w-full"
			headerProps={{
				allEntries: allPresetEntries,
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
		>
			<div className="px-1 grid flex-1 min-h-0 min-w-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
				<aside className="overflow-y-auto min-h-0 space-y-0 [scrollbar-gutter:stable]">
					<div className="px-4 -mt-1 mx-auto">
						<SynthLcdDisplay
							primaryText={lcdPrimaryText}
							secondaryText={lcdSecondaryText}
							transientReadout={lcdControlReadout}
						/>
					</div>

					<AsidePanelSwitcher
						tabs={ASIDE_PANEL_TABS}
						activeTab={activeAsidePanel}
						onTabChange={setActiveAsidePanel}
						tabEnabledState={{
							phaseMod: phaseModEnabled,
							vibrato: vibratoEnabled,
							portamento: portamentoEnabled,
							lfo: lfoEnabled,
							filter: filterEnabled,
							chorus: chorusEnabled,
							delay: delayEnabled,
							reverb: reverbEnabled,
						}}
						panels={asidePanels}
					/>
				</aside>

				<main className="flex flex-col gap-4 p-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
					<div className="mb-3 shrink-0 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-cz-cream pb-3">
						<div className="shrink-0">
							<div className="mb-1 cz-light-blue">Line Select</div>
							<div className="grid grid-cols-5 gap-1">
								{(["L1", "L1+L2", "L2", "L1+L1'", "L1+L2'"] as const).map(
									(ls) => (
										<CzButton
											key={ls}
											active={lineSelect === ls}
											onClick={() => setLineSelect(ls)}
										>
											{ls}
										</CzButton>
									),
								)}
							</div>
						</div>
						<div className="shrink-0">
							<div className="mb-1 cz-light-blue">Modulation</div>
							<div className="flex gap-1">
								{(
									[
										["normal", "Normal"],
										["ring", "Ring"],
										["noise", "Noise"],
									] as const
								).map(([mode, label]) => (
									<CzButton
										key={mode}
										active={modMode === mode}
										onClick={() => setModMode(mode)}
										className="flex-1"
									>
										{label}
									</CzButton>
								))}
							</div>
						</div>

						<SingleCycleDisplay
							data={
								activePhaseLineTab === "line1" ? waveform.out1 : waveform.out2
							}
							color="#9cb937"
							label="Single Cycle"
							width={176}
							height={64}
						/>
					</div>

					<PhaseLinesSection
						className="flex-1 min-h-0 max-w-5xl max-h-164"
						lineSelect={lineSelect}
						onActiveTabChange={setActivePhaseLineTab}
						line1={{
							warpAmount: warpAAmount,
							setWarpAmount: setWarpAAmount,
							algo: warpAAlgo,
							setAlgo: setWarpAAlgo,
							algo2: algo2A,
							setAlgo2: setAlgo2A,
							algoBlend: algoBlendA,
							setAlgoBlend: setAlgoBlendA,
							dcwComp: line1DcwComp,
							setDcwComp: setLine1DcwComp,
							level: line1Level,
							setLevel: setLine1Level,
							octave: line1Octave,
							setOctave: setLine1Octave,
							fineDetune: line1Detune,
							setFineDetune: setLine1Detune,
							dcoDepth: line1DcoDepth,
							setDcoDepth: setLine1DcoDepth,
							dcoEnv: line1DcoEnv,
							setDcoEnv: handleLine1DcoEnvChange,
							dcwEnv: line1DcwEnv,
							setDcwEnv: handleLine1DcwEnvChange,
							dcaEnv: line1DcaEnv,
							setDcaEnv: handleLine1DcaEnvChange,
							keyFollow: line1DcwKeyFollow,
							setKeyFollow: setLine1DcwKeyFollow,
							waveform: waveform.out1,
						}}
						line2={{
							warpAmount: warpBAmount,
							setWarpAmount: setWarpBAmount,
							algo: warpBAlgo,
							setAlgo: setWarpBAlgo,
							algo2: algo2B,
							setAlgo2: setAlgo2B,
							algoBlend: algoBlendB,
							setAlgoBlend: setAlgoBlendB,
							dcwComp: line2DcwComp,
							setDcwComp: setLine2DcwComp,
							level: line2Level,
							setLevel: setLine2Level,
							octave: line2Octave,
							setOctave: setLine2Octave,
							fineDetune: line2Detune,
							setFineDetune: setLine2Detune,
							dcoDepth: line2DcoDepth,
							setDcoDepth: setLine2DcoDepth,
							dcoEnv: line2DcoEnv,
							setDcoEnv: handleLine2DcoEnvChange,
							dcwEnv: line2DcwEnv,
							setDcwEnv: handleLine2DcwEnvChange,
							dcaEnv: line2DcaEnv,
							setDcaEnv: handleLine2DcaEnvChange,
							keyFollow: line2DcwKeyFollow,
							setKeyFollow: setLine2DcwKeyFollow,
							waveform: waveform.out2,
						}}
					/>
				</main>
			</div>
		</SynthPageFrame>
	);
}
