import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeCzPatch } from "@/lib/midi/czSysexDecoder";
import { fetchPresetData, type Preset } from "@/lib/presets/presetManager";
import { convertDecodedPatchToSynthPreset } from "@/lib/synth/czPresetConverter";
import { DEFAULT_SYNTH_PRESETS } from "@/lib/synth/defaultPresets";
import { pdVisualizerWorkletUrl } from "@/lib/synth/pdVisualizerWorkletUrl";
import {
	DEFAULT_PRESET,
	deletePreset,
	exportPreset,
	importPreset,
	listPresets,
	loadCurrentState,
	loadPreset,
	renamePreset,
	type SynthPresetData,
	saveCurrentState,
	savePreset,
} from "@/lib/synth/presetStorage";
import {
	computeWaveform,
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	noteToFreq,
	PC_KEY_TO_NOTE,
	PD_ALGOS,
	type PdAlgo,
	type StepEnvData,
} from "./pdAlgorithms";
import { drawPhaseMap, drawScope, drawSingleScope } from "./pdCanvas";
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
import SynthHeader from "./synth/SynthHeader";
import VibratoPanel from "./synth/VibratoPanel";

type PolyMode = "poly8" | "mono";
type VelocityTarget = "amp" | "dcw" | "both" | "off";

const ACCORDION_NAME = "synth-aside-accordion";

