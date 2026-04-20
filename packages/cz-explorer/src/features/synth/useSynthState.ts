import { useCallback, useState } from "react";
import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
} from "@/components/pdAlgorithms";
import {
	DEFAULT_ALGO_REF,
	toAlgoRefV1,
} from "@/lib/synth/algoRef";
import type {
	AlgoRefV1,
	FilterType,
	LfoTarget,
	LfoWaveform,
	LineSelect,
	ModMode,
	PolyMode,
	PortamentoMode,
	StepEnvData,
	VelocityTarget,
	WindowType,
} from "@/lib/synth/bindings/synth";
import type { SynthPresetData } from "@/lib/synth/presetStorage";

export type { PolyMode, VelocityTarget };
export type UseSynthStateResult = {
	// Line 1 warping
	warpAAmount: number;
	setWarpAAmount: (v: number) => void;
	warpAAlgo: AlgoRefV1;
	setWarpAAlgo: (v: AlgoRefV1) => void;
	algo2A: AlgoRefV1 | null;
	setAlgo2A: (v: AlgoRefV1 | null) => void;
	algoBlendA: number;
	setAlgoBlendA: (v: number) => void;

	// Line 2 warping
	warpBAmount: number;
	setWarpBAmount: (v: number) => void;
	warpBAlgo: AlgoRefV1;
	setWarpBAlgo: (v: AlgoRefV1) => void;
	algo2B: AlgoRefV1 | null;
	setAlgo2B: (v: AlgoRefV1 | null) => void;
	algoBlendB: number;
	setAlgoBlendB: (v: number) => void;

	// Phase mod
	intPmAmount: number;
	setIntPmAmount: (v: number) => void;
	intPmRatio: number;
	setIntPmRatio: (v: number) => void;
	pmPre: boolean;
	setPmPre: (v: boolean) => void;
	phaseModEnabled: boolean;
	setPhaseModEnabled: (v: boolean) => void;

	// Window
	windowType: WindowType;
	setWindowType: (v: WindowType) => void;

	// Master volume
	volume: number;
	setVolume: (v: number) => void;

	// Line 1
	line1Level: number;
	setLine1Level: (v: number) => void;
	line1Octave: number;
	setLine1Octave: (v: number) => void;
	line1Detune: number;
	setLine1Detune: (v: number) => void;
	line1DcoDepth: number;
	setLine1DcoDepth: (v: number) => void;
	line1DcwComp: number;
	setLine1DcwComp: (v: number) => void;
	line1DcwKeyFollow: number;
	setLine1DcwKeyFollow: (v: number) => void;
	line1DcaKeyFollow: number;
	setLine1DcaKeyFollow: (v: number) => void;
	line1DcoEnv: StepEnvData;
	setLine1DcoEnv: (v: StepEnvData) => void;
	line1DcwEnv: StepEnvData;
	setLine1DcwEnv: (v: StepEnvData) => void;
	line1DcaEnv: StepEnvData;
	setLine1DcaEnv: (v: StepEnvData) => void;

	// Line 2
	line2Level: number;
	setLine2Level: (v: number) => void;
	line2Octave: number;
	setLine2Octave: (v: number) => void;
	line2Detune: number;
	setLine2Detune: (v: number) => void;
	line2DcoDepth: number;
	setLine2DcoDepth: (v: number) => void;
	line2DcwComp: number;
	setLine2DcwComp: (v: number) => void;
	line2DcwKeyFollow: number;
	setLine2DcwKeyFollow: (v: number) => void;
	line2DcaKeyFollow: number;
	setLine2DcaKeyFollow: (v: number) => void;
	line2DcoEnv: StepEnvData;
	setLine2DcoEnv: (v: StepEnvData) => void;
	line2DcwEnv: StepEnvData;
	setLine2DcwEnv: (v: StepEnvData) => void;
	line2DcaEnv: StepEnvData;
	setLine2DcaEnv: (v: StepEnvData) => void;

	// Modulation
	lineSelect: LineSelect;
	setLineSelect: (v: LineSelect) => void;
	modMode: ModMode;
	setModMode: (v: ModMode) => void;

	// Poly
	polyMode: PolyMode;
	setPolyMode: (v: PolyMode) => void;
	legato: boolean;
	setLegato: (v: boolean) => void;
	velocityTarget: VelocityTarget;
	setVelocityTarget: (v: VelocityTarget) => void;

	// Chorus
	chorusEnabled: boolean;
	setChorusEnabled: (v: boolean) => void;
	chorusRate: number;
	setChorusRate: (v: number) => void;
	chorusDepth: number;
	setChorusDepth: (v: number) => void;
	chorusMix: number;
	setChorusMix: (v: number) => void;

	// Delay
	delayEnabled: boolean;
	setDelayEnabled: (v: boolean) => void;
	delayTime: number;
	setDelayTime: (v: number) => void;
	delayFeedback: number;
	setDelayFeedback: (v: number) => void;
	delayMix: number;
	setDelayMix: (v: number) => void;

	// Reverb
	reverbEnabled: boolean;
	setReverbEnabled: (v: boolean) => void;
	reverbSize: number;
	setReverbSize: (v: number) => void;
	reverbMix: number;
	setReverbMix: (v: number) => void;

	// Vibrato
	vibratoEnabled: boolean;
	setVibratoEnabled: (v: boolean) => void;
	vibratoWave: number;
	setVibratoWave: (v: number) => void;
	vibratoRate: number;
	setVibratoRate: (v: number) => void;
	vibratoDepth: number;
	setVibratoDepth: (v: number) => void;
	vibratoDelay: number;
	setVibratoDelay: (v: number) => void;

	// Portamento
	portamentoEnabled: boolean;
	setPortamentoEnabled: (v: boolean) => void;
	portamentoMode: PortamentoMode;
	setPortamentoMode: (v: PortamentoMode) => void;
	portamentoRate: number;
	setPortamentoRate: (v: number) => void;
	portamentoTime: number;
	setPortamentoTime: (v: number) => void;

	// LFO
	lfoEnabled: boolean;
	setLfoEnabled: (v: boolean) => void;
	lfoWaveform: LfoWaveform;
	setLfoWaveform: (v: LfoWaveform) => void;
	lfoRate: number;
	setLfoRate: (v: number) => void;
	lfoDepth: number;
	setLfoDepth: (v: number) => void;
	lfoOffset: number;
	setLfoOffset: (v: number) => void;
	lfoTarget: LfoTarget;
	setLfoTarget: (v: LfoTarget) => void;

	// Filter
	filterEnabled: boolean;
	setFilterEnabled: (v: boolean) => void;
	filterType: FilterType;
	setFilterType: (v: FilterType) => void;
	filterCutoff: number;
	setFilterCutoff: (v: number) => void;
	filterResonance: number;
	setFilterResonance: (v: number) => void;
	filterEnvAmount: number;
	setFilterEnvAmount: (v: number) => void;

	// Pitch bend & mod wheel
	pitchBendRange: number;
	setPitchBendRange: (v: number) => void;
	modWheelVibratoDepth: number;
	setModWheelVibratoDepth: (v: number) => void;

	// Operations
	gatherState: () => SynthPresetData;
	applyPreset: (data: SynthPresetData) => void;
};

