import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	type SynthEngineAdapter,
	useSynthEngineController,
} from "@/features/synth/engine/synthEngineAdapter";
import { buildSynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";
import { isWaveformId } from "@/lib/synth/algoRef";
import type {
	Algo,
	AlgoControlValueV1,
	CzWaveform,
	FilterType,
	LfoTarget,
	LfoWaveform,
	LineSelect,
	ModMatrix,
	ModMode,
	PolyMode,
	PortamentoMode,
	StepEnvData,
	VelocityTarget,
} from "@/lib/synth/bindings/synth";
import {
	type EnvelopeId,
	FILTER_TYPE_FROM_ID,
	FILTER_TYPE_IDS,
	LFO_TARGET_FROM_ID,
	LFO_TARGET_IDS,
	LFO_WAVE_FROM_ID,
	LFO_WAVE_IDS,
	LINE_SELECT_FROM_ID,
	LINE_SELECT_IDS,
	MOD_MODE_FROM_ID,
	MOD_MODE_IDS,
	P_CHORUS_DEPTH,
	P_CHORUS_MIX,
	P_CHORUS_RATE,
	P_DELAY_FEEDBACK,
	P_DELAY_MIX,
	P_DELAY_TIME,
	P_FILTER_CUTOFF,
	P_FILTER_ENABLED,
	P_FILTER_ENV_AMOUNT,
	P_FILTER_RESONANCE,
	P_FILTER_TYPE,
	P_INT_PM_AMOUNT,
	P_INT_PM_RATIO,
	P_L1_ALGO_BLEND,
	P_L1_DCA_BASE,
	P_L1_DCO_DEPTH,
	P_L1_DCW_BASE,
	P_L1_DCW_COMP,
	P_L1_DETUNE,
	P_L1_KEY_FOLLOW,
	P_L1_OCTAVE,
	P_L1_WARP_ALGO,
	P_L1_WARP_ALGO2,
	P_L1_WAVEFORM,
	P_L2_ALGO_BLEND,
	P_L2_DCA_BASE,
	P_L2_DCO_DEPTH,
	P_L2_DCW_BASE,
	P_L2_DCW_COMP,
	P_L2_DETUNE,
	P_L2_KEY_FOLLOW,
	P_L2_OCTAVE,
	P_L2_WARP_ALGO,
	P_L2_WARP_ALGO2,
	P_L2_WAVEFORM,
	P_LEGATO,
	P_LFO_DEPTH,
	P_LFO_ENABLED,
	P_LFO_RATE,
	P_LFO_TARGET,
	P_LFO_WAVEFORM,
	P_LINE_SELECT,
	P_MOD_MODE,
	P_OCTAVE,
	P_PM_PRE,
	P_POLY_MODE,
	P_PORT_ENABLED,
	P_PORT_MODE,
	P_PORT_TIME,
	P_REVERB_MIX,
	P_REVERB_SIZE,
	P_VEL_TARGET,
	P_VIB_DELAY,
	P_VIB_DEPTH,
	P_VIB_ENABLED,
	P_VIB_RATE,
	P_VIB_WAVEFORM,
	P_VOLUME,
	POLY_MODE_FROM_ID,
	POLY_MODE_IDS,
	PORT_MODE_FROM_ID,
	PORT_MODE_IDS,
	VEL_TARGET_FROM_ID,
	VEL_TARGET_IDS,
	WARP_ALGO_FROM_ID,
	WARP_ALGO_IDS,
} from "../lib/pluginParams";

declare global {
	interface Window {
		ipc?: { postMessage: (msg: string) => void };
		__czOnParams?: (json: string) => void;
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
		__czGetEnvelopes?: () => Promise<Partial<Record<EnvelopeId, StepEnvData>>>;
		__czGetModMatrix?: () => Promise<ModMatrix>;
	}
}

function sendParam(parameterId: number, value: number) {
	if (window.ipc) {
		window.ipc.postMessage(
			JSON.stringify({ parameter_id: parameterId, value }),
		);
	}
}

// Maps CzWaveform strings to Rust Waveform enum 0-based indices.
// The Rust enum includes DoubleSine=5 (no CzWaveform counterpart), so
// sawPulse, multiSine, and pulse2 are at indices 6, 7, 8 respectively.
const CZ_WAVEFORM_IDX: Readonly<Record<CzWaveform, number>> = {
	saw: 0,
	square: 1,
	pulse: 2,
	null: 3,
	sinePulse: 4,
	sawPulse: 6,
	multiSine: 7,
	pulse2: 8,
};

// Reverse mapping for incoming param updates from Rust (index → CzWaveform).
// DoubleSine (5) maps to multiSine since that's how Rust's map_waveform handles it.
const IDX_TO_CZ_WAVEFORM: Record<number, CzWaveform> = {
	0: "saw",
	1: "square",
	2: "pulse",
	3: "null",
	4: "sinePulse",
	5: "multiSine",
	6: "sawPulse",
	7: "multiSine",
	8: "pulse2",
};

export function usePluginParamBridge(synthState: UseSynthStateResult) {
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
		phaseModEnabled,
		pmPre,
		setPmPre,
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
		line1CzSlotAWaveform,
		setLine1CzSlotAWaveform,
		line1CzSlotBWaveform,
		setLine1CzSlotBWaveform,
		line1CzWindow,
		line1AlgoControls,
		line2DcoEnv,
		setLine2DcoEnv,
		line2DcwEnv,
		setLine2DcwEnv,
		line2DcaEnv,
		setLine2DcaEnv,
		line2CzSlotAWaveform,
		setLine2CzSlotAWaveform,
		line2CzSlotBWaveform,
		setLine2CzSlotBWaveform,
		line2CzWindow,
		line2AlgoControls,
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
		chorusMix,
		setChorusMix,
		delayTime,
		setDelayTime,
		delayFeedback,
		setDelayFeedback,
		delayEnabled,
		delayMix,
		setDelayMix,
		reverbSize,
		setReverbSize,
		reverbEnabled,
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
		modWheelVibratoDepth,
		setModMatrix,
		modMatrix,
	} = synthState;

	const sentParamsRef = useRef<Map<number, number>>(new Map());
	const sentEnvelopesRef = useRef<Map<EnvelopeId, string>>(new Map());
	const sentAlgoControlsRef = useRef<Map<1 | 2, string>>(new Map());
	const sentModMatrixRef = useRef("");

	const queueParam = useCallback((id: number, value: number) => {
		const prev = sentParamsRef.current.get(id);
		if (prev === value) return;
		sentParamsRef.current.set(id, value);
		sendParam(id, value);
	}, []);

	const sendEnvelope = useCallback((envId: EnvelopeId, env: StepEnvData) => {
		const serialized = JSON.stringify(env);
		if (sentEnvelopesRef.current.get(envId) === serialized) return;
		sentEnvelopesRef.current.set(envId, serialized);
		if (window.ipc) {
			window.ipc.postMessage(JSON.stringify({ envelope_id: envId, data: env }));
		}
	}, []);

	const sendAlgoControls = useCallback(
		(line: 1 | 2, controls: AlgoControlValueV1[]) => {
			const serialized = JSON.stringify(controls);
			if (sentAlgoControlsRef.current.get(line) === serialized) return;
			sentAlgoControlsRef.current.set(line, serialized);
			if (window.ipc) {
				window.ipc.postMessage(
					JSON.stringify({ algo_controls: { line, controls } }),
				);
			}
		},
		[],
	);

	const sendModMatrix = useCallback((matrix: ModMatrix) => {
		const serialized = JSON.stringify(matrix ?? { routes: [] });
		if (sentModMatrixRef.current === serialized) return;
		sentModMatrixRef.current = serialized;
		if (window.ipc) {
			window.ipc.postMessage(JSON.stringify({ mod_matrix: matrix }));
		}
	}, []);

	const algoKeyToId = useCallback((key: Algo | null): number => {
		if (key === null || isWaveformId(key)) return 0; // CZ waveform algos → cz101 (index 0)
		return WARP_ALGO_IDS[key as keyof typeof WARP_ALGO_IDS] ?? 0;
	}, []);

	const algoKeyToWaveform = useCallback(
		(key: Algo | null, slotWaveform: CzWaveform): number => {
			if (key === null) return CZ_WAVEFORM_IDX.saw;
			// CZ waveform algos: the algo string IS the waveform
			if (isWaveformId(key)) return CZ_WAVEFORM_IDX[key as CzWaveform] ?? 0;
			// cz101 warp: waveform comes from the explicit slot setting
			if (key === "cz101") return CZ_WAVEFORM_IDX[slotWaveform] ?? 0;
			// other warp algos use a sine carrier; waveform param is irrelevant
			return 0;
		},
		[],
	);

	const adapter = useMemo<SynthEngineAdapter>(
		() => ({
			sync(snapshot) {
				queueParam(P_VOLUME, snapshot.volume);
				queueParam(P_OCTAVE, 0);
				queueParam(
					P_LINE_SELECT,
					LINE_SELECT_IDS[snapshot.lineSelect as LineSelect] ?? 0,
				);
				queueParam(P_MOD_MODE, MOD_MODE_IDS[snapshot.modMode as ModMode] ?? 0);
				queueParam(P_POLY_MODE, POLY_MODE_IDS[snapshot.polyMode] ?? 0);
				queueParam(P_LEGATO, snapshot.legato ? 1 : 0);
				queueParam(P_VEL_TARGET, VEL_TARGET_IDS[snapshot.velocityTarget] ?? 0);
				queueParam(P_INT_PM_AMOUNT, snapshot.intPmAmount);
				queueParam(P_INT_PM_RATIO, snapshot.intPmRatio);
				queueParam(P_PM_PRE, snapshot.pmPre ? 1 : 0);
				queueParam(P_L1_WAVEFORM, algoKeyToWaveform(snapshot.warpAAlgo, snapshot.line1CzSlotAWaveform));
				queueParam(P_L1_WARP_ALGO, algoKeyToId(snapshot.warpAAlgo));
				queueParam(P_L1_DCW_BASE, snapshot.warpAAmount);
				queueParam(P_L1_DCA_BASE, snapshot.line1Level);
				queueParam(P_L1_DCO_DEPTH, snapshot.line1DcoDepth);
				queueParam(P_L1_OCTAVE, snapshot.line1Octave);
				queueParam(P_L1_DETUNE, snapshot.line1Detune);
				queueParam(P_L1_DCW_COMP, snapshot.line1DcwComp);
				queueParam(P_L1_KEY_FOLLOW, snapshot.line1DcwKeyFollow);
				queueParam(P_L1_ALGO_BLEND, snapshot.algoBlendA);
				queueParam(
					P_L1_WARP_ALGO2,
					snapshot.algo2A === null ? -1 : algoKeyToId(snapshot.algo2A),
				);
				queueParam(P_L2_WAVEFORM, algoKeyToWaveform(snapshot.warpBAlgo, snapshot.line2CzSlotAWaveform));
				queueParam(P_L2_WARP_ALGO, algoKeyToId(snapshot.warpBAlgo));
				queueParam(P_L2_DCW_BASE, snapshot.warpBAmount);
				queueParam(P_L2_DCA_BASE, snapshot.line2Level);
				queueParam(P_L2_DCO_DEPTH, snapshot.line2DcoDepth);
				queueParam(P_L2_OCTAVE, snapshot.line2Octave);
				queueParam(P_L2_DETUNE, snapshot.line2Detune);
				queueParam(P_L2_DCW_COMP, snapshot.line2DcwComp);
				queueParam(P_L2_KEY_FOLLOW, snapshot.line2DcwKeyFollow);
				queueParam(P_L2_ALGO_BLEND, snapshot.algoBlendB);
				queueParam(
					P_L2_WARP_ALGO2,
					snapshot.algo2B === null ? -1 : algoKeyToId(snapshot.algo2B),
				);
				queueParam(P_VIB_ENABLED, snapshot.vibratoEnabled ? 1 : 0);
				queueParam(P_VIB_WAVEFORM, snapshot.vibratoWave);
				queueParam(P_VIB_RATE, snapshot.vibratoRate);
				queueParam(P_VIB_DEPTH, snapshot.vibratoDepth);
				queueParam(P_VIB_DELAY, snapshot.vibratoDelay);
				queueParam(P_CHORUS_MIX, snapshot.chorusMix);
				queueParam(P_CHORUS_RATE, snapshot.chorusRate);
				queueParam(P_CHORUS_DEPTH, snapshot.chorusDepth);
				queueParam(P_DELAY_MIX, snapshot.delayMix);
				queueParam(P_DELAY_TIME, snapshot.delayTime);
				queueParam(P_DELAY_FEEDBACK, snapshot.delayFeedback);
				queueParam(P_REVERB_MIX, snapshot.reverbMix);
				queueParam(P_REVERB_SIZE, snapshot.reverbSize);
				queueParam(P_LFO_ENABLED, snapshot.lfoEnabled ? 1 : 0);
				queueParam(
					P_LFO_WAVEFORM,
					LFO_WAVE_IDS[snapshot.lfoWaveform as LfoWaveform] ?? 0,
				);
				queueParam(P_LFO_RATE, snapshot.lfoRate);
				queueParam(P_LFO_DEPTH, snapshot.lfoDepth);
				queueParam(
					P_LFO_TARGET,
					LFO_TARGET_IDS[snapshot.lfoTarget as LfoTarget] ?? 0,
				);
				queueParam(P_FILTER_ENABLED, snapshot.filterEnabled ? 1 : 0);
				queueParam(P_FILTER_CUTOFF, snapshot.filterCutoff);
				queueParam(P_FILTER_RESONANCE, snapshot.filterResonance);
				queueParam(P_FILTER_ENV_AMOUNT, snapshot.filterEnvAmount);
				queueParam(
					P_FILTER_TYPE,
					FILTER_TYPE_IDS[snapshot.filterType as FilterType] ?? 0,
				);
				queueParam(P_PORT_ENABLED, snapshot.portamentoEnabled ? 1 : 0);
				queueParam(
					P_PORT_MODE,
					PORT_MODE_IDS[snapshot.portamentoMode as PortamentoMode] ?? 0,
				);
				queueParam(P_PORT_TIME, snapshot.portamentoTime);
				sendEnvelope("l1_dco", snapshot.line1DcoEnv);
				sendEnvelope("l1_dcw", snapshot.line1DcwEnv);
				sendEnvelope("l1_dca", snapshot.line1DcaEnv);
				sendEnvelope("l2_dco", snapshot.line2DcoEnv);
				sendEnvelope("l2_dcw", snapshot.line2DcwEnv);
				sendEnvelope("l2_dca", snapshot.line2DcaEnv);
				sendAlgoControls(1, snapshot.line1AlgoControls);
				sendAlgoControls(2, snapshot.line2AlgoControls);
				sendModMatrix(snapshot.modMatrix);
			},
		}),
		[
			queueParam,
			sendEnvelope,
			sendAlgoControls,
			sendModMatrix,
			algoKeyToId,
			algoKeyToWaveform,
		],
	);

	const snapshot = useMemo(
		() =>
			buildSynthEngineSnapshot({
				effectivePitchHz: 220,
				extPmAmount: 0,
				lineSelect,
				modMode,
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
				line1AlgoControls,
				line2DcoEnv,
				line2DcwEnv,
				line2DcaEnv,
				line2CzSlotAWaveform,
				line2CzSlotBWaveform,
				line2CzWindow,
				line2AlgoControls,
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
			}),
		[
			lineSelect,
			modMode,
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
			line1AlgoControls,
			line2DcoEnv,
			line2DcwEnv,
			line2DcaEnv,
			line2CzSlotAWaveform,
			line2CzSlotBWaveform,
			line2CzWindow,
			line2AlgoControls,
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
		],
	);

	useSynthEngineController({ adapter, snapshot });

	useEffect(() => {
		window.__czOnParams = (json: string) => {
			try {
				const params = JSON.parse(json) as Record<number, number>;
				for (const [rawId, value] of Object.entries(params)) {
					const id = Number(rawId);
					switch (id) {
						case P_VOLUME:
							setVolume(value);
							break;
						case P_LINE_SELECT:
							setLineSelect(
								(LINE_SELECT_FROM_ID[value] ?? "L1+L2") as LineSelect,
							);
							break;
						case P_MOD_MODE:
							setModMode((MOD_MODE_FROM_ID[value] ?? "normal") as ModMode);
							break;
						case P_POLY_MODE:
							setPolyMode((POLY_MODE_FROM_ID[value] ?? "poly8") as PolyMode);
							break;
						case P_LEGATO:
							setLegato(value >= 0.5);
							break;
						case P_VEL_TARGET:
							setVelocityTarget(
								(VEL_TARGET_FROM_ID[value] ?? "amp") as VelocityTarget,
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
						case P_L1_WAVEFORM: {
							const waveform = IDX_TO_CZ_WAVEFORM[Math.round(value)];
							if (waveform) {
								setLine1CzSlotAWaveform(waveform);
								setLine1CzSlotBWaveform(waveform);
							}
							break;
						}
						case P_L1_WARP_ALGO: {
							const algoName = (WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101") as Algo;
							setWarpAAlgo(algoName);
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
								const algoName = (WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101") as Algo;
								setAlgo2A(algoName);
							}
							break;
						}
						case P_L2_WAVEFORM: {
							const waveform = IDX_TO_CZ_WAVEFORM[Math.round(value)];
							if (waveform) {
								setLine2CzSlotAWaveform(waveform);
								setLine2CzSlotBWaveform(waveform);
							}
							break;
						}
						case P_L2_WARP_ALGO: {
							const algoName = (WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101") as Algo;
							setWarpBAlgo(algoName);
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
								const algoName = (WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101") as Algo;
								setAlgo2B(algoName);
							}
							break;
						}
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
						case P_LFO_ENABLED:
							setLfoEnabled(value >= 0.5);
							break;
						case P_LFO_WAVEFORM:
							setLfoWaveform(
								(LFO_WAVE_FROM_ID[Math.round(value)] ?? "sine") as LfoWaveform,
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
								(LFO_TARGET_FROM_ID[Math.round(value)] ?? "pitch") as LfoTarget,
							);
							break;
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
								(FILTER_TYPE_FROM_ID[Math.round(value)] ?? "lp") as FilterType,
							);
							break;
						case P_PORT_ENABLED:
							setPortamentoEnabled(value >= 0.5);
							break;
						case P_PORT_MODE:
							setPortamentoMode(
								(PORT_MODE_FROM_ID[Math.round(value)] ??
									"rate") as PortamentoMode,
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
		setLine1CzSlotAWaveform,
		setLine1CzSlotBWaveform,
		setLine2CzSlotAWaveform,
		setLine2CzSlotBWaveform,
	]);

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

	useEffect(() => {
		if (!window.__czGetModMatrix) {
			return;
		}
		let cancelled = false;
		void window
			.__czGetModMatrix()
			.then((matrix) => {
				if (cancelled || !matrix || typeof matrix !== "object") {
					return;
				}
				setModMatrix(matrix);
			})
			.catch((error) => {
				console.error("[PluginPage] Failed to load mod matrix state:", error);
			});
		return () => {
			cancelled = true;
		};
	}, [setModMatrix]);
}
