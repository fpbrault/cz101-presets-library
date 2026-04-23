import { useCallback, useState } from "react";
import {
	DEFAULT_ALGO_REF,
	legacyCzAlgoToWaveform,
	normalizeWaveformId,
	toAlgoRefV1,
} from "@/lib/synth/algoRef";
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
	SynthPresetV1,
	VelocityTarget,
	WindowType,
} from "@/lib/synth/bindings/synth";
import { ALGO_DEFINITIONS_V1 } from "@/lib/synth/bindings/synth";
import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
} from "@/lib/synth/pdAlgorithms";

export type { PolyMode, VelocityTarget };

type AlgoControlRuntime = {
	id: string;
	kind?: "number" | "select" | "toggle";
	controlType?: "knob" | "slider" | "buttonGroup" | "dropdown";
	bipolar?: boolean;
	iconName?: string | null;
	default?: number | null;
	min?: number | null;
};

type AlgoDefinitionRuntime = {
	id: Algo;
	controls: AlgoControlRuntime[];
};

function normalizeAlgoControls(
	algo: Algo,
	values: AlgoControlValueV1[] | null | undefined,
): AlgoControlValueV1[] {
	const definitions = ALGO_DEFINITIONS_V1 as unknown as AlgoDefinitionRuntime[];
	const definition = definitions.find((entry) => entry.id === algo);
	if (!definition) {
		return [];
	}

	const incoming = new Map(
		(values ?? []).map((entry) => [entry.id, entry.value]),
	);
	return definition.controls
		.filter((control) => (control.kind ?? "number") === "number")
		.map((control) => ({
			id: control.id,
			value: incoming.get(control.id) ?? control.default ?? control.min ?? 0,
		}));
}

function inferCzWaveform(
	algoValue: unknown,
	explicitWaveform: unknown,
	fallback: CzWaveform,
): CzWaveform {
	if (typeof explicitWaveform === "string") {
		return normalizeWaveformId(explicitWaveform);
	}

	if (typeof algoValue === "string") {
		const legacyWaveform = legacyCzAlgoToWaveform(algoValue);
		if (legacyWaveform) {
			return legacyWaveform;
		}
		return normalizeWaveformId(algoValue);
	}

	return fallback;
}

