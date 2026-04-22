import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useOptionalModMatrix } from "@/context/ModMatrixContext";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";
import type { ModDestination, ModSource } from "@/lib/synth/bindings/synth";
import {
	type ModTarget,
	resolveModDestination,
} from "@/lib/synth/modDestination";

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

type LiveModSources = Readonly<{
	lfo1: number;
	lfo2: number;
	velocity: number;
	modWheel: number;
	aftertouch: number;
}>;

type SynthParamController = {
	getParam: <K extends SynthParamKey>(key: K) => UseSynthStateResult[K];
	setParam: <K extends SynthParamKey>(
		key: K,
		value: UseSynthStateResult[K],
	) => void;
	resolveDestination: (
		target: ModTarget | undefined,
		options?: { lineIndex?: 1 | 2 },
	) => ModDestination | undefined;
	getRouteCount: (destination: ModDestination | undefined) => number;
	hasActiveRoutes: (destination: ModDestination | undefined) => boolean;
	getLiveSources: () => LiveModSources;
	getModulatedValue: (params: {
		destination: ModDestination | undefined;
		baseValue: number;
	}) => number | undefined;
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
	const maybeModMatrix = useOptionalModMatrix();
	const modRoutes = maybeModMatrix?.modMatrix.routes ?? [];
	const [velocityValue, setVelocityValue] = useState(0);
	const [modWheelValue, setModWheelValue] = useState(0);
	const [aftertouchValue, setAftertouchValue] = useState(0);
	const [animTimeSec, setAnimTimeSec] = useState(() =>
		typeof performance !== "undefined" ? performance.now() / 1000 : 0,
	);

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

	const hasAnyLfo1Routes = useMemo(() => {
		return modRoutes.some(
			(route) => route.enabled && route.source === "lfo1",
		);
	}, [modRoutes]);

	useEffect(() => {
		if (
			!(hasAnyLfo1Routes && synthState.lfoEnabled && synthState.lfoRate > 0)
		) {
			return;
		}

		let rafId = 0;
		const animate = (ts: number) => {
			setAnimTimeSec(ts / 1000);
			rafId = window.requestAnimationFrame(animate);
		};
		rafId = window.requestAnimationFrame(animate);
		return () => {
			window.cancelAnimationFrame(rafId);
		};
	}, [hasAnyLfo1Routes, synthState.lfoEnabled, synthState.lfoRate]);

	useEffect(() => {
		const onModSource = (event: Event) => {
			const detail = (
				event as CustomEvent<{ source?: ModSource; value?: number }>
			).detail;
			if (detail?.source == null || detail.value == null) {
				return;
			}

			const clamped = Math.max(0, Math.min(1, detail.value));
			switch (detail.source) {
				case "velocity":
					setVelocityValue(clamped);
					break;
				case "modWheel":
					setModWheelValue(clamped);
					break;
				case "aftertouch":
					setAftertouchValue(clamped);
					break;
				default:
					break;
			}
		};

		window.addEventListener("cz-mod-source", onModSource);
		return () => {
			window.removeEventListener("cz-mod-source", onModSource);
		};
	}, []);

	const lfoPhase = (((animTimeSec * synthState.lfoRate) % 1) + 1) % 1;
	const liveLfo1Value = (() => {
		if (!synthState.lfoEnabled) {
			return 0;
		}
		switch (synthState.lfoWaveform) {
			case "triangle":
				return lfoPhase < 0.5 ? 4 * lfoPhase - 1 : 3 - 4 * lfoPhase;
			case "square":
				return lfoPhase < 0.5 ? 1 : -1;
			case "saw":
				return lfoPhase * 2 - 1;
			default:
				return Math.sin(Math.PI * 2 * lfoPhase);
		}
	})();

	const liveSources = useMemo<LiveModSources>(
		() => ({
			lfo1: liveLfo1Value,
			lfo2: 0,
			velocity: velocityValue,
			modWheel: modWheelValue,
			aftertouch: aftertouchValue,
		}),
		[liveLfo1Value, velocityValue, modWheelValue, aftertouchValue],
	);

	const resolveDestination = useCallback(
		(target: ModTarget | undefined, options?: { lineIndex?: 1 | 2 }) =>
			resolveModDestination(target, options),
		[],
	);

	const getRouteCount = useCallback(
		(destination: ModDestination | undefined) => {
			if (!destination) {
				return 0;
			}
			return modRoutes.filter(
				(route) => route.enabled && route.destination === destination,
			).length;
		},
		[modRoutes],
	);

	const hasActiveRoutes = useCallback(
		(destination: ModDestination | undefined) => getRouteCount(destination) > 0,
		[getRouteCount],
	);

	const getModulatedValue = useCallback(
		({
			destination,
			baseValue,
		}: {
			destination: ModDestination | undefined;
			baseValue: number;
		}): number | undefined => {
			if (!destination) {
				return undefined;
			}

			const activeRoutes = modRoutes.filter(
				(route) => route.enabled && route.destination === destination,
			);
			if (activeRoutes.length === 0) {
				return undefined;
			}

			let liveModDelta = 0;
			for (const route of activeRoutes) {
				const sourceValue = liveSources[route.source] ?? 0;
				liveModDelta += route.amount * sourceValue;
			}

			const clampedLiveModDelta = Math.max(-2, Math.min(2, liveModDelta));
			return baseValue + clampedLiveModDelta;
		},
		[liveSources, modRoutes],
	);

	const controller = useMemo(
		() => ({
			getParam,
			setParam,
			resolveDestination,
			getRouteCount,
			hasActiveRoutes,
			getLiveSources: () => liveSources,
			getModulatedValue,
		}),
		[
			getParam,
			setParam,
			resolveDestination,
			getRouteCount,
			hasActiveRoutes,
			liveSources,
			getModulatedValue,
		],
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

export function useOptionalSynthParam<K extends SynthParamKey>(
	key: K,
): UseSynthStateResult[K] | undefined {
	const controller = useContext(SynthParamControllerContext);
	return controller?.getParam(key);
}

export function useOptionalSynthController() {
	return useContext(SynthParamControllerContext);
}
