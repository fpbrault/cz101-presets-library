import { useEffect } from "react";
import { PD_ALGOS, type StepEnvData } from "@/components/pdAlgorithms";
import type { PolyMode, VelocityTarget } from "@/features/synth/useSynthState";

type UseSynthParamsToWorkletParams = {
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	paramsRef: React.MutableRefObject<EngineParams | null>;
	effectivePitchHz: number;
	lineSelect: string;
	modMode: string;
	warpAAmount: number;
	warpBAmount: number;
	line1Level: number;
	line2Level: number;
	line1DcoDepth: number;
	line2DcoDepth: number;
	line1DcwComp: number;
	line2DcwComp: number;
	warpAAlgo: string;
	warpBAlgo: string;
	intPmAmount: number;
	intPmRatio: number;
	phaseModEnabled: boolean;
	extPmAmount: number;
	pmPre: boolean;
	windowType: string;
	volume: number;
	line1Detune: number;
	line2Detune: number;
	line1Octave: number;
	line2Octave: number;
	line1DcoEnv: StepEnvData;
	line1DcwEnv: StepEnvData;
	line1DcaEnv: StepEnvData;
	line2DcoEnv: StepEnvData;
	line2DcwEnv: StepEnvData;
	line2DcaEnv: StepEnvData;
	polyMode: PolyMode;
	legato: boolean;
	velocityTarget: VelocityTarget;
	chorusRate: number;
	chorusDepth: number;
	chorusEnabled: boolean;
	chorusMix: number;
	delayTime: number;
	delayFeedback: number;
	delayEnabled: boolean;
	delayMix: number;
	reverbSize: number;
	reverbEnabled: boolean;
	reverbMix: number;
	algo2A: string | null;
	algo2B: string | null;
	algoBlendA: number;
	algoBlendB: number;
	line1DcwKeyFollow: number;
	line2DcwKeyFollow: number;
	vibratoEnabled: boolean;
	vibratoWave: number;
	vibratoRate: number;
	vibratoDepth: number;
	vibratoDelay: number;
	portamentoEnabled: boolean;
	portamentoMode: string;
	portamentoRate: number;
	portamentoTime: number;
	lfoEnabled: boolean;
	lfoWaveform: number;
	lfoRate: number;
	lfoDepth: number;
	lfoOffset: number;
	lfoTarget: string;
	filterEnabled: boolean;
	filterType: string;
	filterCutoff: number;
	filterResonance: number;
	filterEnvAmount: number;
	pitchBendRange: number;
	modWheelVibratoDepth: number;
};

type EngineParams = {
	lineSelect: string;
	modMode: string;
	octave: number;
	line1: LineParams;
	line2: LineParams;
	intPmAmount: number;
	intPmRatio: number;
	extPmAmount: number;
	pmPre: boolean;
	frequency: number;
	volume: number;
	polyMode: PolyMode;
	legato: boolean;
	velocityTarget: VelocityTarget;
	chorus: { enabled: boolean; rate: number; depth: number; mix: number };
	delay: { enabled: boolean; time: number; feedback: number; mix: number };
	reverb: { enabled: boolean; size: number; mix: number };
	vibrato: {
		enabled: boolean;
		waveform: number;
		rate: number;
		depth: number;
		delay: number;
	};
	portamento: { enabled: boolean; mode: string; rate: number; time: number };
	lfo: {
		enabled: boolean;
		waveform: number;
		rate: number;
		depth: number;
		offset: number;
		target: string;
	};
	filter: {
		enabled: boolean;
		type: string;
		cutoff: number;
		resonance: number;
		envAmount: number;
	};
	pitchBendRange: number;
	modWheelVibratoDepth: number;
};

type LineParams = {
	waveform: number;
	waveform2: number;
	algo2: string | null;
	algoBlend: number;
	window: string;
	dcaBase: number;
	dcwBase: number;
	dcoDepth: number;
	modulation: number;
	dcwComp: number;
	warpAlgo: string;
	detuneCents: number;
	octave: number;
	dcoEnv: StepEnvData;
	dcwEnv: StepEnvData;
	dcaEnv: StepEnvData;
	keyFollow: number;
};

export function useSynthParamsToWorklet({
	workletNodeRef,
	paramsRef,
	effectivePitchHz,
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
}: UseSynthParamsToWorkletParams) {
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

		const params: EngineParams = {
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
		paramsRef,
		workletNodeRef,
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
}
