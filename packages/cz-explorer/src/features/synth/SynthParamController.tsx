import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
} from "react";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";

const SYNTH_PARAM_SETTERS = {
	lineSelect: "setLineSelect",
	modMode: "setModMode",
	warpAAmount: "setWarpAAmount",
	warpBAmount: "setWarpBAmount",
	warpAAlgo: "setWarpAAlgo",
	warpBAlgo: "setWarpBAlgo",
	algo2A: "setAlgo2A",
	algo2B: "setAlgo2B",
	algoBlendA: "setAlgoBlendA",
	algoBlendB: "setAlgoBlendB",
	line1Level: "setLine1Level",
	line2Level: "setLine2Level",
	line1Octave: "setLine1Octave",
	line2Octave: "setLine2Octave",
	line1Detune: "setLine1Detune",
	line2Detune: "setLine2Detune",
	line1DcoDepth: "setLine1DcoDepth",
	line2DcoDepth: "setLine2DcoDepth",
	line1DcwComp: "setLine1DcwComp",
	line2DcwComp: "setLine2DcwComp",
	line1DcoEnv: "setLine1DcoEnv",
	line1DcwEnv: "setLine1DcwEnv",
	line1DcaEnv: "setLine1DcaEnv",
	line1CzSlotAWaveform: "setLine1CzSlotAWaveform",
	line1CzSlotBWaveform: "setLine1CzSlotBWaveform",
	line1CzWindow: "setLine1CzWindow",
	line1AlgoControls: "setLine1AlgoControls",
	line2DcoEnv: "setLine2DcoEnv",
	line2DcwEnv: "setLine2DcwEnv",
	line2DcaEnv: "setLine2DcaEnv",
	line2CzSlotAWaveform: "setLine2CzSlotAWaveform",
	line2CzSlotBWaveform: "setLine2CzSlotBWaveform",
	line2CzWindow: "setLine2CzWindow",
	line2AlgoControls: "setLine2AlgoControls",
	line1DcwKeyFollow: "setLine1DcwKeyFollow",
	line2DcwKeyFollow: "setLine2DcwKeyFollow",
	volume: "setVolume",
	polyMode: "setPolyMode",
	velocityTarget: "setVelocityTarget",
	pitchBendRange: "setPitchBendRange",
	modWheelVibratoDepth: "setModWheelVibratoDepth",
	phaseModEnabled: "setPhaseModEnabled",
	windowType: "setWindowType",
	intPmAmount: "setIntPmAmount",
	intPmRatio: "setIntPmRatio",
	pmPre: "setPmPre",
	vibratoEnabled: "setVibratoEnabled",
	vibratoWave: "setVibratoWave",
	vibratoRate: "setVibratoRate",
	vibratoDepth: "setVibratoDepth",
	vibratoDelay: "setVibratoDelay",
	portamentoEnabled: "setPortamentoEnabled",
	portamentoMode: "setPortamentoMode",
	portamentoRate: "setPortamentoRate",
	portamentoTime: "setPortamentoTime",
	lfoEnabled: "setLfoEnabled",
	lfoWaveform: "setLfoWaveform",
	lfoRate: "setLfoRate",
	lfoDepth: "setLfoDepth",
	lfoOffset: "setLfoOffset",
	lfoTarget: "setLfoTarget",
	filterEnabled: "setFilterEnabled",
	filterType: "setFilterType",
	filterCutoff: "setFilterCutoff",
	filterResonance: "setFilterResonance",
	filterEnvAmount: "setFilterEnvAmount",
	chorusEnabled: "setChorusEnabled",
	chorusRate: "setChorusRate",
	chorusDepth: "setChorusDepth",
	chorusMix: "setChorusMix",
	delayEnabled: "setDelayEnabled",
	delayTime: "setDelayTime",
	delayFeedback: "setDelayFeedback",
	delayMix: "setDelayMix",
	reverbEnabled: "setReverbEnabled",
	reverbSize: "setReverbSize",
	reverbMix: "setReverbMix",
} as const;

export type SynthParamKey = keyof typeof SYNTH_PARAM_SETTERS;

type ReadoutValue = string | number | boolean;

type SynthParamController = {
	getParam: <K extends SynthParamKey>(key: K) => UseSynthStateResult[K];
	setParam: <K extends SynthParamKey>(
		key: K,
		value: UseSynthStateResult[K],
	) => void;
};

const SynthParamControllerContext = createContext<SynthParamController | null>(
	null,
);

type SynthParamControllerProviderProps = {
	children: ReactNode;
	synthState: UseSynthStateResult;
	onControlReadout?: (key: string, value: ReadoutValue) => void;
};

export function SynthParamControllerProvider({
	children,
	synthState,
	onControlReadout,
}: SynthParamControllerProviderProps) {
	const getParam = useCallback(
		<K extends SynthParamKey>(key: K): UseSynthStateResult[K] => {
			return synthState[key];
		},
		[synthState],
	);

	const setParam = useCallback(
		<K extends SynthParamKey>(key: K, value: UseSynthStateResult[K]) => {
			const setterName = SYNTH_PARAM_SETTERS[key];
			const setter = synthState[setterName] as (
				next: UseSynthStateResult[K],
			) => void;
			setter(value);

			if (
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				onControlReadout?.(key, value as ReadoutValue);
			}
		},
		[synthState, onControlReadout],
	);

	const controller = useMemo(
		() => ({ getParam, setParam }),
		[getParam, setParam],
	);

	return (
		<SynthParamControllerContext.Provider value={controller}>
			{children}
		</SynthParamControllerContext.Provider>
	);
}

export function useSynthParam<K extends SynthParamKey>(
	key: K,
): {
	value: UseSynthStateResult[K];
	setValue: (value: UseSynthStateResult[K]) => void;
} {
	const controller = useContext(SynthParamControllerContext);
	if (!controller) {
		throw new Error(
			"useSynthParam must be used within SynthParamControllerProvider",
		);
	}

	return {
		value: controller.getParam(key),
		setValue: (value) => controller.setParam(key, value),
	};
}
