import type { PolyMode, VelocityTarget } from "@/features/synth/useSynthState";
import type { StepEnvData } from "@/lib/synth/bindings/synth";

type BuildSynthEngineSnapshotParams = {
	effectivePitchHz: number;
	extPmAmount: number;
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

export type SynthEngineSnapshot = BuildSynthEngineSnapshotParams;

export function buildSynthEngineSnapshot(
	params: BuildSynthEngineSnapshotParams,
): SynthEngineSnapshot {
	return params;
}