export default function PhaseDistortionVisualizer() {
	const [warpAAmount, setWarpAAmount] = useState(0);
	const [warpBAmount, setWarpBAmount] = useState(0);
	const [warpAAlgo, setWarpAAlgo] = useState<PdAlgo>("bend");
	const [warpBAlgo, setWarpBAlgo] = useState<PdAlgo>("bend");
	const [algo2A, setAlgo2A] = useState<PdAlgo | null>(null);
	const [algo2B, setAlgo2B] = useState<PdAlgo | null>(null);
	const [algoBlendA, setAlgoBlendA] = useState(0);
	const [algoBlendB, setAlgoBlendB] = useState(0);
	const [intPmAmount, setIntPmAmount] = useState(0);
	const [intPmRatio, setIntPmRatio] = useState(1);
	const [extPmAmount] = useState(0);
	const [pmPre, setPmPre] = useState(true);
	const [windowType, setWindowType] = useState<"off" | "saw" | "triangle">(
		"off",
	);
	const [volume, setVolume] = useState(1);
	const [line1Level, setLine1Level] = useState(1);
	const [line2Level, setLine2Level] = useState(1);
	const [line1Octave, setLine1Octave] = useState(0);
	const [line2Octave, setLine2Octave] = useState(0);
	const [line1Detune, setLine1Detune] = useState(0);
	const [line2Detune, setLine2Detune] = useState(0);
	const [polyMode, setPolyMode] = useState<PolyMode>("poly8");
	const [legato, setLegato] = useState(false);
	const [sustainOn, setSustainOn] = useState(false);
	const [velocityTarget, setVelocityTarget] = useState<VelocityTarget>("amp");
	const [activeNotes, setActiveNotes] = useState<number[]>([]);
	const [line1DcoEnv, setLine1DcoEnv] = useState<StepEnvData>(DEFAULT_DCO_ENV);
	const [line1DcwEnv, setLine1DcwEnv] = useState<StepEnvData>(DEFAULT_DCW_ENV);
	const [line1DcaEnv, setLine1DcaEnv] = useState<StepEnvData>(DEFAULT_DCA_ENV);
	const [line2DcoEnv, setLine2DcoEnv] = useState<StepEnvData>(DEFAULT_DCO_ENV);
	const [line2DcwEnv, setLine2DcwEnv] = useState<StepEnvData>(DEFAULT_DCW_ENV);
	const [line2DcaEnv, setLine2DcaEnv] = useState<StepEnvData>(DEFAULT_DCA_ENV);
	const [line1DcoDepth, setLine1DcoDepth] = useState(0);
	const [line2DcoDepth, setLine2DcoDepth] = useState(0);
	const [line1DcwComp, setLine1DcwComp] = useState(0);
	const [line2DcwComp, setLine2DcwComp] = useState(0);
	const [scopeCycles, setScopeCycles] = useState(2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(1.0);
	const [scopeTriggerMode] = useState<"off" | "rise" | "fall">("rise");
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(128);

	const [chorusRate, setChorusRate] = useState(0.8);
	const [chorusDepth, setChorusDepth] = useState(3);
	const [chorusMix, setChorusMix] = useState(0);
	const [delayTime, setDelayTime] = useState(0.3);
	const [delayFeedback, setDelayFeedback] = useState(0.35);
	const [delayMix, setDelayMix] = useState(0);
	const [reverbSize, setReverbSize] = useState(0.5);
	const [reverbMix, setReverbMix] = useState(0);

	const [lineSelect, setLineSelect] = useState<
		"L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'"
	>("L1+L2");
	const [modMode, setModMode] = useState<"normal" | "ring" | "noise">("normal");
	const [line1DcwKeyFollow, setLine1DcwKeyFollow] = useState(0);
	const [line1DcaKeyFollow, setLine1DcaKeyFollow] = useState(0);
	const [line2DcwKeyFollow, setLine2DcwKeyFollow] = useState(0);
	const [line2DcaKeyFollow, setLine2DcaKeyFollow] = useState(0);

	const [vibratoEnabled, setVibratoEnabled] = useState(false);
	const [vibratoWave, setVibratoWave] = useState(1);
	const [vibratoRate, setVibratoRate] = useState(30);
	const [vibratoDepth, setVibratoDepth] = useState(30);
	const [vibratoDelay, setVibratoDelay] = useState(0);

	const [portamentoEnabled, setPortamentoEnabled] = useState(false);
	const [portamentoMode, setPortamentoMode] = useState<"rate" | "time">("rate");
	const [portamentoRate, setPortamentoRate] = useState(50);
	const [portamentoTime, setPortamentoTime] = useState(0.5);

	const [lfoEnabled, setLfoEnabled] = useState(false);
	const [lfoWaveform, setLfoWaveform] = useState<
		"sine" | "triangle" | "square" | "saw"
	>("sine");
	const [lfoRate, setLfoRate] = useState(5);
	const [lfoDepth, setLfoDepth] = useState(0);
	const [lfoTarget, setLfoTarget] = useState<
		"pitch" | "dcw" | "dca" | "filter"
	>("pitch");

	const [filterEnabled, setFilterEnabled] = useState(false);
	const [filterType, setFilterType] = useState<"lp" | "hp" | "bp">("lp");
	const [filterCutoff, setFilterCutoff] = useState(5000);
	const [filterResonance, setFilterResonance] = useState(0);
	const [filterEnvAmount, setFilterEnvAmount] = useState(0);

	const [presetList, setPresetList] = useState<string[]>([]);
	const [activePresetName, setActivePresetName] = useState("Current State");

	const gatherState = useCallback(
		(): SynthPresetData => ({
			warpAAmount,
			warpBAmount,
			warpAAlgo,
			warpBAlgo,
			algo2A: algo2A ?? null,
			algo2B: algo2B ?? null,
			algoBlendA,
			algoBlendB,
			intPmAmount,
			intPmRatio,
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
			chorusMix,
			delayTime,
			delayFeedback,
			delayMix,
			reverbSize,
			reverbMix,
			lineSelect,
			modMode,
			line1DcwKeyFollow,
			line1DcaKeyFollow,
			line2DcwKeyFollow,
			line2DcaKeyFollow,
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
			lfoTarget,
			filterEnabled,
			filterType,
			filterCutoff,
			filterResonance,
			filterEnvAmount,
		}),
		[
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
			chorusMix,
			delayTime,
			delayFeedback,
			delayMix,
			reverbSize,
			reverbMix,
			lineSelect,
			modMode,
			line1DcwKeyFollow,
			line1DcaKeyFollow,
			line2DcwKeyFollow,
			line2DcaKeyFollow,
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
			lfoTarget,
			filterEnabled,
			filterType,
			filterCutoff,
			filterResonance,
			filterEnvAmount,
		],
	);

	const applyPreset = useCallback((data: SynthPresetData) => {
		const safe = (v: unknown, fallback: number) =>
			typeof v === "number" && !Number.isNaN(v) ? v : fallback;

		setWarpAAmount(safe(data.warpAAmount, 0));
		setWarpBAmount(safe(data.warpBAmount, 0));
		setWarpAAlgo(data.warpAAlgo as PdAlgo);
		setWarpBAlgo(data.warpBAlgo as PdAlgo);
		setAlgo2A(data.algo2A as PdAlgo | null);
		setAlgo2B(data.algo2B as PdAlgo | null);
		setAlgoBlendA(safe(data.algoBlendA, 0));
		setAlgoBlendB(safe(data.algoBlendB, 0));
		setIntPmAmount(safe(data.intPmAmount, 0));
		setIntPmRatio(safe(data.intPmRatio, 1));
		setPmPre(data.pmPre ?? true);
		setWindowType((data.windowType as "off" | "saw" | "triangle") ?? "off");
		setVolume(safe(data.volume, 1));
		setLine1Level(safe(data.line1Level, 1));
		setLine2Level(safe(data.line2Level, 1));
		setLine1Octave(safe(data.line1Octave, 0));
		setLine2Octave(safe(data.line2Octave, 0));
		setLine1Detune(safe(data.line1Detune, 0));
		setLine2Detune(safe(data.line2Detune, 0));
		setLine1DcoDepth(safe(data.line1DcoDepth, 0));
		setLine2DcoDepth(safe(data.line2DcoDepth, 0));
		setLine1DcwComp(safe(data.line1DcwComp, 0));
		setLine2DcwComp(safe(data.line2DcwComp, 0));
		setLine1DcoEnv(data.line1DcoEnv);
		setLine1DcwEnv(data.line1DcwEnv);
		setLine1DcaEnv(data.line1DcaEnv);
		setLine2DcoEnv(data.line2DcoEnv);
		setLine2DcwEnv(data.line2DcwEnv);
		setLine2DcaEnv(data.line2DcaEnv);
		setPolyMode((data.polyMode as PolyMode) ?? "poly8");
		setLegato(data.legato ?? false);
		setVelocityTarget((data.velocityTarget as VelocityTarget) ?? "amp");
		setChorusRate(safe(data.chorusRate, 0.8));
		setChorusDepth(safe(data.chorusDepth, 3));
		setChorusMix(safe(data.chorusMix, 0));
		setDelayTime(safe(data.delayTime, 0.3));
		setDelayFeedback(safe(data.delayFeedback, 0.35));
		setDelayMix(safe(data.delayMix, 0));
		setReverbSize(safe(data.reverbSize, 0.5));
		setReverbMix(safe(data.reverbMix, 0));
		setLineSelect(data.lineSelect ?? "L1+L2");
		setModMode((data.modMode as "normal" | "ring" | "noise") ?? "normal");
		setLine1DcwKeyFollow(safe(data.line1DcwKeyFollow, 0));
		setLine1DcaKeyFollow(safe(data.line1DcaKeyFollow, 0));
		setLine2DcwKeyFollow(safe(data.line2DcwKeyFollow, 0));
		setLine2DcaKeyFollow(safe(data.line2DcaKeyFollow, 0));
		setVibratoEnabled(data.vibratoEnabled ?? false);
		setVibratoWave(safe(data.vibratoWave, 1) as 1 | 2 | 3 | 4);
		setVibratoRate(safe(data.vibratoRate, 30));
		setVibratoDepth(safe(data.vibratoDepth, 30));
		setVibratoDelay(safe(data.vibratoDelay, 0));
		setPortamentoEnabled(data.portamentoEnabled ?? false);
		setPortamentoMode((data.portamentoMode as "rate" | "time") ?? "rate");
		setPortamentoRate(safe(data.portamentoRate, 50));
		setPortamentoTime(safe(data.portamentoTime, 0.5));
		setLfoEnabled(data.lfoEnabled ?? false);
		setLfoWaveform(
			(data.lfoWaveform as "sine" | "triangle" | "square" | "saw") ?? "sine",
		);
		setLfoRate(safe(data.lfoRate, 5));
		setLfoDepth(safe(data.lfoDepth, 0));
		setLfoTarget(
			(data.lfoTarget as "pitch" | "dcw" | "dca" | "filter") ?? "pitch",
		);
		setFilterEnabled(data.filterEnabled ?? false);
		setFilterType((data.filterType as "lp" | "hp" | "bp") ?? "lp");
		setFilterCutoff(safe(data.filterCutoff, 5000));
		setFilterResonance(safe(data.filterResonance, 0));
		setFilterEnvAmount(safe(data.filterEnvAmount, 0));
	}, []);

	const { data: libraryPresets = [] } = useQuery({
		queryKey: ["presets", "lab-library"],
		queryFn: async () => {
			const result = await fetchPresetData(
				0,
				500,
				[],
				"",
				[],
				"inclusive",
				false,
				false,
				0,
				false,
				false,
			);
			return result.presets;
		},
		staleTime: 30000,
	});

	const handleLoadLibraryPreset = useCallback(
		(preset: Preset) => {
			if (preset.sysexData) {
				const decoded = decodeCzPatch(preset.sysexData);
				if (decoded) {
					const synthPreset = convertDecodedPatchToSynthPreset(decoded);
					applyPreset(synthPreset);
					setActivePresetName(preset.name);
				}
			}
		},
		[applyPreset],
	);

	const allPresetEntries = useMemo(
		() => [
			...Object.keys(DEFAULT_SYNTH_PRESETS).map((name) => ({
				id: `builtin:${name}`,
				label: name,
				type: "builtin" as const,
			})),
			...presetList.map((name) => ({
				id: `local:${name}`,
				label: name,
				type: "local" as const,
			})),
			...libraryPresets.map((preset) => ({
				id: `library:${preset.id}`,
				label: preset.name,
				type: "library" as const,
				preset,
			})),
		],
		[presetList, libraryPresets],
	);

	const activePresetIndex = useMemo(
		() => allPresetEntries.findIndex((e) => e.label === activePresetName),
		[activePresetName, allPresetEntries],
	);

	const handleLoadLocal = useCallback(
		(name: string) => {
			const data = loadPreset(name);
			if (!data) return;
			applyPreset(data);
			setActivePresetName(name);
		},
		[applyPreset],
	);

	const handleLoadBuiltin = useCallback(
		(name: string) => {
			const data = DEFAULT_SYNTH_PRESETS[name];
			if (!data) return;
			applyPreset(data);
			setActivePresetName(name);
		},
		[applyPreset],
	);

	const handleStepPreset = useCallback(
		(direction: -1 | 1) => {
			if (allPresetEntries.length === 0) return;
			const base = activePresetIndex >= 0 ? activePresetIndex : 0;
			const next =
				(base + direction + allPresetEntries.length) % allPresetEntries.length;
			const entry = allPresetEntries[next];
			if (!entry) return;
			if (entry.type === "local") {
				handleLoadLocal(entry.label);
			} else if (entry.type === "builtin") {
				handleLoadBuiltin(entry.label);
			} else if (
				entry.type === "library" &&
				"preset" in entry &&
				entry.preset
			) {
				handleLoadLibraryPreset(entry.preset);
			}
		},
		[
			activePresetIndex,
			allPresetEntries,
			handleLoadLocal,
			handleLoadBuiltin,
			handleLoadLibraryPreset,
		],
	);

	const handleSavePreset = useCallback(
		(name: string) => {
			savePreset(name, gatherState());
			setPresetList(listPresets());
			setActivePresetName(name);
		},
		[gatherState],
	);

	const handleDeletePreset = useCallback((name: string) => {
		deletePreset(name);
		setPresetList(listPresets());
		setActivePresetName((prev) => (prev === name ? "Current State" : prev));
	}, []);

	const handleRenamePreset = useCallback((oldName: string, newName: string) => {
		const trimmed = newName.trim();
		if (!trimmed || trimmed === oldName) return;
		renamePreset(oldName, trimmed);
		setPresetList(listPresets());
		setActivePresetName((prev) => (prev === oldName ? trimmed : prev));
	}, []);

	const handleInitPreset = useCallback(() => {
		applyPreset(DEFAULT_PRESET);
		setActivePresetName("Current State");
	}, [applyPreset]);

	const handleExportPreset = useCallback((name: string) => {
		const json = exportPreset(name);
		if (!json) return;
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${name}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	const handleImportPreset = useCallback(
		(json: string, filename: string) => {
			const data = importPreset(json);
			if (!data) return;
			// Use the filename as the preset name (already stripped of .json by PresetNavigator)
			const name = filename.trim() || "imported";
			// avoid collisions
			const existing = listPresets();
			let candidate = name;
			let n = 2;
			while (existing.includes(candidate)) {
				candidate = `${name} ${n++}`;
			}
			savePreset(candidate, data);
			setPresetList(listPresets());
			applyPreset(data);
			setActivePresetName(candidate);
		},
		[applyPreset],
	);

	const handleExportCurrentState = useCallback(
		(name: string) => {
			const state = gatherState();
			const json = JSON.stringify({ _name: name, ...state }, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${name}.json`;
			a.click();
			URL.revokeObjectURL(url);
		},
		[gatherState],
	);

	const copyLineSettings = useCallback(
		(
			source: "a" | "b",
			target: "a" | "b",
			mode: "algos" | "envelopes" | "full",
		) => {
			const src =
				source === "a"
					? {
							warpAmount: warpAAmount,
							algo: warpAAlgo,
							algo2: algo2A,
							algoBlend: algoBlendA,
							dcwComp: line1DcwComp,
							level: line1Level,
							octave: line1Octave,
							fineDetune: line1Detune,
							dcoDepth: line1DcoDepth,
							dcoEnv: line1DcoEnv,
							dcwEnv: line1DcwEnv,
							dcaEnv: line1DcaEnv,
						}
					: {
							warpAmount: warpBAmount,
							algo: warpBAlgo,
							algo2: algo2B,
							algoBlend: algoBlendB,
							dcwComp: line2DcwComp,
							level: line2Level,
							octave: line2Octave,
							fineDetune: line2Detune,
							dcoDepth: line2DcoDepth,
							dcoEnv: line2DcoEnv,
							dcwEnv: line2DcwEnv,
							dcaEnv: line2DcaEnv,
						};

			if (target === "a") {
				if (mode === "algos" || mode === "full") {
					setWarpAAlgo(src.algo);
					setAlgo2A(src.algo2);
					setAlgoBlendA(src.algoBlend);
					setWarpAAmount(src.warpAmount);
				}
				if (mode === "envelopes" || mode === "full") {
					setLine1DcoEnv(src.dcoEnv);
					setLine1DcwEnv(src.dcwEnv);
					setLine1DcaEnv(src.dcaEnv);
				}
				if (mode === "full") {
					setLine1DcwComp(src.dcwComp);
					setLine1Level(src.level);
					setLine1Octave(src.octave);
					setLine1Detune(src.fineDetune);
					setLine1DcoDepth(src.dcoDepth);
				}
			} else {
				if (mode === "algos" || mode === "full") {
					setWarpBAlgo(src.algo);
					setAlgo2B(src.algo2);
					setAlgoBlendB(src.algoBlend);
					setWarpBAmount(src.warpAmount);
				}
				if (mode === "envelopes" || mode === "full") {
					setLine2DcoEnv(src.dcoEnv);
					setLine2DcwEnv(src.dcwEnv);
					setLine2DcaEnv(src.dcaEnv);
				}
				if (mode === "full") {
					setLine2DcwComp(src.dcwComp);
					setLine2Level(src.level);
					setLine2Octave(src.octave);
					setLine2Detune(src.fineDetune);
					setLine2DcoDepth(src.dcoDepth);
				}
			}
		},
		[
			algo2A,
			algo2B,
			algoBlendA,
			algoBlendB,
			line1DcaEnv,
			line1DcoDepth,
			line1DcoEnv,
			line1DcwComp,
			line1DcwEnv,
			line1Detune,
			line1Level,
			line1Octave,
			line2DcaEnv,
			line2DcoDepth,
			line2DcoEnv,
			line2DcwComp,
			line2DcwEnv,
			line2Detune,
			line2Level,
			line2Octave,
			warpAAlgo,
			warpAAmount,
			warpBAlgo,
			warpBAmount,
		],
	);

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
				intPmAmount,
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
			intPmAmount,
			intPmRatio,
			extPmAmount,
			pmPre,
			frequency: effectivePitchHz,
			volume,
			polyMode,
			legato,
			velocityTarget,
			chorus: { rate: chorusRate, depth: chorusDepth / 1000, mix: chorusMix },
			delay: { time: delayTime, feedback: delayFeedback, mix: delayMix },
			reverb: { size: reverbSize, mix: reverbMix },
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
				target: lfoTarget,
			},
			filter: {
				enabled: filterEnabled,
				type: filterType,
				cutoff: filterCutoff,
				resonance: filterResonance,
				envAmount: filterEnvAmount,
			},
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
		chorusMix,
		delayTime,
		delayFeedback,
		delayMix,
		reverbSize,
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
		lfoTarget,
		filterEnabled,
		filterType,
		filterCutoff,
		filterResonance,
		filterEnvAmount,
	]);

	// ── Auto-save ─────────────────────────────────────────────────────────────
	useEffect(() => {
		const timer = setTimeout(() => {
			saveCurrentState(gatherState());
		}, 500);
		return () => clearTimeout(timer);
	}, [gatherState]);

	// ── Load saved state on mount ─────────────────────────────────────────────
	useEffect(() => {
		setPresetList(listPresets());
		const saved = loadCurrentState();
		if (saved) applyPreset(saved);
	}, [applyPreset]);

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
					fetch("/cz-synth-wasm/cz_synth_bg.wasm"),
					fetch("/cz-synth-wasm/cz_synth.js"),
				]);
				const [wasmBytes, bindingsJs] = await Promise.all([
					wasmResponse.arrayBuffer(),
					bindingsResponse.text(),
				]);
				await ctx.audioWorklet.addModule(pdVisualizerWorkletUrl);
				const workletNode = new AudioWorkletNode(ctx, "cz101-processor");
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
	const monoNoteRef = useRef<number | null>(null);

	const sendNoteOn = useCallback(
		(note: number, velocity = 100) => {
			if (activeNotesRef.current.has(note)) return;
			const isMono = polyMode === "mono";
			const prevMonoNote = monoNoteRef.current;
			if (isMono && prevMonoNote != null) {
				activeNotesRef.current.delete(prevMonoNote);
				workletNodeRef.current?.port.postMessage({
					type: "noteOff",
					note: prevMonoNote,
				});
			}
			activeNotesRef.current.add(note);
			monoNoteRef.current = note;
			setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
			workletNodeRef.current?.port.postMessage({
				type: "noteOn",
				note,
				frequency: noteToFreq(note),
				velocity: velocityTarget !== "off" ? velocity / 127 : 0,
			});
		},
		[polyMode, velocityTarget],
	);

	const sendNoteOff = useCallback(
		(note: number) => {
			if (polyMode === "mono" && monoNoteRef.current === note)
				monoNoteRef.current = null;
			activeNotesRef.current.delete(note);
			setActiveNotes((prev) => prev.filter((n) => n !== note));
			if (!sustainRef.current) {
				workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
			}
		},
		[polyMode],
	);

	const setSustain = useCallback((on: boolean) => {
		sustainRef.current = on;
		setSustainOn(on);
		workletNodeRef.current?.port.postMessage({ type: "sustain", on });
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
							if (status === 0xb0 && data[1] === 64) {
								setSustain(data[2] >= 64);
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
	}, [sendNoteOff, sendNoteOn, setSustain]);

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<div className="h-full bg-cz-body flex flex-col overflow-hidden gap-4 w-full">
			<SynthHeader
				allEntries={allPresetEntries}
				activePresetName={activePresetName}
				onLoadLocal={handleLoadLocal}
				onLoadLibrary={handleLoadLibraryPreset}
				onLoadBuiltin={handleLoadBuiltin}
				onStepPreset={handleStepPreset}
				onSavePreset={handleSavePreset}
				onDeletePreset={handleDeletePreset}
				onRenamePreset={handleRenamePreset}
				onInitPreset={handleInitPreset}
				onExportPreset={handleExportPreset}
				onExportCurrentState={handleExportCurrentState}
				onImportPreset={handleImportPreset}
			/>

			<div className="px-4 md:px-6 grid flex-1 min-h-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)]">
				<aside className="overflow-y-auto min-h-0 pb-4 space-y-0 [scrollbar-gutter:stable]">
					{/* Scope — independently collapsible */}
					<ScopePanel
						oscilloscopeCanvasRef={oscilloscopeCanvasRef}
						effectivePitchHz={effectivePitchHz}
						scopeCycles={scopeCycles}
						setScopeCycles={setScopeCycles}
						scopeVerticalZoom={scopeVerticalZoom}
						setScopeVerticalZoom={setScopeVerticalZoom}
						scopeTriggerLevel={scopeTriggerLevel}
						setScopeTriggerLevel={setScopeTriggerLevel}
						open={true}
					/>

					<div className="divider"></div>
					{/* Accordion — only one panel open at a time */}
					<GlobalVoicePanel
						accordionName={ACCORDION_NAME}
						defaultOpen={true}
						volume={volume}
						setVolume={setVolume}
						polyMode={polyMode}
						setPolyMode={setPolyMode}
						legato={legato}
						setLegato={setLegato}
						sustainOn={sustainOn}
						onSustainToggle={() => setSustain(!sustainOn)}
						velocityTarget={velocityTarget}
						setVelocityTarget={setVelocityTarget}
						windowType={windowType}
						setWindowType={setWindowType}
					/>
					<PhaseModPanel
						accordionName={ACCORDION_NAME}
						intPmAmount={intPmAmount}
						setIntPmAmount={setIntPmAmount}
						intPmRatio={intPmRatio}
						setIntPmRatio={setIntPmRatio}
						pmPre={pmPre}
						setPmPre={setPmPre}
					/>
					<VibratoPanel
						accordionName={ACCORDION_NAME}
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
					<PortamentoPanel
						accordionName={ACCORDION_NAME}
						portamentoEnabled={portamentoEnabled}
						setPortamentoEnabled={setPortamentoEnabled}
						portamentoMode={portamentoMode}
						setPortamentoMode={setPortamentoMode}
						portamentoRate={portamentoRate}
						setPortamentoRate={setPortamentoRate}
						portamentoTime={portamentoTime}
						setPortamentoTime={setPortamentoTime}
					/>
					<LfoPanel
						accordionName={ACCORDION_NAME}
						lfoEnabled={lfoEnabled}
						setLfoEnabled={setLfoEnabled}
						lfoWaveform={lfoWaveform}
						setLfoWaveform={setLfoWaveform}
						lfoRate={lfoRate}
						setLfoRate={setLfoRate}
						lfoDepth={lfoDepth}
						setLfoDepth={setLfoDepth}
						lfoTarget={lfoTarget}
						setLfoTarget={setLfoTarget}
					/>
					<SynthFilterPanel
						accordionName={ACCORDION_NAME}
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
					<ChorusPanel
						accordionName={ACCORDION_NAME}
						rate={chorusRate}
						setRate={setChorusRate}
						depth={chorusDepth}
						setDepth={setChorusDepth}
						mix={chorusMix}
						setMix={setChorusMix}
					/>
					<DelayPanel
						accordionName={ACCORDION_NAME}
						time={delayTime}
						setTime={setDelayTime}
						feedback={delayFeedback}
						setFeedback={setDelayFeedback}
						mix={delayMix}
						setMix={setDelayMix}
					/>
					<ReverbPanel
						accordionName={ACCORDION_NAME}
						size={reverbSize}
						setSize={setReverbSize}
						mix={reverbMix}
						setMix={setReverbMix}
					/>
				</aside>

				<main className="space-y-4 p-1 pb-4 overflow-y-auto min-h-0">
					<PhaseLinesSection
						lineSelect={lineSelect}
						setLineSelect={setLineSelect}
						modMode={modMode}
						setModMode={setModMode}
						combinedCanvasRef={combinedCanvasRef}
						phaseCanvasRef={phaseCanvasRef}
						onCopyLine1ToLine2={(mode) => copyLineSettings("a", "b", mode)}
						onCopyLine2ToLine1={(mode) => copyLineSettings("b", "a", mode)}
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
							setDcoEnv: setLine1DcoEnv,
							dcwEnv: line1DcwEnv,
							setDcwEnv: setLine1DcwEnv,
							dcaEnv: line1DcaEnv,
							setDcaEnv: setLine1DcaEnv,
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
							setDcoEnv: setLine2DcoEnv,
							dcwEnv: line2DcwEnv,
							setDcwEnv: setLine2DcwEnv,
							dcaEnv: line2DcaEnv,
							setDcaEnv: setLine2DcaEnv,
							keyFollow: line2DcwKeyFollow,
							setKeyFollow: setLine2DcwKeyFollow,
							waveform: waveform.out2,
						}}
					/>
				</main>
			</div>
		</div>
	);
}
