import type { PolyMode, VelocityTarget } from "@/features/synth/useSynthState";
import type {
	Algo,
	AlgoControlValueV1,
	CzWaveform,
	FilterType,
	LfoTarget,
	LfoWaveform,
	LineSelect,
	ModMode,
	PortamentoMode,
	StepEnvData,
	WindowType,
} from "@/lib/synth/bindings/synth";

type BuildSynthEngineSnapshotParams = {
	effectivePitchHz: number;
	extPmAmount: number;
	lineSelect: LineSelect;
	modMode: ModMode;
	warpAAmount: number;
	warpBAmount: number;
	line1Level: number;
	line2Level: number;
	line1DcoDepth: number;
	line2DcoDepth: number;
	line1DcwComp: number;
	line2DcwComp: number;
	warpAAlgo: Algo;
	warpBAlgo: Algo;
	intPmAmount: number;
	intPmRatio: number;
	phaseModEnabled: boolean;
	pmPre: boolean;
	windowType: WindowType;
	volume: number;
	line1Detune: number;
	line2Detune: number;
	line1Octave: number;
	line2Octave: number;
	line1DcoEnv: StepEnvData;
	line1DcwEnv: StepEnvData;
	line1DcaEnv: StepEnvData;
	line1CzSlotAWaveform: CzWaveform;
	line1CzSlotBWaveform: CzWaveform;
	line1CzWindow: WindowType;
	line1AlgoControls: AlgoControlValueV1[];
	line2DcoEnv: StepEnvData;
	line2DcwEnv: StepEnvData;
	line2DcaEnv: StepEnvData;
	line2CzSlotAWaveform: CzWaveform;
	line2CzSlotBWaveform: CzWaveform;
	line2CzWindow: WindowType;
	line2AlgoControls: AlgoControlValueV1[];
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
	algo2A: Algo | null;
	algo2B: Algo | null;
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
	portamentoMode: PortamentoMode;
	portamentoRate: number;
	portamentoTime: number;
	lfoEnabled: boolean;
	lfoWaveform: LfoWaveform;
	lfoRate: number;
	lfoDepth: number;
	lfoOffset: number;
	lfoTarget: LfoTarget;
	filterEnabled: boolean;
	filterType: FilterType;
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