export function useSynthState() {
	const [warpAAmount, setWarpAAmount] = useState(0);
	const [warpAAlgo, setWarpAAlgo] = useState<Algo>(DEFAULT_ALGO_REF);
	const [algo2A, setAlgo2A] = useState<Algo | null>(null);
	const [algoBlendA, setAlgoBlendA] = useState(0);

	const [warpBAmount, setWarpBAmount] = useState(0);
	const [warpBAlgo, setWarpBAlgo] = useState<Algo>(DEFAULT_ALGO_REF);
	const [algo2B, setAlgo2B] = useState<Algo | null>(null);
	const [algoBlendB, setAlgoBlendB] = useState(0);

	const [intPmAmount, setIntPmAmount] = useState(0);
	const [intPmRatio, setIntPmRatio] = useState(1);
	const [pmPre, setPmPre] = useState(true);
	const [phaseModEnabled, setPhaseModEnabled] = useState(false);

	const [windowType, setWindowType] = useState<WindowType>("off");

	const [volume, setVolume] = useState(1);

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
	const [line1CzSlotAWaveform, setLine1CzSlotAWaveform] =
		useState<CzWaveform>("saw");
	const [line1CzSlotBWaveform, setLine1CzSlotBWaveform] =
		useState<CzWaveform>("saw");
	const [line1CzWindow, setLine1CzWindow] = useState<WindowType>("off");
	const [line1AlgoControls, setLine1AlgoControls] = useState<
		AlgoControlValueV1[]
	>([]);

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
	const [line2CzSlotAWaveform, setLine2CzSlotAWaveform] =
		useState<CzWaveform>("saw");
	const [line2CzSlotBWaveform, setLine2CzSlotBWaveform] =
		useState<CzWaveform>("saw");
	const [line2CzWindow, setLine2CzWindow] = useState<WindowType>("off");
	const [line2AlgoControls, setLine2AlgoControls] = useState<
		AlgoControlValueV1[]
	>([]);

	const [lineSelect, setLineSelect] = useState<LineSelect>("L1+L2");
	const [modMode, setModMode] = useState<ModMode>("normal");

	const [polyMode, setPolyMode] = useState<PolyMode>("poly8");
	const [legato, setLegato] = useState(false);
	const [velocityTarget, setVelocityTarget] = useState<VelocityTarget>("amp");

	const [chorusEnabled, setChorusEnabled] = useState(false);
	const [chorusRate, setChorusRate] = useState(0.8);
	const [chorusDepth, setChorusDepth] = useState(3);
	const [chorusMix, setChorusMix] = useState(0);

	const [delayEnabled, setDelayEnabled] = useState(false);
	const [delayTime, setDelayTime] = useState(0.3);
	const [delayFeedback, setDelayFeedback] = useState(0.35);
	const [delayMix, setDelayMix] = useState(0);

	const [reverbEnabled, setReverbEnabled] = useState(false);
	const [reverbSize, setReverbSize] = useState(0.5);
	const [reverbMix, setReverbMix] = useState(0);

	const [vibratoEnabled, setVibratoEnabled] = useState(false);
	const [vibratoWave, setVibratoWave] = useState(1);
	const [vibratoRate, setVibratoRate] = useState(30);
	const [vibratoDepth, setVibratoDepth] = useState(30);
	const [vibratoDelay, setVibratoDelay] = useState(0);

	const [portamentoEnabled, setPortamentoEnabled] = useState(false);
	const [portamentoMode, setPortamentoMode] = useState<PortamentoMode>("rate");
	const [portamentoRate, setPortamentoRate] = useState(50);
	const [portamentoTime, setPortamentoTime] = useState(0.5);

	const [lfoEnabled, setLfoEnabled] = useState(false);
	const [lfoWaveform, setLfoWaveform] = useState<LfoWaveform>("sine");
	const [lfoRate, setLfoRate] = useState(5);
	const [lfoDepth, setLfoDepth] = useState(0);
	const [lfoOffset, setLfoOffset] = useState(0);
	const [lfoTarget, setLfoTarget] = useState<LfoTarget>("pitch");

	const [filterEnabled, setFilterEnabled] = useState(false);
	const [filterType, setFilterType] = useState<FilterType>("lp");
	const [filterCutoff, setFilterCutoff] = useState(5000);
	const [filterResonance, setFilterResonance] = useState(0);
	const [filterEnvAmount, setFilterEnvAmount] = useState(0);

	const [pitchBendRange, setPitchBendRange] = useState(2);
	const [modWheelVibratoDepth, setModWheelVibratoDepth] = useState(0);
	const [modMatrix, setModMatrix] = useState<ModMatrix>({ routes: [] });

	const gatherState = useCallback((): SynthPresetV1 => {
		const line1NormalizedAlgoControls = normalizeAlgoControls(
			warpAAlgo,
			line1AlgoControls,
		);
		const line2NormalizedAlgoControls = normalizeAlgoControls(
			warpBAlgo,
			line2AlgoControls,
		);

		return {
			schemaVersion: 1,
			params: {
				lineSelect,
				modMode,
				octave: 0,
				line1: {
					algo: warpAAlgo,
					algo2: algo2A,
					algoBlend: algoBlendA,
					dcwComp: line1DcwComp,
					window: windowType,
					dcaBase: line1Level,
					dcwBase: warpAAmount,
					dcoDepth: line1DcoDepth,
					modulation: 0,
					detuneCents: line1Detune,
					octave: line1Octave,
					dcoEnv: line1DcoEnv,
					dcwEnv: line1DcwEnv,
					dcaEnv: line1DcaEnv,
					keyFollow: line1DcwKeyFollow,
					cz: {
						slotAWaveform: line1CzSlotAWaveform,
						slotBWaveform: line1CzSlotBWaveform,
						window: line1CzWindow,
					},
					algoControls: line1NormalizedAlgoControls,
				},
				line2: {
					algo: warpBAlgo,
					algo2: algo2B,
					algoBlend: algoBlendB,
					dcwComp: line2DcwComp,
					window: windowType,
					dcaBase: line2Level,
					dcwBase: warpBAmount,
					dcoDepth: line2DcoDepth,
					modulation: 0,
					detuneCents: line2Detune,
					octave: line2Octave,
					dcoEnv: line2DcoEnv,
					dcwEnv: line2DcwEnv,
					dcaEnv: line2DcaEnv,
					keyFollow: line2DcwKeyFollow,
					cz: {
						slotAWaveform: line2CzSlotAWaveform,
						slotBWaveform: line2CzSlotBWaveform,
						window: line2CzWindow,
					},
					algoControls: line2NormalizedAlgoControls,
				},
				intPmAmount: phaseModEnabled ? intPmAmount : 0,
				intPmRatio,
				extPmAmount: 0,
				pmPre,
				frequency: 440,
				volume,
				polyMode,
				legato,
				velocityTarget,
				chorus: {
					rate: chorusRate,
					depth: chorusDepth,
					mix: chorusEnabled ? chorusMix : 0,
				},
				delay: {
					time: delayTime,
					feedback: delayFeedback,
					mix: delayEnabled ? delayMix : 0,
				},
				reverb: {
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
				modMatrix,
			},
		};
	}, [
		algo2A,
		algo2B,
		algoBlendA,
		algoBlendB,
		chorusDepth,
		chorusEnabled,
		chorusMix,
		chorusRate,
		delayEnabled,
		delayFeedback,
		delayMix,
		delayTime,
		filterCutoff,
		filterEnabled,
		filterEnvAmount,
		filterResonance,
		filterType,
		intPmAmount,
		intPmRatio,
		legato,
		lfoDepth,
		lfoEnabled,
		lfoOffset,
		lfoRate,
		lfoTarget,
		lfoWaveform,
		line1CzSlotAWaveform,
		line1CzSlotBWaveform,
		line1CzWindow,
		line1AlgoControls,
		line1DcaEnv,
		line1DcoDepth,
		line1DcoEnv,
		line1DcwComp,
		line1DcwEnv,
		line1DcwKeyFollow,
		line1Detune,
		line1Level,
		line1Octave,
		line2CzSlotAWaveform,
		line2CzSlotBWaveform,
		line2CzWindow,
		line2AlgoControls,
		line2DcaEnv,
		line2DcoDepth,
		line2DcoEnv,
		line2DcwComp,
		line2DcwEnv,
		line2DcwKeyFollow,
		line2Detune,
		line2Level,
		line2Octave,
		lineSelect,
		modMode,
		modWheelVibratoDepth,
		modMatrix,
		phaseModEnabled,
		pitchBendRange,
		pmPre,
		polyMode,
		portamentoEnabled,
		portamentoMode,
		portamentoRate,
		portamentoTime,
		reverbEnabled,
		reverbMix,
		reverbSize,
		velocityTarget,
		vibratoDelay,
		vibratoDepth,
		vibratoEnabled,
		vibratoRate,
		vibratoWave,
		volume,
		warpAAlgo,
		warpAAmount,
		warpBAlgo,
		warpBAmount,
		windowType,
	]);

	const applyPreset = useCallback((preset: SynthPresetV1) => {
		if (
			typeof preset !== "object" ||
			preset === null ||
			typeof preset.params !== "object" ||
			preset.params === null ||
			typeof preset.params.line1 !== "object" ||
			preset.params.line1 === null ||
			typeof preset.params.line2 !== "object" ||
			preset.params.line2 === null
		) {
			return;
		}
		const p = preset.params;
		const safe = (v: unknown, fallback: number) =>
			typeof v === "number" && !Number.isNaN(v) ? v : fallback;
		const line1PrimaryAlgo = toAlgoRefV1(
			p.line1?.algo ?? DEFAULT_ALGO_REF,
			DEFAULT_ALGO_REF,
		);
		const line2PrimaryAlgo = toAlgoRefV1(
			p.line2?.algo ?? DEFAULT_ALGO_REF,
			DEFAULT_ALGO_REF,
		);
		const line1SecondaryAlgo =
			p.line1?.algo2 == null
				? null
				: toAlgoRefV1(p.line1.algo2, DEFAULT_ALGO_REF);
		const line2SecondaryAlgo =
			p.line2?.algo2 == null
				? null
				: toAlgoRefV1(p.line2.algo2, DEFAULT_ALGO_REF);
		const line1SlotAWaveform = inferCzWaveform(
			p.line1?.algo,
			p.line1?.cz?.slotAWaveform,
			"saw",
		);
		const line1SlotBWaveform = inferCzWaveform(
			p.line1?.algo2,
			p.line1?.cz?.slotBWaveform,
			"saw",
		);
		const line2SlotAWaveform = inferCzWaveform(
			p.line2?.algo,
			p.line2?.cz?.slotAWaveform,
			"saw",
		);
		const line2SlotBWaveform = inferCzWaveform(
			p.line2?.algo2,
			p.line2?.cz?.slotBWaveform,
			"saw",
		);

		setWarpAAmount(safe(p.line1?.dcwBase, 0));
		setWarpBAmount(safe(p.line2?.dcwBase, 0));
		setWarpAAlgo(line1PrimaryAlgo);
		setWarpBAlgo(line2PrimaryAlgo);
		setAlgo2A(line1SecondaryAlgo);
		setAlgo2B(line2SecondaryAlgo);
		setAlgoBlendA(safe(p.line1?.algoBlend, 0));
		setAlgoBlendB(safe(p.line2?.algoBlend, 0));
		setIntPmAmount(safe(p.intPmAmount, 0));
		setIntPmRatio(safe(p.intPmRatio, 1));
		setPhaseModEnabled(safe(p.intPmAmount, 0) > 0);
		setPmPre(p.pmPre ?? true);
		setWindowType((p.line1?.window as WindowType) ?? "off");
		setVolume(safe(p.volume, 1));
		setLine1Level(safe(p.line1?.dcaBase, 1));
		setLine2Level(safe(p.line2?.dcaBase, 1));
		setLine1Octave(safe(p.line1?.octave, 0));
		setLine2Octave(safe(p.line2?.octave, 0));
		setLine1Detune(safe(p.line1?.detuneCents, 0));
		setLine2Detune(safe(p.line2?.detuneCents, 0));
		setLine1DcoDepth(safe(p.line1?.dcoDepth, 0));
		setLine2DcoDepth(safe(p.line2?.dcoDepth, 0));
		setLine1DcwComp(safe(p.line1?.dcwComp, 0));
		setLine2DcwComp(safe(p.line2?.dcwComp, 0));
		setLine1DcoEnv(p.line1?.dcoEnv ?? DEFAULT_DCO_ENV);
		setLine1DcwEnv(p.line1?.dcwEnv ?? DEFAULT_DCW_ENV);
		setLine1DcaEnv(p.line1?.dcaEnv ?? DEFAULT_DCA_ENV);
		setLine1CzSlotAWaveform(line1SlotAWaveform);
		setLine1CzSlotBWaveform(line1SlotBWaveform);
		setLine1CzWindow((p.line1?.cz?.window as WindowType) ?? "off");
		setLine1AlgoControls(
			normalizeAlgoControls(line1PrimaryAlgo, p.line1?.algoControls ?? []),
		);
		setLine2DcoEnv(p.line2?.dcoEnv ?? DEFAULT_DCO_ENV);
		setLine2DcwEnv(p.line2?.dcwEnv ?? DEFAULT_DCW_ENV);
		setLine2DcaEnv(p.line2?.dcaEnv ?? DEFAULT_DCA_ENV);
		setLine2CzSlotAWaveform(line2SlotAWaveform);
		setLine2CzSlotBWaveform(line2SlotBWaveform);
		setLine2CzWindow((p.line2?.cz?.window as WindowType) ?? "off");
		setLine2AlgoControls(
			normalizeAlgoControls(line2PrimaryAlgo, p.line2?.algoControls ?? []),
		);
		setPolyMode((p.polyMode as PolyMode) ?? "poly8");
		setLegato(p.legato ?? false);
		setVelocityTarget((p.velocityTarget as VelocityTarget) ?? "amp");
		setChorusRate(safe(p.chorus?.rate, 0.8));
		setChorusDepth(safe(p.chorus?.depth, 3));
		setChorusMix(safe(p.chorus?.mix, 0));
		setChorusEnabled(safe(p.chorus?.mix, 0) > 0);
		setDelayTime(safe(p.delay?.time, 0.3));
		setDelayFeedback(safe(p.delay?.feedback, 0.35));
		setDelayMix(safe(p.delay?.mix, 0));
		setDelayEnabled(safe(p.delay?.mix, 0) > 0);
		setReverbSize(safe(p.reverb?.size, 0.5));
		setReverbMix(safe(p.reverb?.mix, 0));
		setReverbEnabled(safe(p.reverb?.mix, 0) > 0);
		setLineSelect((p.lineSelect as LineSelect) ?? "L1+L2");
		setModMode((p.modMode as ModMode) ?? "normal");
		setLine1DcwKeyFollow(safe(p.line1?.keyFollow, 0));
		setLine1DcaKeyFollow(0);
		setLine2DcwKeyFollow(safe(p.line2?.keyFollow, 0));
		setLine2DcaKeyFollow(0);
		setVibratoEnabled(p.vibrato?.enabled ?? false);
		setVibratoWave(safe(p.vibrato?.waveform, 1));
		setVibratoRate(safe(p.vibrato?.rate, 30));
		setVibratoDepth(safe(p.vibrato?.depth, 30));
		setVibratoDelay(safe(p.vibrato?.delay, 0));
		setPortamentoEnabled(p.portamento?.enabled ?? false);
		setPortamentoMode((p.portamento?.mode as PortamentoMode) ?? "rate");
		setPortamentoRate(safe(p.portamento?.rate, 50));
		setPortamentoTime(safe(p.portamento?.time, 0.5));
		setLfoEnabled(p.lfo?.enabled ?? false);
		setLfoWaveform((p.lfo?.waveform as LfoWaveform) ?? "sine");
		setLfoRate(safe(p.lfo?.rate, 5));
		setLfoDepth(safe(p.lfo?.depth, 0));
		setLfoOffset(safe(p.lfo?.offset, 0));
		setLfoTarget((p.lfo?.target as LfoTarget) ?? "pitch");
		setFilterEnabled(p.filter?.enabled ?? false);
		setFilterType((p.filter?.type as FilterType) ?? "lp");
		setFilterCutoff(safe(p.filter?.cutoff, 5000));
		setFilterResonance(safe(p.filter?.resonance, 0));
		setFilterEnvAmount(safe(p.filter?.envAmount, 0));
		setPitchBendRange(safe(p.pitchBendRange, 2));
		setModWheelVibratoDepth(safe(p.modWheelVibratoDepth, 0));
		setModMatrix(
			p.modMatrix && typeof p.modMatrix === "object"
				? (p.modMatrix as ModMatrix)
				: { routes: [] },
		);
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
		line1CzSlotAWaveform,
		setLine1CzSlotAWaveform,
		line1CzSlotBWaveform,
		setLine1CzSlotBWaveform,
		line1CzWindow,
		setLine1CzWindow,
		line1AlgoControls,
		setLine1AlgoControls,
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
		line2CzSlotAWaveform,
		setLine2CzSlotAWaveform,
		line2CzSlotBWaveform,
		setLine2CzSlotBWaveform,
		line2CzWindow,
		setLine2CzWindow,
		line2AlgoControls,
		setLine2AlgoControls,
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
		modMatrix,
		setModMatrix,
		gatherState,
		applyPreset,
	};
}

export type UseSynthStateResult = ReturnType<typeof useSynthState>;
