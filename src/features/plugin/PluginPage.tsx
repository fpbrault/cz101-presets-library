/**
 * PluginPage — CZ-101 synth UI for the AU/VST3 plugin WebView.
 *
 * Differences from PhaseDistortionVisualizer:
 * - No AudioContext / AudioWorklet (DSP is in the Rust plugin)
 * - ScopePanel is rendered but canvas shows static (no live audio analyser)
 * - Preset management via localStorage (works in wry WebView)
 * - No library preset loading (no Tauri IPC or IndexedDB)
 * - Parameter changes are sent to Rust via window.ipc (wry IPC)
 * - Rust pushes param updates back via window.__czOnParams(jsonString)
 * - UI scale selector (50–100%) persisted in localStorage
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	computeWaveform,
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	PD_ALGOS,
	type PdAlgo,
	type StepEnvData,
} from "@/components/pdAlgorithms";
import {
	drawPhaseMap,
	drawScope,
	drawSingleScope,
} from "@/components/pdCanvas";
import ChorusPanel from "@/components/synth/ChorusPanel";
import DelayPanel from "@/components/synth/DelayPanel";
import GlobalVoicePanel from "@/components/synth/GlobalVoicePanel";
import LfoPanel from "@/components/synth/LfoPanel";
import PhaseLinesSection from "@/components/synth/PhaseLinesSection";
import PhaseModPanel from "@/components/synth/PhaseModPanel";
import PortamentoPanel from "@/components/synth/PortamentoPanel";
import type { PresetEntry } from "@/components/synth/PresetNavigator";
import ReverbPanel from "@/components/synth/ReverbPanel";
import ScopePanel from "@/components/synth/ScopePanel";
import SynthFilterPanel from "@/components/synth/SynthFilterPanel";
import SynthHeader from "@/components/synth/SynthHeader";
import VibratoPanel from "@/components/synth/VibratoPanel";
import { DEFAULT_SYNTH_PRESETS } from "@/lib/synth/defaultPresets";
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

// ── Param IDs (must match Rust PARAM_TABLE in lib.rs) ────────────────────────
const P_VOLUME = 0;
const P_OCTAVE = 1;
const P_LINE_SELECT = 2;
const P_MOD_MODE = 3;
const P_POLY_MODE = 4;
const P_LEGATO = 5;
const P_VEL_TARGET = 6;
const P_INT_PM_AMOUNT = 7;
const P_INT_PM_RATIO = 8;
// const P_EXT_PM_AMOUNT = 9; // not exposed in UI yet
const P_PM_PRE = 10;

// Line 1
const P_L1_WAVEFORM = 100;
const P_L1_WARP_ALGO = 101;
const P_L1_DCW_BASE = 102;
const P_L1_DCA_BASE = 103;
const P_L1_DCO_DEPTH = 104;
const P_L1_OCTAVE = 105;
const P_L1_DETUNE = 106;
const P_L1_DCW_COMP = 107;
const P_L1_KEY_FOLLOW = 108;
// const P_L1_MODULATION = 109;
const P_L1_ALGO_BLEND = 110;
const P_L1_WARP_ALGO2 = 111;

// Line 2
const P_L2_WAVEFORM = 200;
const P_L2_WARP_ALGO = 201;
const P_L2_DCW_BASE = 202;
const P_L2_DCA_BASE = 203;
const P_L2_DCO_DEPTH = 204;
const P_L2_OCTAVE = 205;
const P_L2_DETUNE = 206;
const P_L2_DCW_COMP = 207;
const P_L2_KEY_FOLLOW = 208;
// const P_L2_MODULATION = 209;
const P_L2_ALGO_BLEND = 210;
const P_L2_WARP_ALGO2 = 211;

// Vibrato
const P_VIB_ENABLED = 300;
const P_VIB_WAVEFORM = 301;
const P_VIB_RATE = 302;
const P_VIB_DEPTH = 303;
const P_VIB_DELAY = 304;

// FX
const P_CHORUS_MIX = 400;
const P_CHORUS_RATE = 401;
const P_CHORUS_DEPTH = 402;
const P_DELAY_MIX = 500;
const P_DELAY_TIME = 501;
const P_DELAY_FEEDBACK = 502;
const P_REVERB_MIX = 600;
const P_REVERB_SIZE = 601;

// LFO
const P_LFO_ENABLED = 700;
const P_LFO_WAVEFORM = 701;
const P_LFO_RATE = 702;
const P_LFO_DEPTH = 703;
const P_LFO_TARGET = 704;

// Filter
const P_FILTER_ENABLED = 800;
const P_FILTER_CUTOFF = 801;
const P_FILTER_RESONANCE = 802;
const P_FILTER_ENV_AMOUNT = 803;
const P_FILTER_TYPE = 804;

// Portamento
const P_PORT_ENABLED = 900;
const P_PORT_MODE = 901;
const P_PORT_TIME = 902;

// ── Scale selector ─────────────────────────────────────────────────────────────
const UI_SCALE_KEY = "cz-plugin-ui-scale";
const UI_SCALE_OPTIONS = [50, 60, 70, 80, 90, 100] as const;
type UiScale = (typeof UI_SCALE_OPTIONS)[number];

// ── Enum ↔ f64 tables ─────────────────────────────────────────────────────────
const LINE_SELECT_IDS: Record<string, number> = {
	"L1+L2": 0,
	L1: 1,
	L2: 2,
	"L1+L1'": 3,
	"L1+L2'": 4,
};
const LINE_SELECT_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(LINE_SELECT_IDS).map(([k, v]) => [v, k]),
);

const MOD_MODE_IDS: Record<string, number> = { normal: 0, ring: 1, noise: 2 };
const MOD_MODE_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(MOD_MODE_IDS).map(([k, v]) => [v, k]),
);

const POLY_MODE_IDS: Record<string, number> = { poly8: 0, mono: 1 };
const POLY_MODE_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(POLY_MODE_IDS).map(([k, v]) => [v, k]),
);

const VEL_TARGET_IDS: Record<string, number> = {
	amp: 0,
	dcw: 1,
	both: 2,
	off: 3,
};
const VEL_TARGET_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(VEL_TARGET_IDS).map(([k, v]) => [v, k]),
);

const WARP_ALGO_IDS: Record<string, number> = {
	cz101: 0,
	bend: 1,
	sync: 2,
	pinch: 3,
	fold: 4,
	skew: 5,
	quantize: 6,
	twist: 7,
	clip: 8,
	ripple: 9,
	mirror: 10,
	fof: 11,
	karpunk: 12,
	sine: 13,
};
const WARP_ALGO_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(WARP_ALGO_IDS).map(([k, v]) => [v, k]),
);

const LFO_WAVE_IDS: Record<string, number> = {
	sine: 0,
	triangle: 1,
	square: 2,
	saw: 3,
};
const LFO_WAVE_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(LFO_WAVE_IDS).map(([k, v]) => [v, k]),
);

const LFO_TARGET_IDS: Record<string, number> = {
	pitch: 0,
	dcw: 1,
	dca: 2,
	filter: 3,
};
const LFO_TARGET_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(LFO_TARGET_IDS).map(([k, v]) => [v, k]),
);

const FILTER_TYPE_IDS: Record<string, number> = { lp: 0, hp: 1, bp: 2 };
const FILTER_TYPE_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(FILTER_TYPE_IDS).map(([k, v]) => [v, k]),
);

const PORT_MODE_IDS: Record<string, number> = { rate: 0, time: 1 };
const PORT_MODE_FROM_ID: Record<number, string> = Object.fromEntries(
	Object.entries(PORT_MODE_IDS).map(([k, v]) => [v, k]),
);

// ── IPC helpers ───────────────────────────────────────────────────────────────
declare global {
	interface Window {
		ipc?: { postMessage: (msg: string) => void };
		__czOnParams?: (json: string) => void;
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
	}
}

function sendParam(parameterId: number, value: number) {
	if (window.ipc) {
		window.ipc.postMessage(
			JSON.stringify({ parameter_id: parameterId, value }),
		);
	}
}

// ── Types ─────────────────────────────────────────────────────────────────────
type PolyMode = "poly8" | "mono";
type VelocityTarget = "amp" | "dcw" | "both" | "off";

const ACCORDION_NAME = "plugin-aside-accordion";

export default function PluginPage() {
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
	const extPmAmount = 0;
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
	const [velocityTarget, setVelocityTarget] = useState<VelocityTarget>("amp");
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
	const [line2DcwKeyFollow, setLine2DcwKeyFollow] = useState(0);

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
	const [pitchBendRange, setPitchBendRange] = useState(2);
	const [modWheelVibratoDepth, setModWheelVibratoDepth] = useState(0);

	// ── Preset management ────────────────────────────────────────────────────
	const [presetList, setPresetList] = useState<string[]>([]);
	const [activePresetName, setActivePresetName] = useState("Current State");

	// ── UI scale ─────────────────────────────────────────────────────────────
	const [uiScale, setUiScale] = useState<UiScale>(() => {
		const saved = localStorage.getItem(UI_SCALE_KEY);
		const n = saved ? Number(saved) : 100;
		return (UI_SCALE_OPTIONS.includes(n as UiScale) ? n : 100) as UiScale;
	});

	// ── Canvas refs ─────────────────────────────────────────────────────────
	const line1CanvasRef = useRef<HTMLCanvasElement>(null);
	const line2CanvasRef = useRef<HTMLCanvasElement>(null);
	const combinedCanvasRef = useRef<HTMLCanvasElement>(null);
	const phaseCanvasRef = useRef<HTMLCanvasElement>(null);
	const oscilloscopeCanvasRef = useRef<HTMLCanvasElement>(null);
	// Holds the latest PCM batch from Rust (float32 in [-1, 1]) + metadata.
	const scopeDataRef = useRef<{
		samples: Float32Array;
		sampleRate: number;
		hz: number;
	} | null>(null);
	// Track displayed pitch Hz for the scope header (updated from scope callback).
	const [scopeActiveHz, setScopeActiveHz] = useState(220);

	// ── Waveform computation ────────────────────────────────────────────────
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
			pmPre,
			windowType,
		],
	);

	// ── Waveform canvas draws ───────────────────────────────────────────────
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

	// ── Send params to Rust via wry IPC ────────────────────────────────────
	// Only send params that have changed since the last render. This avoids
	// flooding Rust with 50+ messages on every knob movement.
	const sentParamsRef = useRef<Map<number, number>>(new Map());
	const sentEnvelopesRef = useRef<Map<string, string>>(new Map());

	const queueParam = useCallback((id: number, value: number) => {
		const prev = sentParamsRef.current.get(id);
		if (prev === value) return; // nothing changed
		sentParamsRef.current.set(id, value);
		sendParam(id, value);
	}, []);

	const sendEnvelope = useCallback((envId: string, env: StepEnvData) => {
		const serialized = JSON.stringify(env);
		if (sentEnvelopesRef.current.get(envId) === serialized) return;
		sentEnvelopesRef.current.set(envId, serialized);
		if (window.ipc) {
			window.ipc.postMessage(JSON.stringify({ envelope_id: envId, data: env }));
		}
	}, []);

	// Map algo key → warp algo ID
	const algoKeyToId = useCallback((key: PdAlgo | string | null): number => {
		if (key === null) return 0;
		const algoStr = String(key);
		// PD_ALGOS entries carry an `algo` field (e.g. "cz101", "bend", ...)
		const found = PD_ALGOS.find((a) => String(a.value) === algoStr);
		const warpName = found?.algo ?? algoStr;
		return WARP_ALGO_IDS[warpName] ?? 0;
	}, []);

	// Waveform number from algo key
	const algoKeyToWaveform = useCallback(
		(key: PdAlgo | string | null): number => {
			if (key === null) return 1;
			const found = PD_ALGOS.find((a) => String(a.value) === String(key));
			return found?.waveform ?? 1;
		},
		[],
	);

	// Sync all params whenever state changes
	useEffect(() => {
		queueParam(P_VOLUME, volume);
		queueParam(P_OCTAVE, 0);
		queueParam(P_LINE_SELECT, LINE_SELECT_IDS[lineSelect] ?? 0);
		queueParam(P_MOD_MODE, MOD_MODE_IDS[modMode] ?? 0);
		queueParam(P_POLY_MODE, POLY_MODE_IDS[polyMode] ?? 0);
		queueParam(P_LEGATO, legato ? 1 : 0);
		queueParam(P_VEL_TARGET, VEL_TARGET_IDS[velocityTarget] ?? 0);
		queueParam(P_INT_PM_AMOUNT, intPmAmount);
		queueParam(P_INT_PM_RATIO, intPmRatio);
		queueParam(P_PM_PRE, pmPre ? 1 : 0);

		// Line 1
		queueParam(P_L1_WAVEFORM, algoKeyToWaveform(warpAAlgo));
		queueParam(P_L1_WARP_ALGO, algoKeyToId(warpAAlgo));
		queueParam(P_L1_DCW_BASE, warpAAmount);
		queueParam(P_L1_DCA_BASE, line1Level);
		queueParam(P_L1_DCO_DEPTH, line1DcoDepth);
		queueParam(P_L1_OCTAVE, line1Octave);
		queueParam(P_L1_DETUNE, line1Detune);
		queueParam(P_L1_DCW_COMP, line1DcwComp);
		queueParam(P_L1_KEY_FOLLOW, line1DcwKeyFollow);
		queueParam(P_L1_ALGO_BLEND, algoBlendA);
		queueParam(P_L1_WARP_ALGO2, algo2A === null ? -1 : algoKeyToId(algo2A));

		// Line 2
		queueParam(P_L2_WAVEFORM, algoKeyToWaveform(warpBAlgo));
		queueParam(P_L2_WARP_ALGO, algoKeyToId(warpBAlgo));
		queueParam(P_L2_DCW_BASE, warpBAmount);
		queueParam(P_L2_DCA_BASE, line2Level);
		queueParam(P_L2_DCO_DEPTH, line2DcoDepth);
		queueParam(P_L2_OCTAVE, line2Octave);
		queueParam(P_L2_DETUNE, line2Detune);
		queueParam(P_L2_DCW_COMP, line2DcwComp);
		queueParam(P_L2_KEY_FOLLOW, line2DcwKeyFollow);
		queueParam(P_L2_ALGO_BLEND, algoBlendB);
		queueParam(P_L2_WARP_ALGO2, algo2B === null ? -1 : algoKeyToId(algo2B));

		// Vibrato
		queueParam(P_VIB_ENABLED, vibratoEnabled ? 1 : 0);
		queueParam(P_VIB_WAVEFORM, vibratoWave);
		queueParam(P_VIB_RATE, vibratoRate);
		queueParam(P_VIB_DEPTH, vibratoDepth);
		queueParam(P_VIB_DELAY, vibratoDelay);

		// FX
		queueParam(P_CHORUS_MIX, chorusMix);
		queueParam(P_CHORUS_RATE, chorusRate);
		queueParam(P_CHORUS_DEPTH, chorusDepth);
		queueParam(P_DELAY_MIX, delayMix);
		queueParam(P_DELAY_TIME, delayTime);
		queueParam(P_DELAY_FEEDBACK, delayFeedback);
		queueParam(P_REVERB_MIX, reverbMix);
		queueParam(P_REVERB_SIZE, reverbSize);

		// LFO
		queueParam(P_LFO_ENABLED, lfoEnabled ? 1 : 0);
		queueParam(P_LFO_WAVEFORM, LFO_WAVE_IDS[lfoWaveform] ?? 0);
		queueParam(P_LFO_RATE, lfoRate);
		queueParam(P_LFO_DEPTH, lfoDepth);
		queueParam(P_LFO_TARGET, LFO_TARGET_IDS[lfoTarget] ?? 0);

		// Filter
		queueParam(P_FILTER_ENABLED, filterEnabled ? 1 : 0);
		queueParam(P_FILTER_CUTOFF, filterCutoff);
		queueParam(P_FILTER_RESONANCE, filterResonance);
		queueParam(P_FILTER_ENV_AMOUNT, filterEnvAmount);
		queueParam(P_FILTER_TYPE, FILTER_TYPE_IDS[filterType] ?? 0);

		// Portamento
		queueParam(P_PORT_ENABLED, portamentoEnabled ? 1 : 0);
		queueParam(P_PORT_MODE, PORT_MODE_IDS[portamentoMode] ?? 0);
		queueParam(P_PORT_TIME, portamentoTime);

		// Envelopes — sent as JSON blobs since they are structs, not scalars
		sendEnvelope("l1_dco", line1DcoEnv);
		sendEnvelope("l1_dcw", line1DcwEnv);
		sendEnvelope("l1_dca", line1DcaEnv);
		sendEnvelope("l2_dco", line2DcoEnv);
		sendEnvelope("l2_dcw", line2DcwEnv);
		sendEnvelope("l2_dca", line2DcaEnv);
	}, [
		volume,
		lineSelect,
		modMode,
		polyMode,
		legato,
		velocityTarget,
		intPmAmount,
		intPmRatio,
		pmPre,
		warpAAlgo,
		warpAAmount,
		line1Level,
		line1DcoDepth,
		line1Octave,
		line1Detune,
		line1DcwComp,
		line1DcwKeyFollow,
		algoBlendA,
		warpBAlgo,
		warpBAmount,
		line2Level,
		line2DcoDepth,
		line2Octave,
		line2Detune,
		line2DcwComp,
		line2DcwKeyFollow,
		algoBlendB,
		vibratoEnabled,
		vibratoWave,
		vibratoRate,
		vibratoDepth,
		vibratoDelay,
		chorusMix,
		chorusRate,
		chorusDepth,
		delayMix,
		delayTime,
		delayFeedback,
		reverbMix,
		reverbSize,
		lfoEnabled,
		lfoWaveform,
		lfoRate,
		lfoDepth,
		lfoTarget,
		filterEnabled,
		filterCutoff,
		filterResonance,
		filterEnvAmount,
		filterType,
		portamentoEnabled,
		portamentoMode,
		portamentoTime,
		line1DcoEnv,
		line1DcwEnv,
		line1DcaEnv,
		line2DcoEnv,
		line2DcwEnv,
		line2DcaEnv,
		queueParam,
		sendEnvelope,
		algoKeyToId,
		algoKeyToWaveform,
	]);

	// ── Receive params from Rust ───────────────────────────────────────────
	useEffect(() => {
		window.__czOnParams = (json: string) => {
			try {
				const params = JSON.parse(json) as Record<number, number>;
				// Apply each param received from the host
				for (const [rawId, value] of Object.entries(params)) {
					const id = Number(rawId);
					switch (id) {
						case P_VOLUME:
							setVolume(value);
							break;
						case P_LINE_SELECT:
							setLineSelect(
								(LINE_SELECT_FROM_ID[value] ?? "L1+L2") as typeof lineSelect,
							);
							break;
						case P_MOD_MODE:
							setModMode(
								(MOD_MODE_FROM_ID[value] ?? "normal") as typeof modMode,
							);
							break;
						case P_POLY_MODE:
							setPolyMode(
								(POLY_MODE_FROM_ID[value] ?? "poly8") as typeof polyMode,
							);
							break;
						case P_LEGATO:
							setLegato(value >= 0.5);
							break;
						case P_VEL_TARGET:
							setVelocityTarget(
								(VEL_TARGET_FROM_ID[value] ?? "amp") as typeof velocityTarget,
							);
							break;
						case P_INT_PM_AMOUNT:
							setIntPmAmount(value);
							break;
						case P_INT_PM_RATIO:
							setIntPmRatio(value);
							break;
						case P_PM_PRE:
							setPmPre(value >= 0.5);
							break;
						// Line 1 — waveform/algo combined back to PdAlgo key via PD_ALGOS lookup
						case P_L1_WARP_ALGO: {
							const algoName = WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101";
							const entry = PD_ALGOS.find((a) => a.algo === algoName);
							if (entry) setWarpAAlgo(entry.value as PdAlgo);
							break;
						}
						case P_L1_DCW_BASE:
							setWarpAAmount(value);
							break;
						case P_L1_DCA_BASE:
							setLine1Level(value);
							break;
						case P_L1_DCO_DEPTH:
							setLine1DcoDepth(value);
							break;
						case P_L1_OCTAVE:
							setLine1Octave(value);
							break;
						case P_L1_DETUNE:
							setLine1Detune(value);
							break;
						case P_L1_DCW_COMP:
							setLine1DcwComp(value);
							break;
						case P_L1_KEY_FOLLOW:
							setLine1DcwKeyFollow(value);
							break;
						case P_L1_ALGO_BLEND:
							setAlgoBlendA(value);
							break;
						case P_L1_WARP_ALGO2: {
							if (value < 0) {
								setAlgo2A(null);
							} else {
								const algoName =
									WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101";
								const entry = PD_ALGOS.find((a) => a.algo === algoName);
								if (entry) setAlgo2A(entry.value as PdAlgo);
							}
							break;
						}
						// Line 2
						case P_L2_WARP_ALGO: {
							const algoName = WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101";
							const entry = PD_ALGOS.find((a) => a.algo === algoName);
							if (entry) setWarpBAlgo(entry.value as PdAlgo);
							break;
						}
						case P_L2_DCW_BASE:
							setWarpBAmount(value);
							break;
						case P_L2_DCA_BASE:
							setLine2Level(value);
							break;
						case P_L2_DCO_DEPTH:
							setLine2DcoDepth(value);
							break;
						case P_L2_OCTAVE:
							setLine2Octave(value);
							break;
						case P_L2_DETUNE:
							setLine2Detune(value);
							break;
						case P_L2_DCW_COMP:
							setLine2DcwComp(value);
							break;
						case P_L2_KEY_FOLLOW:
							setLine2DcwKeyFollow(value);
							break;
						case P_L2_ALGO_BLEND:
							setAlgoBlendB(value);
							break;
						case P_L2_WARP_ALGO2: {
							if (value < 0) {
								setAlgo2B(null);
							} else {
								const algoName =
									WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101";
								const entry = PD_ALGOS.find((a) => a.algo === algoName);
								if (entry) setAlgo2B(entry.value as PdAlgo);
							}
							break;
						}
						// Vibrato
						case P_VIB_ENABLED:
							setVibratoEnabled(value >= 0.5);
							break;
						case P_VIB_WAVEFORM:
							setVibratoWave(Math.round(value));
							break;
						case P_VIB_RATE:
							setVibratoRate(value);
							break;
						case P_VIB_DEPTH:
							setVibratoDepth(value);
							break;
						case P_VIB_DELAY:
							setVibratoDelay(value);
							break;
						// FX
						case P_CHORUS_MIX:
							setChorusMix(value);
							break;
						case P_CHORUS_RATE:
							setChorusRate(value);
							break;
						case P_CHORUS_DEPTH:
							setChorusDepth(value);
							break;
						case P_DELAY_MIX:
							setDelayMix(value);
							break;
						case P_DELAY_TIME:
							setDelayTime(value);
							break;
						case P_DELAY_FEEDBACK:
							setDelayFeedback(value);
							break;
						case P_REVERB_MIX:
							setReverbMix(value);
							break;
						case P_REVERB_SIZE:
							setReverbSize(value);
							break;
						// LFO
						case P_LFO_ENABLED:
							setLfoEnabled(value >= 0.5);
							break;
						case P_LFO_WAVEFORM:
							setLfoWaveform(
								(LFO_WAVE_FROM_ID[Math.round(value)] ??
									"sine") as typeof lfoWaveform,
							);
							break;
						case P_LFO_RATE:
							setLfoRate(value);
							break;
						case P_LFO_DEPTH:
							setLfoDepth(value);
							break;
						case P_LFO_TARGET:
							setLfoTarget(
								(LFO_TARGET_FROM_ID[Math.round(value)] ??
									"pitch") as typeof lfoTarget,
							);
							break;
						// Filter
						case P_FILTER_ENABLED:
							setFilterEnabled(value >= 0.5);
							break;
						case P_FILTER_CUTOFF:
							setFilterCutoff(value);
							break;
						case P_FILTER_RESONANCE:
							setFilterResonance(value);
							break;
						case P_FILTER_ENV_AMOUNT:
							setFilterEnvAmount(value);
							break;
						case P_FILTER_TYPE:
							setFilterType(
								(FILTER_TYPE_FROM_ID[Math.round(value)] ??
									"lp") as typeof filterType,
							);
							break;
						// Portamento
						case P_PORT_ENABLED:
							setPortamentoEnabled(value >= 0.5);
							break;
						case P_PORT_MODE:
							setPortamentoMode(
								(PORT_MODE_FROM_ID[Math.round(value)] ??
									"rate") as typeof portamentoMode,
							);
							break;
						case P_PORT_TIME:
							setPortamentoTime(value);
							break;
					}
				}
			} catch (e) {
				console.error("[PluginPage] Failed to parse params from Rust:", e);
			}
		};
		return () => {
			window.__czOnParams = undefined;
		};
	}, []);

	// ── Copy line settings ─────────────────────────────────────────────────
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

	// ── Gather / apply preset ─────────────────────────────────────────────────
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
			line1DcaKeyFollow: 0,
			line2DcwKeyFollow,
			line2DcaKeyFollow: 0,
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
			pitchBendRange,
			modWheelVibratoDepth,
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
			pitchBendRange,
			modWheelVibratoDepth,
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
		setLine2DcwKeyFollow(safe(data.line2DcwKeyFollow, 0));
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
		setPitchBendRange(safe(data.pitchBendRange, 2));
		setModWheelVibratoDepth(safe(data.modWheelVibratoDepth, 0));
		// Reset sentParamsRef so all params are re-sent after preset load
		sentParamsRef.current.clear();
		sentEnvelopesRef.current.clear();
	}, []);

	// ── Preset handlers ───────────────────────────────────────────────────────
	const allPresetEntries = useMemo(
		(): PresetEntry[] => [
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
		],
		[presetList],
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

	// No library presets in plugin context — stub
	const handleLoadLibrary = useCallback(() => {}, []);

	const handleStepPreset = useCallback(
		(direction: -1 | 1) => {
			if (allPresetEntries.length === 0) return;
			const base = activePresetIndex >= 0 ? activePresetIndex : 0;
			const next =
				(base + direction + allPresetEntries.length) % allPresetEntries.length;
			const entry = allPresetEntries[next];
			if (!entry) return;
			if (entry.type === "local") handleLoadLocal(entry.label);
			else if (entry.type === "builtin") handleLoadBuiltin(entry.label);
		},
		[activePresetIndex, allPresetEntries, handleLoadLocal, handleLoadBuiltin],
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
			const name = filename.trim() || "imported";
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

	// ── Load saved state on mount ─────────────────────────────────────────────
	useEffect(() => {
		setPresetList(listPresets());
		const saved = loadCurrentState();
		if (saved) applyPreset(saved);
	}, [applyPreset]);

	// ── Auto-save current state ───────────────────────────────────────────────
	useEffect(() => {
		const timer = setTimeout(() => {
			saveCurrentState(gatherState());
		}, 500);
		return () => clearTimeout(timer);
	}, [gatherState]);

	// ── Persist UI scale ──────────────────────────────────────────────────────
	useEffect(() => {
		localStorage.setItem(UI_SCALE_KEY, String(uiScale));
	}, [uiScale]);

	// ── Scope state (static — no live audio in plugin) ────────────────────────
	const [scopeCycles, setScopeCycles] = useState(2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(1.0);
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(128);

	// ── Live oscilloscope ────────────────────────────────────────────────────
	// Register window.__czOnScope so Rust can push PCM batches.
	// Signature matches Rust: (samples: float32[], sampleRate: number, hz: number)
	useEffect(() => {
		window.__czOnScope = (
			samples: number[],
			sampleRate: number,
			hz: number,
		) => {
			scopeDataRef.current = {
				samples: new Float32Array(samples),
				sampleRate,
				hz,
			};
			setScopeActiveHz(Math.round(hz * 10) / 10);
		};
		return () => {
			window.__czOnScope = undefined;
		};
	}, []);

	// requestAnimationFrame draw loop — mirrors PhaseDistortionVisualizer exactly.
	useEffect(() => {
		const canvas = oscilloscopeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;

		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const dpr = window.devicePixelRatio || 1;
			const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
			const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
			const pixelWidth = Math.floor(drawWidth * dpr);
			const pixelHeight = Math.floor(drawHeight * dpr);
			if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			const frame = scopeDataRef.current;

			if (!frame || frame.samples.length === 0) {
				// ── Idle display (no audio) ───────────────────────────────────
				ctx.fillStyle = "#051005";
				ctx.fillRect(0, 0, drawWidth, drawHeight);
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
				return;
			}

			// ── Live waveform ─────────────────────────────────────────────────
			// Mirrors PhaseDistortionVisualizer exactly:
			// - viewSamples = samplesPerCycle * scopeCycles (clamped to buffer)
			// - Trigger: rising edge at triggerFloat (normalised from 0-255 scale)
			// - DC offset removed via mean subtraction
			const { samples, sampleRate, hz } = frame;
			const samplesPerCycle = Math.max(
				8,
				Math.round(sampleRate / Math.max(1, hz)),
			);
			const viewSamples = Math.max(
				32,
				Math.min(samples.length - 2, Math.round(samplesPerCycle * scopeCycles)),
			);

			// Trigger: scopeTriggerLevel in [0,255] → float [-1,1]
			const triggerFloat = (scopeTriggerLevel - 128) / 128;
			let start = Math.max(1, Math.floor((samples.length - viewSamples) / 2));
			const endLimit = samples.length - viewSamples - 1;
			for (let i = 1; i < endLimit; i++) {
				const prev = samples[i - 1];
				const curr = samples[i];
				if (prev < triggerFloat && curr >= triggerFloat) {
					start = i;
					break;
				}
			}

			// DC removal
			let mean = 0;
			for (let i = 0; i < viewSamples; i++) mean += samples[start + i];
			mean /= viewSamples;

			ctx.clearRect(0, 0, drawWidth, drawHeight);

			// Grid
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

			// Centre line
			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, drawHeight / 2);
			ctx.lineTo(drawWidth, drawHeight / 2);
			ctx.stroke();

			// Waveform
			ctx.shadowColor = "#3dff3d";
			ctx.shadowBlur = 8;
			ctx.strokeStyle = "#3dff3d";
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < viewSamples; i++) {
				const x = (i / (viewSamples - 1)) * drawWidth;
				const centered = samples[start + i] - mean;
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
	}, [scopeTriggerLevel, scopeVerticalZoom, scopeCycles]);

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<div
			className="h-full bg-cz-body flex flex-col overflow-hidden gap-4 w-full"
			style={{ zoom: `${uiScale}%` }}
		>
			<SynthHeader
				allEntries={allPresetEntries}
				activePresetName={activePresetName}
				onLoadLocal={handleLoadLocal}
				onLoadLibrary={handleLoadLibrary}
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

			{/* UI Scale selector */}
			<div className="flex items-center gap-2 px-8 -mt-2">
				<span className="text-[10px] font-mono uppercase tracking-[0.2em] text-base-content/50">
					UI Scale
				</span>
				<div className="flex gap-1">
					{UI_SCALE_OPTIONS.map((s) => (
						<button
							key={s}
							type="button"
							className={`btn btn-xs font-mono ${uiScale === s ? "btn-primary" : "btn-ghost opacity-50"}`}
							onClick={() => setUiScale(s)}
						>
							{s}%
						</button>
					))}
				</div>
			</div>

			<div className="px-4 md:px-6 grid flex-1 min-h-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)]">
				<aside className="overflow-y-auto min-h-0 pb-4 space-y-0 [scrollbar-gutter:stable]">
					{/* ScopePanel — live PCM feed from Rust via window.__czOnScope */}
					<ScopePanel
						oscilloscopeCanvasRef={oscilloscopeCanvasRef}
						effectivePitchHz={scopeActiveHz}
						scopeCycles={scopeCycles}
						setScopeCycles={setScopeCycles}
						scopeVerticalZoom={scopeVerticalZoom}
						setScopeVerticalZoom={setScopeVerticalZoom}
						scopeTriggerLevel={scopeTriggerLevel}
						setScopeTriggerLevel={setScopeTriggerLevel}
						open={true}
					/>

					<div className="divider" />

					<GlobalVoicePanel
						accordionName={ACCORDION_NAME}
						defaultOpen={true}
						volume={volume}
						setVolume={setVolume}
						polyMode={polyMode}
						setPolyMode={setPolyMode}
						legato={legato}
						setLegato={setLegato}
						sustainOn={false}
						onSustainToggle={() => {}}
						velocityTarget={velocityTarget}
						setVelocityTarget={setVelocityTarget}
						windowType={windowType}
						setWindowType={setWindowType}
						pitchBendRange={pitchBendRange}
						setPitchBendRange={setPitchBendRange}
						modWheelVibratoDepth={modWheelVibratoDepth}
						setModWheelVibratoDepth={setModWheelVibratoDepth}
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
