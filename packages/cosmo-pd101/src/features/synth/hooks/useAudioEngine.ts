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
	outputChannelStart?: number;
	sampleRate?: number;
	bufferSize?: number;
	audioDeviceId?: string;
	/**
	 * Optional callback invoked on every audio buffer with stereo-interleaved
	 * F32 samples (L0, R0, L1, R1, …).  When provided the browser AudioContext
	 * output is muted so the caller can route audio elsewhere (e.g. cpal).
	 */
	onCaptureSamples?: (stereoInterleaved: Float32Array) => void;
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
	outputChannelStart = 1,
	sampleRate = 44100,
	bufferSize = 512,
	audioDeviceId = "default",
	onCaptureSamples,
}: UseAudioEngineParams): AudioEngineRefs {
	const audioCtxRef = useRef<AudioContext | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const analyserNodeRef = useRef<AnalyserNode | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);
	const audioInitRef = useRef(false);
	// Keep the callback in a ref so the effect doesn't need it as a dep.
	const onCaptureSamplesRef = useRef(onCaptureSamples);
	onCaptureSamplesRef.current = onCaptureSamples;

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
		let outputSplitter: ChannelSplitterNode | null = null;
		let outputMerger: ChannelMergerNode | null = null;
		let streamDestination: MediaStreamAudioDestinationNode | null = null;
		let sinkAudioElement: HTMLAudioElement | null = null;

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
				const latencyHint = Math.max(0.001, bufferSize / sampleRate);
				const ctx = new AudioContext({
					sampleRate,
					latencyHint,
				});
				if (disposed) {
					ctx.close();
					return;
				}

				const ctxWithSink = ctx as AudioContext & {
					setSinkId?: (sinkId: string) => Promise<void>;
				};
				const mediaElementProto =
					HTMLMediaElement.prototype as HTMLMediaElement & {
						setSinkId?: (sinkId: string) => Promise<void>;
					};
				if (
					audioDeviceId !== "default" &&
					typeof ctxWithSink.setSinkId === "function"
				) {
					await ctxWithSink.setSinkId(audioDeviceId).catch((error) => {
						console.warn(
							"[PD Visualizer] Failed to set audio output device:",
							error,
						);
					});
				} else if (
					audioDeviceId !== "default" &&
					typeof mediaElementProto.setSinkId === "function"
				) {
					streamDestination = ctx.createMediaStreamDestination();
					sinkAudioElement = new Audio();
					sinkAudioElement.autoplay = true;
					sinkAudioElement.srcObject = streamDestination.stream;
					const audioWithSink = sinkAudioElement as HTMLAudioElement & {
						setSinkId?: (sinkId: string) => Promise<void>;
					};
					await audioWithSink.setSinkId?.(audioDeviceId).catch((error) => {
						console.warn(
							"[PD Visualizer] Failed to set sink on fallback audio element:",
							error,
						);
					});
					await sinkAudioElement.play().catch((error) => {
						console.warn(
							"[PD Visualizer] Failed to start fallback audio sink element:",
							error,
						);
					});
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

				// ── cpal capture path ──────────────────────────────────────────
				// When a capture callback is provided (e.g. Tauri standalone app
				// routing audio through cpal) we intercept the output with a
				// ScriptProcessorNode, mute the browser sink, and forward stereo-
				// interleaved PCM to the callback.  ScriptProcessorNode is
				// deprecated but remains the only synchronous capture API that
				// works in WKWebView without a custom AudioWorklet module.
				const captureBufferSize = Math.max(512, Math.min(4096, bufferSize));
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				const captureNode = onCaptureSamplesRef.current
					? ctx.createScriptProcessor(captureBufferSize, 2, 2)
					: null;

				if (captureNode) {
					captureNode.onaudioprocess = (e) => {
						const cb = onCaptureSamplesRef.current;
						if (!cb) return;
						const left = e.inputBuffer.getChannelData(0);
						const right = e.inputBuffer.getChannelData(1);
						const interleaved = new Float32Array(left.length * 2);
						for (let i = 0; i < left.length; i++) {
							interleaved[i * 2] = left[i];
							interleaved[i * 2 + 1] = right[i];
						}
						cb(interleaved);
					};
				}

				const outputDestination = streamDestination || ctx.destination;

				const startChannel = Math.max(1, Math.floor(outputChannelStart));
				if (startChannel <= 1) {
					if (captureNode) {
						// Route: analyser → capture → silent gain → destination
						const silentGain = ctx.createGain();
						silentGain.gain.value = 0;
						analyserNode.connect(captureNode);
						captureNode.connect(silentGain);
						silentGain.connect(outputDestination);
					} else {
						analyserNode.connect(outputDestination);
					}
				} else {
					const destinationChannels = Math.max(
						2,
						outputDestination === ctx.destination
							? ctx.destination.channelCount
							: 2,
					);
					const leftIndex = Math.min(startChannel - 1, destinationChannels - 1);
					const rightIndex = Math.min(startChannel, destinationChannels - 1);

					outputSplitter = ctx.createChannelSplitter(2);
					outputMerger = ctx.createChannelMerger(destinationChannels);

					analyserNode.connect(outputSplitter);
					outputSplitter.connect(outputMerger, 0, leftIndex);
					outputSplitter.connect(outputMerger, 1, rightIndex);

					if (captureNode) {
						const silentGain = ctx.createGain();
						silentGain.gain.value = 0;
						outputMerger.connect(captureNode);
						captureNode.connect(silentGain);
						silentGain.connect(outputDestination);
					} else {
						outputMerger.connect(outputDestination);
					}
				}

				audioCtxRef.current = ctx;
				gainNodeRef.current = gainNode;
				analyserNodeRef.current = analyserNode;

				if (ctx.state === "suspended") await ctx.resume();
			} catch (err) {
				console.error("[PD Visualizer] Audio init failed:", err);
				audioInitRef.current = false;
			}
		};

		void init();

		return () => {
			disposed = true;
			sinkAudioElement?.pause();
			sinkAudioElement?.removeAttribute("src");
			if (sinkAudioElement) sinkAudioElement.srcObject = null;
			sinkAudioElement = null;
			streamDestination?.disconnect();
			streamDestination = null;
			outputMerger?.disconnect();
			outputSplitter?.disconnect();
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
	}, [
		synthWasmUrl,
		synthBindingsUrl,
		pdVisualizerWorkletUrl,
		outputChannelStart,
		sampleRate,
		bufferSize,
		audioDeviceId,
	]);

	return {
		audioCtxRef,
		gainNodeRef,
		analyserNodeRef,
		workletNodeRef,
		paramsRef,
	};
}
