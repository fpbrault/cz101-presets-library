import { useMemo } from "react";
import type { StepEnvData } from "@/components/pdAlgorithms";
import { useSynthEngineController } from "@/features/synth/engine/synthEngineAdapter";
import { buildSynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
import { createWorkletSynthEngineAdapter } from "@/features/synth/engine/workletSynthEngineAdapter";
import type { PolyMode, VelocityTarget } from "@/features/synth/useSynthState";
import type { EngineParams } from "./useAudioEngine";

type UseSynthParamsToWorkletParams = {
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	paramsRef: React.MutableRefObject<EngineParams>;
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
	lfoWaveform: string;
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
	const adapter = useMemo(
		() =>
			createWorkletSynthEngineAdapter({
				workletNodeRef,
				paramsRef,
			}),
		[workletNodeRef, paramsRef],
	);

	const snapshot = useMemo(
		() =>
			buildSynthEngineSnapshot({
				effectivePitchHz,
				extPmAmount,
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
			}),
		[
			effectivePitchHz,
			extPmAmount,
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
		],
	);

	useSynthEngineController({ adapter, snapshot });
}