export function useSynthState(): UseSynthStateResult {
	// Line 1 warping
	const [warpAAmount, setWarpAAmount] = useState(0);
	const [warpAAlgo, setWarpAAlgo] = useState<AlgoRefV1>(DEFAULT_ALGO_REF);
	const [algo2A, setAlgo2A] = useState<AlgoRefV1 | null>(null);
	const [algoBlendA, setAlgoBlendA] = useState(0);

	// Line 2 warping
	const [warpBAmount, setWarpBAmount] = useState(0);
	const [warpBAlgo, setWarpBAlgo] = useState<AlgoRefV1>(DEFAULT_ALGO_REF);
	const [algo2B, setAlgo2B] = useState<AlgoRefV1 | null>(null);
	const [algoBlendB, setAlgoBlendB] = useState(0);

	// Phase mod
	const [intPmAmount, setIntPmAmount] = useState(0);
	const [intPmRatio, setIntPmRatio] = useState(1);
	const [pmPre, setPmPre] = useState(true);
	const [phaseModEnabled, setPhaseModEnabled] = useState(false);

	// Window
	const [windowType, setWindowType] = useState<WindowType>("off");

	// Master volume
	const [volume, setVolume] = useState(1);

	// Line 1
	const [line1Level, setLine1Level] = useState(1);
	const [line1Octave, setLine1Octave] = useState(0);
	const [line1Detune, setLine1Detune] = useState(0);
	const [line1DcoDepth, setLine1DcoDepth] = useState(0);
	const [line1DcwComp, setLine1DcwComp] = useState(0);
	const [line1DcwKeyFollow, setLine1DcwKeyFollow] = useState(0);
	const [line1DcaKeyFollow, setLine1DcaKeyFollow] = useState(0);
	const [line1DcoEnv, setLine1DcoEnv] = useState<StepEnvData>(DEFAULT_DCO_ENV);
	const [line1DcwEnv, setLine1DcwEnv] = useState<StepEnvData>(DEFAULT_DCW_ENV);
	const [line1DcaEnv, setLine1DcaEnv] = useState<StepEnvData>(DEFAULT_DCA_ENV);

	// Line 2
	const [line2Level, setLine2Level] = useState(1);
	const [line2Octave, setLine2Octave] = useState(0);
	const [line2Detune, setLine2Detune] = useState(0);
	const [line2DcoDepth, setLine2DcoDepth] = useState(0);
	const [line2DcwComp, setLine2DcwComp] = useState(0);
	const [line2DcwKeyFollow, setLine2DcwKeyFollow] = useState(0);
	const [line2DcaKeyFollow, setLine2DcaKeyFollow] = useState(0);
	const [line2DcoEnv, setLine2DcoEnv] = useState<StepEnvData>(DEFAULT_DCO_ENV);
	const [line2DcwEnv, setLine2DcwEnv] = useState<StepEnvData>(DEFAULT_DCW_ENV);
	const [line2DcaEnv, setLine2DcaEnv] = useState<StepEnvData>(DEFAULT_DCA_ENV);

	// Modulation
	const [lineSelect, setLineSelect] = useState<LineSelect>("L1+L2");
	const [modMode, setModMode] = useState<ModMode>("normal");

	// Poly
	const [polyMode, setPolyMode] = useState<PolyMode>("poly8");
	const [legato, setLegato] = useState(false);
	const [velocityTarget, setVelocityTarget] = useState<VelocityTarget>("amp");

	// Chorus
	const [chorusEnabled, setChorusEnabled] = useState(false);
	const [chorusRate, setChorusRate] = useState(0.8);
	const [chorusDepth, setChorusDepth] = useState(3);
	const [chorusMix, setChorusMix] = useState(0);

	// Delay
	const [delayEnabled, setDelayEnabled] = useState(false);
	const [delayTime, setDelayTime] = useState(0.3);
	const [delayFeedback, setDelayFeedback] = useState(0.35);
	const [delayMix, setDelayMix] = useState(0);

	// Reverb
	const [reverbEnabled, setReverbEnabled] = useState(false);
	const [reverbSize, setReverbSize] = useState(0.5);
	const [reverbMix, setReverbMix] = useState(0);

	// Vibrato
	const [vibratoEnabled, setVibratoEnabled] = useState(false);
	const [vibratoWave, setVibratoWave] = useState(1);
	const [vibratoRate, setVibratoRate] = useState(30);
	const [vibratoDepth, setVibratoDepth] = useState(30);
	const [vibratoDelay, setVibratoDelay] = useState(0);

	// Portamento
	const [portamentoEnabled, setPortamentoEnabled] = useState(false);
	const [portamentoMode, setPortamentoMode] = useState<PortamentoMode>("rate");
	const [portamentoRate, setPortamentoRate] = useState(50);
	const [portamentoTime, setPortamentoTime] = useState(0.5);

	// LFO
	const [lfoEnabled, setLfoEnabled] = useState(false);
	const [lfoWaveform, setLfoWaveform] = useState<LfoWaveform>("sine");
	const [lfoRate, setLfoRate] = useState(5);
	const [lfoDepth, setLfoDepth] = useState(0);
	const [lfoOffset, setLfoOffset] = useState(0);
	const [lfoTarget, setLfoTarget] = useState<LfoTarget>("pitch");

	// Filter
	const [filterEnabled, setFilterEnabled] = useState(false);
	const [filterType, setFilterType] = useState<FilterType>("lp");
	const [filterCutoff, setFilterCutoff] = useState(5000);
	const [filterResonance, setFilterResonance] = useState(0);
	const [filterEnvAmount, setFilterEnvAmount] = useState(0);

	// Pitch bend & mod wheel
	const [pitchBendRange, setPitchBendRange] = useState(2);
	const [modWheelVibratoDepth, setModWheelVibratoDepth] = useState(0);

	const gatherState = useCallback((): SynthPresetData => {
		return {
			warpAAmount,
			warpBAmount,
			warpAAlgo,
			warpBAlgo,
			algo2A: algo2A ?? null,
			algo2B: algo2B ?? null,
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
			lfoOffset,
			lfoTarget,
			filterEnabled,
			filterType,
			filterCutoff,
			filterResonance,
			filterEnvAmount,
			pitchBendRange,
			modWheelVibratoDepth,
		};
	}, [
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

	const applyPreset = useCallback((data: SynthPresetData) => {
		const safe = (v: unknown, fallback: number) =>
			typeof v === "number" && !Number.isNaN(v) ? v : fallback;

		setWarpAAmount(safe(data.warpAAmount, 0));
		setWarpBAmount(safe(data.warpBAmount, 0));
		setWarpAAlgo(toAlgoRefV1(data.warpAAlgo, DEFAULT_ALGO_REF));
		setWarpBAlgo(toAlgoRefV1(data.warpBAlgo, DEFAULT_ALGO_REF));
		setAlgo2A(data.algo2A != null ? toAlgoRefV1(data.algo2A) : null);
		setAlgo2B(data.algo2B != null ? toAlgoRefV1(data.algo2B) : null);
		setAlgoBlendA(safe(data.algoBlendA, 0));
		setAlgoBlendB(safe(data.algoBlendB, 0));
		setIntPmAmount(safe(data.intPmAmount, 0));
		setIntPmRatio(safe(data.intPmRatio, 1));
		setPhaseModEnabled(data.phaseModEnabled ?? false);
		setPmPre(data.pmPre ?? true);
		setWindowType((data.windowType as WindowType) ?? "off");
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
		setChorusEnabled(data.chorusEnabled ?? false);
		setChorusMix(safe(data.chorusMix, 0));
		setDelayTime(safe(data.delayTime, 0.3));
		setDelayFeedback(safe(data.delayFeedback, 0.35));
		setDelayEnabled(data.delayEnabled ?? false);
		setDelayMix(safe(data.delayMix, 0));
		setReverbSize(safe(data.reverbSize, 0.5));
		setReverbEnabled(data.reverbEnabled ?? false);
		setReverbMix(safe(data.reverbMix, 0));
		setLineSelect(data.lineSelect ?? "L1+L2");
		setModMode((data.modMode as ModMode) ?? "normal");
		setLine1DcwKeyFollow(safe(data.line1DcwKeyFollow, 0));
		setLine1DcaKeyFollow(safe(data.line1DcaKeyFollow, 0));
		setLine2DcwKeyFollow(safe(data.line2DcwKeyFollow, 0));
		setLine2DcaKeyFollow(safe(data.line2DcaKeyFollow, 0));
		setVibratoEnabled(data.vibratoEnabled ?? false);
		setVibratoWave(safe(data.vibratoWave, 1) as number);
		setVibratoRate(safe(data.vibratoRate, 30));
		setVibratoDepth(safe(data.vibratoDepth, 30));
		setVibratoDelay(safe(data.vibratoDelay, 0));
		setPortamentoEnabled(data.portamentoEnabled ?? false);
		setPortamentoMode((data.portamentoMode as PortamentoMode) ?? "rate");
		setPortamentoRate(safe(data.portamentoRate, 50));
		setPortamentoTime(safe(data.portamentoTime, 0.5));
		setLfoEnabled(data.lfoEnabled ?? false);
		setLfoWaveform((data.lfoWaveform as LfoWaveform) ?? "sine");
		setLfoRate(safe(data.lfoRate, 5));
		setLfoDepth(safe(data.lfoDepth, 0));
		setLfoOffset(safe(data.lfoOffset, 0));
		setLfoTarget((data.lfoTarget as LfoTarget) ?? "pitch");
		setFilterEnabled(data.filterEnabled ?? false);
		setFilterType((data.filterType as FilterType) ?? "lp");
		setFilterCutoff(safe(data.filterCutoff, 5000));
		setFilterResonance(safe(data.filterResonance, 0));
		setFilterEnvAmount(safe(data.filterEnvAmount, 0));
		setPitchBendRange(safe(data.pitchBendRange, 2));
		setModWheelVibratoDepth(safe(data.modWheelVibratoDepth, 0));
	}, []);

	return {
		warpAAmount,
		setWarpAAmount,
		warpAAlgo,
		setWarpAAlgo,
		algo2A,
		setAlgo2A,
		algoBlendA,
		setAlgoBlendA,
		warpBAmount,
		setWarpBAmount,
		warpBAlgo,
		setWarpBAlgo,
		algo2B,
		setAlgo2B,
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
		setWindowType,
		volume,
		setVolume,
		line1Level,
		setLine1Level,
		line1Octave,
		setLine1Octave,
		line1Detune,
		setLine1Detune,
		line1DcoDepth,
		setLine1DcoDepth,
		line1DcwComp,
		setLine1DcwComp,
		line1DcwKeyFollow,
		setLine1DcwKeyFollow,
		line1DcaKeyFollow,
		setLine1DcaKeyFollow,
		line1DcoEnv,
		setLine1DcoEnv,
		line1DcwEnv,
		setLine1DcwEnv,
		line1DcaEnv,
		setLine1DcaEnv,
		line2Level,
		setLine2Level,
		line2Octave,
		setLine2Octave,
		line2Detune,
		setLine2Detune,
		line2DcoDepth,
		setLine2DcoDepth,
		line2DcwComp,
		setLine2DcwComp,
		line2DcwKeyFollow,
		setLine2DcwKeyFollow,
		line2DcaKeyFollow,
		setLine2DcaKeyFollow,
		line2DcoEnv,
		setLine2DcoEnv,
		line2DcwEnv,
		setLine2DcwEnv,
		line2DcaEnv,
		setLine2DcaEnv,
		lineSelect,
		setLineSelect,
		modMode,
		setModMode,
		polyMode,
		setPolyMode,
		legato,
		setLegato,
		velocityTarget,
		setVelocityTarget,
		chorusEnabled,
		setChorusEnabled,
		chorusRate,
		setChorusRate,
		chorusDepth,
		setChorusDepth,
		chorusMix,
		setChorusMix,
		delayEnabled,
		setDelayEnabled,
		delayTime,
		setDelayTime,
		delayFeedback,
		setDelayFeedback,
		delayMix,
		setDelayMix,
		reverbEnabled,
		setReverbEnabled,
		reverbSize,
		setReverbSize,
		reverbMix,
		setReverbMix,
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
	};
}
