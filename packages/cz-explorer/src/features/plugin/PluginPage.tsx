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
import ReverbPanel from "@/components/synth/ReverbPanel";
import ScopePanel from "@/components/synth/ScopePanel";
import SynthFilterPanel from "@/components/synth/SynthFilterPanel";
import SynthPageFrame from "@/components/synth/SynthPageFrame";
import VibratoPanel from "@/components/synth/VibratoPanel";
import { getSynthRuntimeCapabilities } from "@/features/synth/runtimeCapabilities";
import { useSynthPresetManager } from "@/features/synth/useSynthPresetManager";
import { useSynthState } from "@/features/synth/useSynthState";
import { DEFAULT_SYNTH_PRESETS } from "@/lib/synth/defaultPresets";

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
const PLUGIN_RUNTIME_CAPABILITIES = getSynthRuntimeCapabilities("plugin");
type UiScale = (typeof PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions)[number];

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
		__czGetEnvelopes?: () => Promise<
			Partial<
				Record<
					"l1_dco" | "l1_dcw" | "l1_dca" | "l2_dco" | "l2_dcw" | "l2_dca",
					StepEnvData
				>
			>
		>;
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

export default function PluginPage() {
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
		setLegato,
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

	const extPmAmount = 0;

	// ── UI scale ─────────────────────────────────────────────────────────────
	const [uiScale, setUiScale] = useState<UiScale>(() => {
		const saved = localStorage.getItem(UI_SCALE_KEY);
		const n = saved ? Number(saved) : 100;
		return (
			PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions.includes(n)
				? n
				: 100
		) as UiScale;
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
		algo2B,
		algo2A,
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
	}, [
		setVolume,
		setLineSelect,
		setModMode,
		setPolyMode,
		setLegato,
		setVelocityTarget,
		setIntPmAmount,
		setIntPmRatio,
		setPmPre,
		setLine1Level,
		setLine1Octave,
		setLine1Detune,
		setLine1DcoDepth,
		setLine1DcwComp,
		setLine1DcwKeyFollow,
		setWarpAAlgo,
		setWarpAAmount,
		setAlgoBlendA,
		setAlgo2A,
		setLine2Level,
		setLine2Octave,
		setLine2Detune,
		setLine2DcoDepth,
		setLine2DcwComp,
		setLine2DcwKeyFollow,
		setWarpBAlgo,
		setWarpBAmount,
		setAlgoBlendB,
		setAlgo2B,
		setVibratoEnabled,
		setVibratoWave,
		setVibratoRate,
		setVibratoDepth,
		setVibratoDelay,
		setChorusMix,
		setChorusRate,
		setChorusDepth,
		setDelayMix,
		setDelayTime,
		setDelayFeedback,
		setReverbMix,
		setReverbSize,
		setLfoEnabled,
		setLfoWaveform,
		setLfoRate,
		setLfoDepth,
		setLfoTarget,
		setFilterEnabled,
		setFilterCutoff,
		setFilterResonance,
		setFilterEnvAmount,
		setFilterType,
		setPortamentoEnabled,
		setPortamentoMode,
		setPortamentoTime,
	]);

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
		shouldLoadCurrentState: () => !window.ipc,
	});

	useEffect(() => {
		if (!window.__czGetEnvelopes) {
			return;
		}

		let cancelled = false;

		void window
			.__czGetEnvelopes()
			.then((envelopes) => {
				if (cancelled || !envelopes) {
					return;
				}

				if (envelopes.l1_dco) setLine1DcoEnv(envelopes.l1_dco);
				if (envelopes.l1_dcw) setLine1DcwEnv(envelopes.l1_dcw);
				if (envelopes.l1_dca) setLine1DcaEnv(envelopes.l1_dca);
				if (envelopes.l2_dco) setLine2DcoEnv(envelopes.l2_dco);
				if (envelopes.l2_dcw) setLine2DcwEnv(envelopes.l2_dcw);
				if (envelopes.l2_dca) setLine2DcaEnv(envelopes.l2_dca);
			})
			.catch((error) => {
				console.error("[PluginPage] Failed to load envelope state:", error);
			});

		return () => {
			cancelled = true;
		};
	}, [
		setLine1DcoEnv,
		setLine1DcwEnv,
		setLine1DcaEnv,
		setLine2DcoEnv,
		setLine2DcwEnv,
		setLine2DcaEnv,
	]);

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
		<SynthPageFrame
			className="h-full bg-cz-panel flex flex-col overflow-hidden gap-4 w-full"
			style={{ zoom: `${uiScale}%` }}
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
			headerExtra={
				PLUGIN_RUNTIME_CAPABILITIES.showUiScaleControl ? (
					<div className="flex items-center gap-2 px-8 -mt-2">
						<span className="text-3xs font-mono uppercase tracking-[0.2em] text-base-content/50">
							UI Scale
						</span>
						<div className="flex gap-1">
							{PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions.map((s) => (
								<button
									key={s}
									type="button"
									className={`btn btn-xs font-mono ${uiScale === s ? "btn-primary" : "btn-ghost opacity-50"}`}
									onClick={() => setUiScale(s as UiScale)}
								>
									{s}%
								</button>
							))}
						</div>
					</div>
				) : null
			}
		>
			<div className="px-4 grid flex-1 min-h-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)]">
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
					/>

					<div className="divider" />

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
					<ReverbPanel
						enabled={reverbEnabled}
						setEnabled={setReverbEnabled}
						size={reverbSize}
						setSize={setReverbSize}
						mix={reverbMix}
						setMix={setReverbMix}
					/>
				</aside>

				<main className="space-y-4 p-1 pb-4 overflow-y-auto min-h-0">
					<PhaseLinesSection
						lineSelect={lineSelect}
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
		</SynthPageFrame>
	);
}
