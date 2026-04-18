import { useEffect, useRef } from "react";
import type { StepEnvData } from "@/components/pdAlgorithms";
import type { PolyMode, VelocityTarget } from "@/features/synth/useSynthState";

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

type EngineParams = {
	lineSelect: string;
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
	chorus: { rate: number; depth: number; mix: number };
	delay: { time: number; feedback: number; mix: number };
	reverb: { size: number; mix: number };
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
	warpAlgo: string;
	detuneCents: number;
	octave: number;
	dcoEnv: StepEnvData;
	dcwEnv: StepEnvData;
	dcaEnv: StepEnvData;
};

const DEFAULT_LINE_PARAMS: LineParams = {
	waveform: 1,
	waveform2: 1,
	algo2: null,
	algoBlend: 0,
	window: "off",
	dcaBase: 1.0,
	dcwBase: 0,
	dcoDepth: 12,
	modulation: 0,
	warpAlgo: "cz101",
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
		velocityTarget: "amp",
		chorus: { rate: 0.8, depth: 0.003, mix: 0 },
		delay: { time: 0.3, feedback: 0.35, mix: 0 },
		reverb: { size: 0.5, mix: 0 },
	});

	useEffect(() => {
		if (audioInitRef.current) return;
		audioInitRef.current = true;
		let disposed = false;

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
