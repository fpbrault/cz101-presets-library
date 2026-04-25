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
import { useSynthStore } from "@/features/synth/synthStore";
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
	line1DcoEnv: "setLine1DcoEnv",
	line1DcwEnv: "setLine1DcwEnv",
	line1DcaEnv: "setLine1DcaEnv",
	line1CzSlotAWaveform: "setLine1CzSlotAWaveform",
	line1CzSlotBWaveform: "setLine1CzSlotBWaveform",
	line1CzWindow: "setLine1CzWindow",
	line1AlgoControlsA: "setLine1AlgoControlsA",
	line1AlgoControlsB: "setLine1AlgoControlsB",
	line2DcoEnv: "setLine2DcoEnv",
	line2DcwEnv: "setLine2DcwEnv",
	line2DcaEnv: "setLine2DcaEnv",
	line2CzSlotAWaveform: "setLine2CzSlotAWaveform",
	line2CzSlotBWaveform: "setLine2CzSlotBWaveform",
	line2CzWindow: "setLine2CzWindow",
	line2AlgoControlsA: "setLine2AlgoControlsA",
	line2AlgoControlsB: "setLine2AlgoControlsB",
	line1DcwKeyFollow: "setLine1DcwKeyFollow",
	line2DcwKeyFollow: "setLine2DcwKeyFollow",
	volume: "setVolume",
	polyMode: "setPolyMode",
	velocityCurve: "setVelocityCurve",
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
	lfoWaveform: "setLfoWaveform",
	lfoRate: "setLfoRate",
	lfoDepth: "setLfoDepth",
	lfoSymmetry: "setLfoSymmetry",
	lfoRetrigger: "setLfoRetrigger",
	lfoOffset: "setLfoOffset",
	lfo2Waveform: "setLfo2Waveform",
	lfo2Rate: "setLfo2Rate",
	lfo2Depth: "setLfo2Depth",
	lfo2Symmetry: "setLfo2Symmetry",
	lfo2Retrigger: "setLfo2Retrigger",
	lfo2Offset: "setLfo2Offset",
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
	reverbDamping: "setReverbDamping",
	reverbPreDelay: "setReverbPreDelay",
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
	onControlReadout?: (key: string, value: ReadoutValue) => void;
};

export function SynthParamControllerProvider({
	children,
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

	// Read LFO params from the store with selective subscriptions.
	const lfoRate = useSynthStore((s) => s.lfoRate);
	const lfoDepth = useSynthStore((s) => s.lfoDepth);
	const lfoWaveform = useSynthStore((s) => s.lfoWaveform);
	const lfoSymmetry = useSynthStore((s) => s.lfoSymmetry);
	const lfoOffset = useSynthStore((s) => s.lfoOffset);
	const lfo2Rate = useSynthStore((s) => s.lfo2Rate);
	const lfo2Depth = useSynthStore((s) => s.lfo2Depth);
	const lfo2Waveform = useSynthStore((s) => s.lfo2Waveform);
	const lfo2Symmetry = useSynthStore((s) => s.lfo2Symmetry);
	const lfo2Offset = useSynthStore((s) => s.lfo2Offset);

	const getParam = useCallback(
		<K extends SynthParamKey>(key: K): UseSynthStateResult[K] => {
			return useSynthStore.getState()[key] as UseSynthStateResult[K];
		},
		[],
	);

	const setParam = useCallback(
		<K extends SynthParamKey>(key: K, value: UseSynthStateResult[K]) => {
			const setterName = SYNTH_PARAM_SETTERS[key];
			const setter = useSynthStore.getState()[setterName] as (
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
		[onControlReadout],
	);

	const hasAnyLfo1Routes = useMemo(() => {
		return modRoutes.some((route) => route.enabled && route.source === "lfo1");
	}, [modRoutes]);

	const hasAnyLfo2Routes = useMemo(() => {
		return modRoutes.some((route) => route.enabled && route.source === "lfo2");
	}, [modRoutes]);

	useEffect(() => {
		if (
			!((hasAnyLfo1Routes && lfoRate > 0) || (hasAnyLfo2Routes && lfo2Rate > 0))
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
	}, [hasAnyLfo1Routes, hasAnyLfo2Routes, lfoRate, lfo2Rate]);

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

	const lfoPhase = (((animTimeSec * lfoRate) % 1) + 1) % 1;
	const lfo2Phase = (((animTimeSec * lfo2Rate) % 1) + 1) % 1;

	const waveformValue = (
		waveform: UseSynthStateResult["lfoWaveform"],
		phase: number,
		symmetry: number,
	): number => {
		const sym = Math.min(0.999, Math.max(0.001, symmetry));
		switch (waveform) {
			case "invertedSaw":
				return 1 - phase * 2;
			case "random": {
				const step = Math.floor(phase * 16);
				const seed = step * 12.9898 + 78.233;
				const hash = Math.sin(seed) * 43758.5453;
				const fract = hash - Math.floor(hash);
				return fract * 2 - 1;
			}
			case "triangle":
				return phase < sym
					? (phase / sym) * 2 - 1
					: 1 - ((phase - sym) / (1 - sym)) * 2;
			case "square":
				return phase < sym ? 1 : -1;
			case "saw":
				return phase * 2 - 1;
			default:
				return Math.sin(Math.PI * 2 * phase);
		}
	};

	const liveLfo1Value = (() => {
		return (
			waveformValue(lfoWaveform, lfoPhase, lfoSymmetry) * lfoDepth + lfoOffset
		);
	})();

	const liveLfo2Value = (() => {
		return (
			waveformValue(lfo2Waveform, lfo2Phase, lfo2Symmetry) * lfo2Depth +
			lfo2Offset
		);
	})();

	const liveSources = useMemo<LiveModSources>(
		() => ({
			lfo1: liveLfo1Value,
			lfo2: liveLfo2Value,
			velocity: velocityValue,
			modWheel: modWheelValue,
			aftertouch: aftertouchValue,
		}),
		[
			liveLfo1Value,
			liveLfo2Value,
			velocityValue,
			modWheelValue,
			aftertouchValue,
		],
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
	// Selective subscription — only re-renders when `key` changes in the store.
	const value = useSynthStore((s) => s[key] as UseSynthStateResult[K]);
	const controller = useContext(SynthParamControllerContext);
	if (!controller) {
		throw new Error(
			"useSynthParam must be used within SynthParamControllerProvider",
		);
	}

	return {
		value,
		setValue: (v) => controller.setParam(key, v),
	};
}

export function useOptionalSynthParam<K extends SynthParamKey>(
	key: K,
): UseSynthStateResult[K] | undefined {
	// Selective subscription even in the optional variant.
	return useSynthStore((s) => s[key] as UseSynthStateResult[K]);
}

export function useOptionalSynthController() {
	return useContext(SynthParamControllerContext);
}
