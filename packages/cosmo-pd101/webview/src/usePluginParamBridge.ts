import { useCallback, useEffect, useRef } from "react";
import {
	PD_ALGOS,
	type PdAlgo,
	type StepEnvData,
} from "@/components/pdAlgorithms";
import { useSynthState } from "@/features/synth/useSynthState";
import type {
	FilterType,
	LfoTarget,
	LfoWaveform,
	LineSelect,
	ModMode,
	PolyMode,
	PortamentoMode,
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
	POLY_MODE_FROM_ID,
	POLY_MODE_IDS,
	PORT_MODE_FROM_ID,
	PORT_MODE_IDS,
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
	VEL_TARGET_FROM_ID,
	VEL_TARGET_IDS,
	WARP_ALGO_FROM_ID,
	WARP_ALGO_IDS,
} from "./pluginParams";

declare global {
	interface Window {
		ipc?: { postMessage: (msg: string) => void };
		__czOnParams?: (json: string) => void;
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
		__czGetEnvelopes?: () => Promise<Partial<Record<EnvelopeId, StepEnvData>>>;
	}
}

function sendParam(parameterId: number, value: number) {
	if (window.ipc) {
		window.ipc.postMessage(
			JSON.stringify({ parameter_id: parameterId, value }),
		);
	}
}

type SynthState = ReturnType<typeof useSynthState>;

export function usePluginParamBridge(synthState: SynthState) {
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
		chorusMix,
		setChorusMix,
		delayTime,
		setDelayTime,
		delayFeedback,
		setDelayFeedback,
		delayMix,
		setDelayMix,
		reverbSize,
		setReverbSize,
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
	} = synthState;

	const sentParamsRef = useRef<Map<number, number>>(new Map());
	const sentEnvelopesRef = useRef<Map<EnvelopeId, string>>(new Map());

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

	const algoKeyToId = useCallback((key: PdAlgo | string | null): number => {
		if (key === null) return 0;
		const algoStr = String(key);
		const found = PD_ALGOS.find((a) => String(a.value) === algoStr);
		const warpName = found?.algo ?? algoStr;
		return WARP_ALGO_IDS[warpName as keyof typeof WARP_ALGO_IDS] ?? 0;
	}, []);

	const algoKeyToWaveform = useCallback((key: PdAlgo | string | null): number => {
		if (key === null) return 1;
		const found = PD_ALGOS.find((a) => String(a.value) === String(key));
		return found?.waveform ?? 1;
	}, []);

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
		queueParam(P_VIB_ENABLED, vibratoEnabled ? 1 : 0);
		queueParam(P_VIB_WAVEFORM, vibratoWave);
		queueParam(P_VIB_RATE, vibratoRate);
		queueParam(P_VIB_DEPTH, vibratoDepth);
		queueParam(P_VIB_DELAY, vibratoDelay);
		queueParam(P_CHORUS_MIX, chorusMix);
		queueParam(P_CHORUS_RATE, chorusRate);
		queueParam(P_CHORUS_DEPTH, chorusDepth);
		queueParam(P_DELAY_MIX, delayMix);
		queueParam(P_DELAY_TIME, delayTime);
		queueParam(P_DELAY_FEEDBACK, delayFeedback);
		queueParam(P_REVERB_MIX, reverbMix);
		queueParam(P_REVERB_SIZE, reverbSize);
		queueParam(P_LFO_ENABLED, lfoEnabled ? 1 : 0);
		queueParam(P_LFO_WAVEFORM, LFO_WAVE_IDS[lfoWaveform] ?? 0);
		queueParam(P_LFO_RATE, lfoRate);
		queueParam(P_LFO_DEPTH, lfoDepth);
		queueParam(P_LFO_TARGET, LFO_TARGET_IDS[lfoTarget] ?? 0);
		queueParam(P_FILTER_ENABLED, filterEnabled ? 1 : 0);
		queueParam(P_FILTER_CUTOFF, filterCutoff);
		queueParam(P_FILTER_RESONANCE, filterResonance);
		queueParam(P_FILTER_ENV_AMOUNT, filterEnvAmount);
		queueParam(P_FILTER_TYPE, FILTER_TYPE_IDS[filterType] ?? 0);
		queueParam(P_PORT_ENABLED, portamentoEnabled ? 1 : 0);
		queueParam(P_PORT_MODE, PORT_MODE_IDS[portamentoMode] ?? 0);
		queueParam(P_PORT_TIME, portamentoTime);
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
							setLineSelect((LINE_SELECT_FROM_ID[value] ?? "L1+L2") as LineSelect);
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
							setVelocityTarget((VEL_TARGET_FROM_ID[value] ?? "amp") as VelocityTarget);
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
								const algoName = WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101";
								const entry = PD_ALGOS.find((a) => a.algo === algoName);
								if (entry) setAlgo2A(entry.value as PdAlgo);
							}
							break;
						}
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
								const algoName = WARP_ALGO_FROM_ID[Math.round(value)] ?? "cz101";
								const entry = PD_ALGOS.find((a) => a.algo === algoName);
								if (entry) setAlgo2B(entry.value as PdAlgo);
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
							setLfoWaveform((LFO_WAVE_FROM_ID[Math.round(value)] ?? "sine") as LfoWaveform);
							break;
						case P_LFO_RATE:
							setLfoRate(value);
							break;
						case P_LFO_DEPTH:
							setLfoDepth(value);
							break;
						case P_LFO_TARGET:
							setLfoTarget((LFO_TARGET_FROM_ID[Math.round(value)] ?? "pitch") as LfoTarget);
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
							setFilterType((FILTER_TYPE_FROM_ID[Math.round(value)] ?? "lp") as FilterType);
							break;
						case P_PORT_ENABLED:
							setPortamentoEnabled(value >= 0.5);
							break;
						case P_PORT_MODE:
							setPortamentoMode((PORT_MODE_FROM_ID[Math.round(value)] ?? "rate") as PortamentoMode);
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
}
