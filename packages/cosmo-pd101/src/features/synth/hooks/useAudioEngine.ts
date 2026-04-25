import { useEffect, useRef } from "react";
import type { PolyMode } from "@/features/synth/useSynthState";
import type {
	Algo,
	AlgoControlValueV1,
	CzWaveform,
	StepEnvData,
	WindowType,
} from "@/lib/synth/bindings/synth";

export type RuntimeModSources = {
	lfo1: number;
	lfo2: number;
	random: number;
	modEnv: number;
	velocity: number;
	modWheel: number;
	aftertouch: number;
};

export const EMPTY_RUNTIME_MOD_SOURCES: RuntimeModSources = {
	lfo1: 0,
	lfo2: 0,
	random: 0,
	modEnv: 0,
	velocity: 0,
	modWheel: 0,
	aftertouch: 0,
};

export type UseAudioEngineParams = {
	synthWasmUrl: string;
	synthBindingsUrl: string;
	pdVisualizerWorkletUrl: string;
};

export type AudioEngineRefs = {
	audioCtxRef: React.MutableRefObject<AudioContext | null>;
	gainNodeRef: React.MutableRefObject<GainNode | null>;
	analyserNodeRef: React.MutableRefObject<AnalyserNode | null>;
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	paramsRef: React.MutableRefObject<EngineParams>;
};

export type EngineParams = {
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
	chorus: { enabled: boolean; rate: number; depth: number; mix: number };
	delay: { enabled: boolean; time: number; feedback: number; mix: number };
	reverb: {
		enabled: boolean;
		mix: number;
		space: number;
		predelay: number;
		brightness: number;
		highCut: number;
		distance: number;
		character: number;
	};
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
		waveform: string;
		rate: number;
		depth: number;
		offset: number;
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
	modMatrix: {
		routes: {
			source: string;
			destination: string;
			amount: number;
			enabled: boolean;
		}[];
	};
};

export type LineParams = {
	algo: Algo;
	algo2: Algo | null;
	algoBlend: number;
	window: string;
	cz: {
		slotAWaveform: CzWaveform;
		slotBWaveform: CzWaveform;
		window: WindowType;
	};
	dcaBase: number;
	dcwBase: number;
	modulation: number;
	detuneCents: number;
	octave: number;
	dcoEnv: StepEnvData;
	dcwEnv: StepEnvData;
	dcaEnv: StepEnvData;
	keyFollow: number;
	algoControls?: AlgoControlValueV1[];
};

const DEFAULT_LINE_PARAMS: LineParams = {
	algo: "cz101",
	algo2: null,
	algoBlend: 0,
	window: "off",
	cz: {
		slotAWaveform: "saw",
		slotBWaveform: "saw",
		window: "off",
	},
	dcaBase: 1.0,
	dcwBase: 0,
	modulation: 0,
	detuneCents: 0,
	octave: 0,
	dcoEnv: {
		steps: Array(8).fill({ level: 0, rate: 0 }),
		sustainStep: 1,
		stepCount: 2,
		loop: false,
	},
	dcwEnv: {
		steps: Array(8).fill({ level: 0, rate: 0 }),
		sustainStep: 2,
		stepCount: 4,
		loop: false,
	},
	dcaEnv: {
		steps: Array(8).fill({ level: 0, rate: 0 }),
		sustainStep: 2,
		stepCount: 4,
		loop: false,
	},
	keyFollow: 0,
	algoControls: [],
};

export function useAudioEngine({
	synthWasmUrl,
	synthBindingsUrl,
	pdVisualizerWorkletUrl,
}: UseAudioEngineParams): AudioEngineRefs {
	const audioCtxRef = useRef<AudioContext | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const analyserNodeRef = useRef<AnalyserNode | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);
	const audioInitRef = useRef(false);

	const paramsRef = useRef<EngineParams>({
		lineSelect: "L1+L2",
		modMode: "single",
		octave: 0,
		line1: { ...DEFAULT_LINE_PARAMS },
		line2: { ...DEFAULT_LINE_PARAMS },
		intPmAmount: 0,
		intPmRatio: 1,
		extPmAmount: 0,
		pmPre: true,
		frequency: 220,
		volume: 0.4,
		polyMode: "poly8",
		legato: false,
		chorus: { enabled: false, rate: 0.8, depth: 0.003, mix: 0 },
		delay: { enabled: false, time: 0.3, feedback: 0.35, mix: 0 },
		reverb: {
			enabled: false,
			mix: 0,
			space: 0.5,
			predelay: 0,
			brightness: 0.7,
			highCut: 0,
			distance: 0.3,
			character: 0.3,
		},
		vibrato: { enabled: false, waveform: 0, rate: 0, depth: 0, delay: 0 },
		portamento: { enabled: false, mode: "rate", rate: 0, time: 0 },
		lfo: {
			enabled: false,
			waveform: "sine",
			rate: 0,
			depth: 0,
			offset: 0,
		},
		filter: {
			enabled: false,
			type: "lp",
			cutoff: 20000,
			resonance: 0,
			envAmount: 0,
		},
		pitchBendRange: 2,
		modWheelVibratoDepth: 0,
		modMatrix: { routes: [] },
	});

	useEffect(() => {
		if (audioInitRef.current) return;
		audioInitRef.current = true;
		let disposed = false;

		const normalizeRuntimeModSources = (
			value: unknown,
		): RuntimeModSources | null => {
			if (!value || typeof value !== "object") {
				return null;
			}

			const detail = value as Partial<Record<keyof RuntimeModSources, unknown>>;
			const read = (key: keyof RuntimeModSources) => {
				const next = detail[key];
				return typeof next === "number" && Number.isFinite(next) ? next : 0;
			};

			return {
				lfo1: read("lfo1"),
				lfo2: read("lfo2"),
				random: read("random"),
				modEnv: read("modEnv"),
				velocity: read("velocity"),
				modWheel: read("modWheel"),
				aftertouch: read("aftertouch"),
			};
		};

		const init = async () => {
			try {
				const ctx = new AudioContext();
				if (disposed) {
					ctx.close();
					return;
				}

				const [wasmResponse, bindingsResponse] = await Promise.all([
					fetch(synthWasmUrl),
					fetch(synthBindingsUrl),
				]);

				if (!wasmResponse.ok) {
					throw new Error(
						`Failed to fetch WASM (${wasmResponse.status}): ${synthWasmUrl}`,
					);
				}
				if (!bindingsResponse.ok) {
					throw new Error(
						`Failed to fetch WASM bindings (${bindingsResponse.status}): ${synthBindingsUrl}`,
					);
				}

				const [wasmBytes, bindingsJs] = await Promise.all([
					wasmResponse.arrayBuffer(),
					bindingsResponse.text(),
				]);

				await ctx.audioWorklet.addModule(pdVisualizerWorkletUrl);

				const workletNode = new AudioWorkletNode(ctx, "cosmo-processor");
				if (disposed) {
					workletNode.disconnect();
					ctx.close();
					return;
				}

				workletNode.port.onmessage = (e) => {
					if (e.data?.type === "ready") {
						workletNodeRef.current = workletNode;
						workletNode.port.postMessage({
							type: "setParams",
							params: paramsRef.current,
						});
					} else if (e.data?.type === "runtimeModSources") {
						const sources = normalizeRuntimeModSources(e.data.sources);
						if (sources) {
							window.dispatchEvent(
								new CustomEvent<RuntimeModSources>("cz-runtime-mod-sources", {
									detail: sources,
								}),
							);
						}
					} else if (e.data?.type === "error") {
						console.error("[CZ Synth WASM] Worklet error:", e.data.message);
					}
				};

				workletNode.port.postMessage({ type: "init", wasmBytes, bindingsJs }, [
					wasmBytes,
				]);

				const gainNode = ctx.createGain();
				gainNode.gain.value = 1;
				const analyserNode = new AnalyserNode(ctx, { fftSize: 2048 });

				workletNode.connect(gainNode);
				gainNode.connect(analyserNode);
				analyserNode.connect(ctx.destination);

				audioCtxRef.current = ctx;
				gainNodeRef.current = gainNode;
				analyserNodeRef.current = analyserNode;

				if (ctx.state === "suspended") await ctx.resume();
			} catch (err) {
				console.error("[PD Visualizer] Audio init failed:", err);
				audioInitRef.current = false;
			}
		};

		init();

		return () => {
			disposed = true;
			audioInitRef.current = false;
			workletNodeRef.current?.disconnect();
			workletNodeRef.current = null;
			gainNodeRef.current?.disconnect();
			gainNodeRef.current = null;
			analyserNodeRef.current?.disconnect();
			analyserNodeRef.current = null;
			audioCtxRef.current?.close();
			audioCtxRef.current = null;
		};
	}, [synthWasmUrl, synthBindingsUrl, pdVisualizerWorkletUrl]);

	return {
		audioCtxRef,
		gainNodeRef,
		analyserNodeRef,
		workletNodeRef,
		paramsRef,
	};
}
