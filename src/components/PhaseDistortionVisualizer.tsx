import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdVisualizerWorkletUrl } from "@/lib/synth/pdVisualizerWorkletUrl";
import {
	deletePreset,
	listPresets,
	loadCurrentState,
	loadPreset,
	type SynthPresetData,
	saveCurrentState,
	savePreset,
} from "@/lib/synth/presetStorage";
import { PerLineWarpBlock } from "./PerLineWarpBlock";
import {
	computeWaveform,
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	KEYBOARD_NOTES,
	noteName,
	noteToFreq,
	PC_KEY_TO_NOTE,
	PD_ALGOS,
	type PdAlgo,
	type StepEnvData,
} from "./pdAlgorithms";
import { drawPhaseMap, drawScope, drawSingleScope } from "./pdCanvas";

type PolyMode = "poly8" | "mono";
type VelocityTarget = "amp" | "dcw" | "both";

export default function PhaseDistortionVisualizer() {
	const [warpAAmount, setWarpAAmount] = useState(0);
	const [warpBAmount, setWarpBAmount] = useState(0);
	const [warpAAlgo, setWarpAAlgo] = useState<PdAlgo>("bend");
	const [warpBAlgo, setWarpBAlgo] = useState<PdAlgo>("bend");
	const [algo2A, setAlgo2A] = useState<PdAlgo | null>(null);
	const [algo2B, setAlgo2B] = useState<PdAlgo | null>(null);
	const [algoBlendA, setAlgoBlendA] = useState(0);
	const [algoBlendB, setAlgoBlendB] = useState(0);
	const [intPmAmount, setIntPmAmount] = useState(0);
	const [intPmRatio, setIntPmRatio] = useState(2);
	const [extPmAmount] = useState(0);
	const [pmPre, setPmPre] = useState(true);
	const [windowType, setWindowType] = useState<"off" | "saw" | "triangle">(
		"off",
	);
	const [volume, setVolume] = useState(1);
	const [line1Level, setLine1Level] = useState(1);
	const [line2Level, setLine2Level] = useState(1);
	const [line1Octave, setLine1Octave] = useState(0);
	const [line2Octave, setLine2Octave] = useState(0);
	const [line1Detune, setLine1Detune] = useState(0);
	const [line2Detune, setLine2Detune] = useState(0);
	const [polyMode, setPolyMode] = useState<PolyMode>("poly8");
	const [legato, setLegato] = useState(false);
	const [sustainOn, setSustainOn] = useState(false);
	const [velocityTarget, setVelocityTarget] = useState<VelocityTarget>("amp");
	const [activeNotes, setActiveNotes] = useState<number[]>([]);
	const [line1DcoEnv, setLine1DcoEnv] = useState<StepEnvData>(DEFAULT_DCO_ENV);
	const [line1DcwEnv, setLine1DcwEnv] = useState<StepEnvData>(DEFAULT_DCW_ENV);
	const [line1DcaEnv, setLine1DcaEnv] = useState<StepEnvData>(DEFAULT_DCA_ENV);
	const [line2DcoEnv, setLine2DcoEnv] = useState<StepEnvData>(DEFAULT_DCO_ENV);
	const [line2DcwEnv, setLine2DcwEnv] = useState<StepEnvData>(DEFAULT_DCW_ENV);
	const [line2DcaEnv, setLine2DcaEnv] = useState<StepEnvData>(DEFAULT_DCA_ENV);
	const [line1DcoDepth, setLine1DcoDepth] = useState(0);
	const [line2DcoDepth, setLine2DcoDepth] = useState(0);
	const [line1DcwComp, setLine1DcwComp] = useState(0);
	const [line2DcwComp, setLine2DcwComp] = useState(0);
	const [scopeCycles, setScopeCycles] = useState(2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(1);
	const [scopeTriggerMode, setScopeTriggerMode] = useState<
		"off" | "rise" | "fall"
	>("rise");
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(128);
	const [scopeOpen, setScopeOpen] = useState(true);
	const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

	const [chorusRate, setChorusRate] = useState(0.8);
	const [chorusDepth, setChorusDepth] = useState(3);
	const [chorusMix, setChorusMix] = useState(0);
	const [delayTime, setDelayTime] = useState(0.3);
	const [delayFeedback, setDelayFeedback] = useState(0.35);
	const [delayMix, setDelayMix] = useState(0);
	const [reverbSize, setReverbSize] = useState(0.5);
	const [reverbMix, setReverbMix] = useState(0);

	const [presetName, setPresetName] = useState("");
	const [presetList, setPresetList] = useState<string[]>([]);

	const gatherState = useCallback(
		(): SynthPresetData => ({
			warpAAmount,
			warpBAmount,
			warpAAlgo: String(warpAAlgo),
			warpBAlgo: String(warpBAlgo),
			algo2A: algo2A ? String(algo2A) : null,
			algo2B: algo2B ? String(algo2B) : null,
			algoBlendA,
			algoBlendB,
			intPmAmount,
			intPmRatio,
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
			chorusMix,
			delayTime,
			delayFeedback,
			delayMix,
			reverbSize,
			reverbMix,
		}),
		[
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
			chorusMix,
			delayTime,
			delayFeedback,
			delayMix,
			reverbSize,
			reverbMix,
		],
	);

	const applyPreset = useCallback((data: SynthPresetData) => {
		setWarpAAmount(data.warpAAmount);
		setWarpBAmount(data.warpBAmount);
		setWarpAAlgo(data.warpAAlgo as PdAlgo);
		setWarpBAlgo(data.warpBAlgo as PdAlgo);
		setAlgo2A(data.algo2A as PdAlgo | null);
		setAlgo2B(data.algo2B as PdAlgo | null);
		setAlgoBlendA(data.algoBlendA);
		setAlgoBlendB(data.algoBlendB);
		setIntPmAmount(data.intPmAmount);
		setIntPmRatio(data.intPmRatio);
		setPmPre(data.pmPre);
		setWindowType(data.windowType as "off" | "saw" | "triangle");
		setVolume(data.volume);
		setLine1Level(data.line1Level);
		setLine2Level(data.line2Level);
		setLine1Octave(data.line1Octave);
		setLine2Octave(data.line2Octave);
		setLine1Detune(data.line1Detune);
		setLine2Detune(data.line2Detune);
		setLine1DcoDepth(data.line1DcoDepth);
		setLine2DcoDepth(data.line2DcoDepth);
		setLine1DcwComp(data.line1DcwComp);
		setLine2DcwComp(data.line2DcwComp);
		setLine1DcoEnv(data.line1DcoEnv);
		setLine1DcwEnv(data.line1DcwEnv);
		setLine1DcaEnv(data.line1DcaEnv);
		setLine2DcoEnv(data.line2DcoEnv);
		setLine2DcwEnv(data.line2DcwEnv);
		setLine2DcaEnv(data.line2DcaEnv);
		setPolyMode(data.polyMode as PolyMode);
		setLegato(data.legato);
		setVelocityTarget(data.velocityTarget as VelocityTarget);
		setChorusRate(data.chorusRate);
		setChorusDepth(data.chorusDepth);
		setChorusMix(data.chorusMix);
		setDelayTime(data.delayTime);
		setDelayFeedback(data.delayFeedback);
		setDelayMix(data.delayMix);
		setReverbSize(data.reverbSize);
		setReverbMix(data.reverbMix);
	}, []);

	const resetToDefaults = useCallback(() => {
		applyPreset({
			warpAAmount: 0,
			warpBAmount: 0,
			warpAAlgo: "bend",
			warpBAlgo: "bend",
			algo2A: null,
			algo2B: null,
			algoBlendA: 0,
			algoBlendB: 0,
			intPmAmount: 0,
			intPmRatio: 2,
			pmPre: true,
			windowType: "off",
			volume: 0.5,
			line1Level: 1,
			line2Level: 1,
			line1Octave: 0,
			line2Octave: 0,
			line1Detune: 0,
			line2Detune: 0,
			line1DcoDepth: 0,
			line2DcoDepth: 0,
			line1DcwComp: 0,
			line2DcwComp: 0,
			line1DcoEnv: DEFAULT_DCO_ENV,
			line1DcwEnv: DEFAULT_DCW_ENV,
			line1DcaEnv: DEFAULT_DCA_ENV,
			line2DcoEnv: DEFAULT_DCO_ENV,
			line2DcwEnv: DEFAULT_DCW_ENV,
			line2DcaEnv: DEFAULT_DCA_ENV,
			polyMode: "poly8",
			legato: false,
			velocityTarget: "amp",
			chorusRate: 0.8,
			chorusDepth: 3,
			chorusMix: 0,
			delayTime: 0.3,
			delayFeedback: 0.35,
			delayMix: 0,
			reverbSize: 0.5,
			reverbMix: 0,
		});
	}, [applyPreset]);

	const audioCtxRef = useRef<AudioContext | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const analyserNodeRef = useRef<AnalyserNode | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);
	const audioInitRef = useRef(false);
	const paramsRef = useRef({
		lineSelect: "L1+L2",
		octave: 0,
		line1: {
			waveform: 1,
			waveform2: 1,
			algo2: null as string | null,
			algoBlend: 0,
			window: "off",
			dcaBase: 1.0,
			dcwBase: 0,
			dcoDepth: 0,
			modulation: 0,
			warpAlgo: "cz101",
			detuneCents: 0,
			octave: 0,
			dcoEnv: DEFAULT_DCO_ENV,
			dcwEnv: DEFAULT_DCW_ENV,
			dcaEnv: DEFAULT_DCA_ENV,
		},
		line2: {
			waveform: 1,
			waveform2: 1,
			algo2: null as string | null,
			algoBlend: 0,
			window: "off",
			dcaBase: 1.0,
			dcwBase: 0,
			dcoDepth: 0,
			modulation: 0,
			warpAlgo: "cz101",
			detuneCents: 0,
			octave: 0,
			dcoEnv: DEFAULT_DCO_ENV,
			dcwEnv: DEFAULT_DCW_ENV,
			dcaEnv: DEFAULT_DCA_ENV,
		},
		intPmAmount: 0,
		intPmRatio: 1,
		extPmAmount: 0,
		pmPre: true,
		frequency: 220,
		volume: 0.4,
		polyMode: "poly8" as PolyMode,
		legato: false,
		velocityTarget: "amp" as VelocityTarget,
		chorus: { rate: 0.8, depth: 0.003, mix: 0 },
		delay: { time: 0.3, feedback: 0.35, mix: 0 },
		reverb: { size: 0.5, mix: 0 },
	});
	const sustainRef = useRef(false);
	const line1CanvasRef = useRef<HTMLCanvasElement>(null);
	const line2CanvasRef = useRef<HTMLCanvasElement>(null);
	const combinedCanvasRef = useRef<HTMLCanvasElement>(null);
	const phaseCanvasRef = useRef<HTMLCanvasElement>(null);
	const oscilloscopeCanvasRef = useRef<HTMLCanvasElement>(null);
	const pressedPcKeysRef = useRef<Set<string>>(new Set());
	const lastHeldFreqRef = useRef(220);

	const heldNote =
		activeNotes.length > 0 ? activeNotes[activeNotes.length - 1] : null;
	let effectivePitchHz = lastHeldFreqRef.current;
	if (heldNote != null) {
		lastHeldFreqRef.current = noteToFreq(heldNote);
		effectivePitchHz = lastHeldFreqRef.current;
	}

	const sustainLevel1 = line1DcwEnv.steps[line1DcwEnv.sustainStep]?.level ?? 1;
	const sustainLevelA = line1DcaEnv.steps[line1DcaEnv.sustainStep]?.level ?? 1;
	const sustainLevel2 = line2DcwEnv.steps[line2DcwEnv.sustainStep]?.level ?? 1;
	const sustainLevelB = line2DcaEnv.steps[line2DcaEnv.sustainStep]?.level ?? 1;

	const effectiveWarpA = warpAAmount * sustainLevel1;
	const effectiveWarpB = warpBAmount * sustainLevel2;
	const effectiveLevelA = line1Level * sustainLevelA;
	const effectiveLevelB = line2Level * sustainLevelB;

	const waveform = useMemo(
		() =>
			computeWaveform({
				warpAAmount: effectiveWarpA,
				warpBAmount: effectiveWarpB,
				warpAAlgo,
				warpBAlgo,
				algo2A,
				algo2B,
				algoBlendA,
				algoBlendB,
				intPmAmount,
				intPmRatio,
				extPmAmount,
				pmPre,
				windowType,
				line1Level: effectiveLevelA,
				line2Level: effectiveLevelB,
			}),
		[
			effectiveWarpA,
			effectiveWarpB,
			effectiveLevelA,
			effectiveLevelB,
			warpAAlgo,
			warpBAlgo,
			algo2A,
			algo2B,
			algoBlendA,
			algoBlendB,
			intPmAmount,
			intPmRatio,
			extPmAmount,
			pmPre,
			windowType,
		],
	);

	useEffect(() => {
		const algoA =
			PD_ALGOS.find((a) => String(a.value) === String(warpAAlgo)) ??
			PD_ALGOS[0];
		const algoB =
			PD_ALGOS.find((a) => String(a.value) === String(warpBAlgo)) ??
			PD_ALGOS[0];
		const algo2ADef = algo2A
			? (PD_ALGOS.find((a) => String(a.value) === String(algo2A)) ?? null)
			: null;
		const algo2BDef = algo2B
			? (PD_ALGOS.find((a) => String(a.value) === String(algo2B)) ?? null)
			: null;

		const finalPitch = effectivePitchHz;

		const params = {
			lineSelect: "L1+L2",
			octave: 0,
			line1: {
				waveform: algoA.waveform,
				waveform2: algo2ADef?.waveform ?? 1,
				algo2: algo2ADef?.algo ?? null,
				algoBlend: algoBlendA,
				window: windowType,
				dcaBase: line1Level,
				dcwBase: warpAAmount,
				dcoDepth: line1DcoDepth,
				modulation: 0,
				dcwComp: line1DcwComp,
				warpAlgo: algoA.algo,
				detuneCents: line1Detune,
				octave: line1Octave,
				dcoEnv: line1DcoEnv,
				dcwEnv: line1DcwEnv,
				dcaEnv: line1DcaEnv,
			},
			line2: {
				waveform: algoB.waveform,
				waveform2: algo2BDef?.waveform ?? 1,
				algo2: algo2BDef?.algo ?? null,
				algoBlend: algoBlendB,
				window: windowType,
				dcaBase: line2Level,
				dcwBase: warpBAmount,
				dcoDepth: line2DcoDepth,
				modulation: 0,
				dcwComp: line2DcwComp,
				warpAlgo: algoB.algo,
				detuneCents: line2Detune,
				octave: line2Octave,
				dcoEnv: line2DcoEnv,
				dcwEnv: line2DcwEnv,
				dcaEnv: line2DcaEnv,
			},
			intPmAmount,
			intPmRatio,
			extPmAmount,
			pmPre,
			frequency: finalPitch,
			volume,
			polyMode,
			legato,
			velocityTarget,
			chorus: { rate: chorusRate, depth: chorusDepth / 1000, mix: chorusMix },
			delay: { time: delayTime, feedback: delayFeedback, mix: delayMix },
			reverb: { size: reverbSize, mix: reverbMix },
		};
		paramsRef.current = params;
		if (!workletNodeRef.current) return;
		workletNodeRef.current.port.postMessage({ type: "setParams", params });
	}, [
		warpAAmount,
		warpBAmount,
		line1Level,
		line2Level,
		line1DcoDepth,
		line2DcoDepth,
		line1DcwComp,
		line2DcwComp,
		warpAAlgo,
		warpBAlgo,
		intPmAmount,
		intPmRatio,
		extPmAmount,
		pmPre,
		windowType,
		volume,
		line1Detune,
		line2Detune,
		line1Octave,
		line2Octave,
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
		chorusMix,
		delayTime,
		delayFeedback,
		delayMix,
		reverbSize,
		reverbMix,
		effectivePitchHz,
		algo2A,
		algo2B,
		algoBlendA,
		algoBlendB,
	]);

	useEffect(() => {
		const timer = setTimeout(() => {
			saveCurrentState(gatherState());
		}, 500);
		return () => clearTimeout(timer);
	}, [gatherState]);

	useEffect(() => {
		setPresetList(listPresets());
		const saved = loadCurrentState();
		if (saved) applyPreset(saved);
	}, [applyPreset]);

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
				await ctx.audioWorklet.addModule(pdVisualizerWorkletUrl);
				const workletNode = new AudioWorkletNode(ctx, "cz101-processor");
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
						setDebugInfo("Worklet ready — poly 8-voice");
					} else if (e.data?.type === "debug") {
						const d = e.data;
						setDebugInfo(
							`voices=${d.activeVoices ?? 0} | freq=${d.smoothFreq?.toFixed(2)}Hz`,
						);
					}
				};
				const gainNode = ctx.createGain();
				gainNode.gain.value = volume;
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
			if (workletNodeRef.current) {
				workletNodeRef.current.disconnect();
				workletNodeRef.current = null;
			}
			if (gainNodeRef.current) {
				gainNodeRef.current.disconnect();
				gainNodeRef.current = null;
			}
			if (analyserNodeRef.current) {
				analyserNodeRef.current.disconnect();
				analyserNodeRef.current = null;
			}
			if (audioCtxRef.current) {
				audioCtxRef.current.close();
				audioCtxRef.current = null;
			}
		};
	}, [volume]);

	useEffect(() => {
		const canvas = oscilloscopeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf = 0;
		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const analyser = analyserNodeRef.current;
			if (!analyser) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				ctx.fillStyle = "#0a0a0a";
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
				ctx.beginPath();
				ctx.moveTo(0, canvas.height / 2);
				ctx.lineTo(canvas.width, canvas.height / 2);
				ctx.stroke();
				return;
			}

			const data = new Uint8Array(analyser.fftSize);
			analyser.getByteTimeDomainData(data);
			const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
			const hz = Math.max(1, effectivePitchHz);
			const samplesPerCycle = Math.max(8, Math.round(sampleRate / hz));
			const viewSamples = Math.max(
				32,
				Math.min(data.length - 2, Math.round(samplesPerCycle * scopeCycles)),
			);

			let start = Math.max(1, Math.floor((data.length - viewSamples) / 2));
			if (scopeTriggerMode !== "off") {
				const endLimit = data.length - viewSamples - 1;
				for (let i = 1; i < endLimit; i++) {
					const prev = data[i - 1];
					const curr = data[i];
					const riseHit = prev < scopeTriggerLevel && curr >= scopeTriggerLevel;
					const fallHit = prev > scopeTriggerLevel && curr <= scopeTriggerLevel;
					if (
						(scopeTriggerMode === "rise" && riseHit) ||
						(scopeTriggerMode === "fall" && fallHit)
					) {
						start = i;
						break;
					}
				}
			}

			let mean = 0;
			for (let i = 0; i < viewSamples; i++) mean += data[start + i];
			mean /= viewSamples;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
			ctx.lineWidth = 1;
			for (let y = 0.25; y < 1; y += 0.25) {
				ctx.beginPath();
				ctx.moveTo(0, canvas.height * y);
				ctx.lineTo(canvas.width, canvas.height * y);
				ctx.stroke();
			}
			for (let x = 0.1; x < 1; x += 0.1) {
				ctx.beginPath();
				ctx.moveTo(canvas.width * x, 0);
				ctx.lineTo(canvas.width * x, canvas.height);
				ctx.stroke();
			}

			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, canvas.height / 2);
			ctx.lineTo(canvas.width, canvas.height / 2);
			ctx.stroke();

			ctx.shadowColor = "#00ff00";
			ctx.shadowBlur = 8;
			ctx.strokeStyle = "#00ff00";
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < viewSamples; i++) {
				const x = (i / (viewSamples - 1)) * canvas.width;
				const idx = start + i;
				const centered = (data[idx] - mean) / 128;
				const y =
					canvas.height / 2 -
					centered * (canvas.height / 2 - 8) * scopeVerticalZoom;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
			ctx.shadowBlur = 0;
		};
		draw();
		return () => window.cancelAnimationFrame(raf);
	}, [
		effectivePitchHz,
		scopeCycles,
		scopeVerticalZoom,
		scopeTriggerMode,
		scopeTriggerLevel,
	]);

	useEffect(() => {
		if (combinedCanvasRef.current)
			drawScope(combinedCanvasRef.current, waveform.out1, waveform.out2);
		if (line1CanvasRef.current)
			drawSingleScope(line1CanvasRef.current, waveform.out1, "#2563eb");
		if (line2CanvasRef.current)
			drawSingleScope(line2CanvasRef.current, waveform.out2, "#ec4899");
		if (phaseCanvasRef.current)
			drawPhaseMap(phaseCanvasRef.current, waveform.phase);
	}, [waveform]);

	const activeNotesRef = useRef<Set<number>>(new Set());
	const sendNoteOn = useCallback((note: number, velocity = 100) => {
		if (activeNotesRef.current.has(note)) return;
		activeNotesRef.current.add(note);
		setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
		const freq = noteToFreq(note);
		workletNodeRef.current?.port.postMessage({
			type: "noteOn",
			note,
			frequency: freq,
			velocity: velocity / 127,
		});
	}, []);
	const sendNoteOff = useCallback((note: number) => {
		activeNotesRef.current.delete(note);
		setActiveNotes((prev) => prev.filter((n) => n !== note));
		workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
	}, []);

	const setSustain = useCallback((on: boolean) => {
		sustainRef.current = on;
		setSustainOn(on);
		workletNodeRef.current?.port.postMessage({ type: "sustain", on });
	}, []);

	useEffect(() => {
		const keyDown = (event: KeyboardEvent) => {
			if (event.key === " ") {
				event.preventDefault();
				if (!sustainRef.current) setSustain(true);
				return;
			}
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			event.preventDefault();
			if (pressedPcKeysRef.current.has(key)) return;
			pressedPcKeysRef.current.add(key);
			sendNoteOn(note);
		};
		const keyUp = (event: KeyboardEvent) => {
			if (event.key === " ") {
				setSustain(false);
				return;
			}
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			pressedPcKeysRef.current.delete(key);
			sendNoteOff(note);
		};
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		return () => {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
		};
	}, [sendNoteOff, sendNoteOn, setSustain]);

	useEffect(() => {
		if (!("requestMIDIAccess" in navigator) || !navigator.requestMIDIAccess)
			return;
		let disposed = false;
		const cleanupHandlers: Array<() => void> = [];
		navigator
			.requestMIDIAccess()
			.then((access) => {
				if (disposed) return;
				const bindInputs = () => {
					for (const input of access.inputs.values()) {
						const handler = (event: MIDIMessageEvent) => {
							const data = event.data;
							if (data == null || data.length < 2) return;
							const status = data[0] & 0xf0;
							if (status === 0xb0 && data[1] === 64) {
								setSustain(data[2] >= 64);
								return;
							}
							if (data.length < 3) return;
							const note = data[1];
							const velocity = data[2];
							if (status === 0x90 && velocity > 0) sendNoteOn(note, velocity);
							if (status === 0x80 || (status === 0x90 && velocity === 0))
								sendNoteOff(note);
						};
						input.onmidimessage = handler;
						cleanupHandlers.push(() => {
							input.onmidimessage = null;
						});
					}
				};
				bindInputs();
				access.onstatechange = () => {
					cleanupHandlers.splice(0).forEach((fn) => void fn());
					bindInputs();
				};
				cleanupHandlers.push(() => {
					access.onstatechange = null;
				});
			})
			.catch(() => {});
		return () => {
			disposed = true;
			cleanupHandlers.forEach((fn) => void fn());
		};
	}, [sendNoteOff, sendNoteOn, setSustain]);

	return (
		<div className="flex flex-col items-center gap-6 p-6">
			<div className="w-full">
				<div className="text-xs font-mono bg-base-300 rounded p-2 mb-2">
					<span className="text-base-content/50">[Worklet Debug] </span>
					<span className="text-success">{debugInfo}</span>
				</div>
				<div className="bg-base-200 border border-base-300 rounded-lg p-3 mb-2">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Presets
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<select
							className="select select-bordered select-xs flex-1 min-w-[120px]"
							value=""
							onChange={(e) => {
								const name = e.target.value;
								if (!name) return;
								const data = loadPreset(name);
								if (data) applyPreset(data);
								e.target.value = "";
							}}
						>
							<option value="">Load preset...</option>
							{presetList.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
						<input
							type="text"
							className="input input-bordered input-xs w-28"
							placeholder="Preset name"
							value={presetName}
							onChange={(e) => setPresetName(e.target.value)}
						/>
						<button
							type="button"
							className="btn btn-xs btn-primary"
							disabled={!presetName.trim()}
							onClick={() => {
								savePreset(presetName.trim(), gatherState());
								setPresetList(listPresets());
								setPresetName("");
							}}
						>
							Save
						</button>
						<button
							type="button"
							className="btn btn-xs btn-outline"
							disabled={!presetName.trim()}
							onClick={() => {
								deletePreset(presetName.trim());
								setPresetList(listPresets());
								setPresetName("");
							}}
						>
							Delete
						</button>
						<button
							type="button"
							className="btn btn-xs btn-warning"
							onClick={resetToDefaults}
						>
							Reset
						</button>
					</div>
				</div>
			</div>

			<div className="col-span-2">
				<button
					type="button"
					className="flex items-center gap-2 text-sm font-semibold text-base-content/70 mb-2 hover:text-primary transition-colors"
					onClick={() => setScopeOpen(!scopeOpen)}
				>
					<svg
						className={`w-4 h-4 transition-transform ${scopeOpen ? "rotate-90" : ""}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
					Live Oscilloscope
				</button>
				{scopeOpen && (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-base-200 border border-base-300 rounded p-3 mb-3">
							<label className="text-xs flex flex-col gap-1">
								<span>Time (cycles) {scopeCycles.toFixed(1)}</span>
								<input
									type="range"
									min={0.5}
									max={8}
									step={0.1}
									value={scopeCycles}
									onChange={(e) => setScopeCycles(Number(e.target.value))}
									className="range range-xs range-success"
								/>
							</label>
							<label className="text-xs flex flex-col gap-1">
								<span>Vertical {scopeVerticalZoom.toFixed(2)}x</span>
								<input
									type="range"
									min={0.25}
									max={4}
									step={0.05}
									value={scopeVerticalZoom}
									onChange={(e) => setScopeVerticalZoom(Number(e.target.value))}
									className="range range-xs range-warning"
								/>
							</label>
							<label className="text-xs flex flex-col gap-1">
								<span>Trigger</span>
								<select
									className="select select-bordered select-xs"
									value={scopeTriggerMode}
									onChange={(e) =>
										setScopeTriggerMode(
											e.target.value as "off" | "rise" | "fall",
										)
									}
								>
									<option value="off">Off</option>
									<option value="rise">Rising</option>
									<option value="fall">Falling</option>
								</select>
							</label>
							<label className="text-xs flex flex-col gap-1">
								<span>Trig Level {scopeTriggerLevel}</span>
								<input
									type="range"
									min={0}
									max={255}
									step={1}
									value={scopeTriggerLevel}
									onChange={(e) => setScopeTriggerLevel(Number(e.target.value))}
									className="range range-xs range-info"
								/>
							</label>
						</div>
						<div className="relative rounded-lg overflow-hidden bg-black border-2 border-gray-700 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
							<div
								className="absolute inset-0 pointer-events-none opacity-10"
								style={{
									backgroundImage:
										"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,255,0,0.02) 2px, rgba(0,255,0,0.02) 4px)",
									backgroundSize: "100% 4px, 4px 100%",
								}}
							/>
							<div className="absolute top-2 left-3 text-[10px] font-mono text-green-500/70">
								CH1
							</div>
							<div className="absolute top-2 right-3 text-[10px] font-mono text-green-500/70">
								{effectivePitchHz.toFixed(1)}Hz
							</div>
							<div className="absolute bottom-2 left-3 text-[10px] font-mono text-green-500/50">
								{scopeTriggerMode !== "off"
									? `TRIG: ${scopeTriggerMode.toUpperCase()}`
									: "AUTO"}
							</div>
							<canvas
								ref={oscilloscopeCanvasRef}
								width={900}
								height={200}
								className="w-full"
								style={{ imageRendering: "pixelated" }}
							/>
							<div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_60px_rgba(0,0,0,0.4)]" />
						</div>
					</>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full my-6">
				<PerLineWarpBlock
					label={PD_ALGOS.find((a) => a.value === warpAAlgo)?.label ?? "Line A"}
					waveform={waveform.out1}
					color="#2563eb"
					algo={warpAAlgo}
					setAlgo={setWarpAAlgo}
					algo2={algo2A}
					setAlgo2={setAlgo2A}
					algoBlend={algoBlendA}
					setAlgoBlend={setAlgoBlendA}
					warpAmount={warpAAmount}
					setWarpAmount={setWarpAAmount}
					dcwComp={line1DcwComp}
					setDcwComp={setLine1DcwComp}
					level={line1Level}
					setLevel={setLine1Level}
					octave={line1Octave}
					setOctave={setLine1Octave}
					fineDetune={line1Detune}
					setFineDetune={setLine1Detune}
					dcoDepth={line1DcoDepth}
					setDcoDepth={setLine1DcoDepth}
					dcoEnv={line1DcoEnv}
					setDcoEnv={setLine1DcoEnv}
					dcwEnv={line1DcwEnv}
					setDcwEnv={setLine1DcwEnv}
					dcaEnv={line1DcaEnv}
					setDcaEnv={setLine1DcaEnv}
				/>
				<PerLineWarpBlock
					label={PD_ALGOS.find((a) => a.value === warpBAlgo)?.label ?? "Line B"}
					waveform={waveform.out2}
					color="#ec4899"
					algo={warpBAlgo}
					setAlgo={setWarpBAlgo}
					algo2={algo2B}
					setAlgo2={setAlgo2B}
					algoBlend={algoBlendB}
					setAlgoBlend={setAlgoBlendB}
					warpAmount={warpBAmount}
					setWarpAmount={setWarpBAmount}
					dcwComp={line2DcwComp}
					setDcwComp={setLine2DcwComp}
					level={line2Level}
					setLevel={setLine2Level}
					octave={line2Octave}
					setOctave={setLine2Octave}
					fineDetune={line2Detune}
					setFineDetune={setLine2Detune}
					dcoDepth={line2DcoDepth}
					setDcoDepth={setLine2DcoDepth}
					dcoEnv={line2DcoEnv}
					setDcoEnv={setLine2DcoEnv}
					dcwEnv={line2DcwEnv}
					setDcwEnv={setLine2DcwEnv}
					dcaEnv={line2DcaEnv}
					setDcaEnv={setLine2DcaEnv}
				/>
			</div>

			<div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
				<div className="bg-base-200 border border-base-300 rounded-lg p-3">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Phase Modulation
					</div>
					<label className="text-xs flex flex-col gap-1">
						<span>PM Amount {intPmAmount.toFixed(2)}</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={intPmAmount}
							onChange={(e) => setIntPmAmount(Number(e.target.value))}
							className="range range-xs range-accent"
						/>
					</label>
					<label className="text-xs flex flex-col gap-1 mt-1">
						<span>PM Ratio {intPmRatio.toFixed(1)}</span>
						<input
							type="range"
							min={0.5}
							max={16}
							step={0.5}
							value={intPmRatio}
							onChange={(e) => setIntPmRatio(Number(e.target.value))}
							className="range range-xs range-accent"
						/>
					</label>
					<div className="flex items-center gap-2 mt-2">
						<input
							type="checkbox"
							checked={pmPre}
							onChange={(e) => setPmPre(e.target.checked)}
							className="checkbox checkbox-xs"
							id="pm-pre"
						/>
						<label htmlFor="pm-pre" className="text-xs">
							Pre-warp PM
						</label>
					</div>
				</div>

				<div className="bg-base-200 border border-base-300 rounded-lg p-3">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Polyphony
					</div>
					<div className="flex gap-2 mb-2">
						<button
							type="button"
							className={`btn btn-xs ${polyMode === "poly8" ? "btn-primary" : "btn-outline"}`}
							onClick={() => setPolyMode("poly8")}
						>
							Poly 8
						</button>
						<button
							type="button"
							className={`btn btn-xs ${polyMode === "mono" ? "btn-primary" : "btn-outline"}`}
							onClick={() => setPolyMode("mono")}
						>
							Mono
						</button>
						{polyMode === "mono" && (
							<div className="flex items-center gap-1 ml-2">
								<input
									type="checkbox"
									checked={legato}
									onChange={(e) => setLegato(e.target.checked)}
									className="checkbox checkbox-xs"
									id="legato"
								/>
								<label htmlFor="legato" className="text-xs">
									Legato
								</label>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2 mb-2">
						<button
							type="button"
							className={`btn btn-xs ${sustainOn ? "btn-primary" : "btn-outline"}`}
							onClick={() => setSustain(!sustainOn)}
						>
							Sustain
						</button>
						<span className="text-xs text-base-content/50">or Spacebar</span>
					</div>
					<div className="mb-2">
						<div className="text-xs text-base-content/60 mb-1">Velocity</div>
						<div className="flex gap-1">
							{(["amp", "dcw", "both"] as VelocityTarget[]).map((t) => (
								<button
									key={t}
									type="button"
									className={`btn btn-xs ${velocityTarget === t ? "btn-primary" : "btn-outline"}`}
									onClick={() => setVelocityTarget(t)}
								>
									{t === "amp" ? "Amplitude" : t === "dcw" ? "DCW" : "Both"}
								</button>
							))}
						</div>
					</div>
					<label className="text-xs flex flex-col gap-1">
						<span>Volume {(volume * 100).toFixed(0)}%</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={volume}
							onChange={(e) => setVolume(Number(e.target.value))}
							className="range range-xs"
						/>
					</label>
				</div>

				<div className="bg-base-200 border border-base-300 rounded-lg p-3">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Window
					</div>
					<select
						className="select select-bordered select-xs w-full"
						value={windowType}
						onChange={(e) =>
							setWindowType(e.target.value as "off" | "saw" | "triangle")
						}
					>
						<option value="off">Off</option>
						<option value="saw">Saw</option>
						<option value="triangle">Triangle</option>
					</select>
				</div>
			</div>

			<div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
				<div className="bg-base-200 border border-base-300 rounded-lg p-3">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Chorus
					</div>
					<label className="text-xs flex flex-col gap-1">
						<span>Rate {chorusRate.toFixed(1)} Hz</span>
						<input
							type="range"
							min={0.1}
							max={5}
							step={0.1}
							value={chorusRate}
							onChange={(e) => setChorusRate(Number(e.target.value))}
							className="range range-xs range-primary"
						/>
					</label>
					<label className="text-xs flex flex-col gap-1">
						<span>Depth {chorusDepth.toFixed(0)}</span>
						<input
							type="range"
							min={0}
							max={20}
							step={1}
							value={chorusDepth}
							onChange={(e) => setChorusDepth(Number(e.target.value))}
							className="range range-xs range-primary"
						/>
					</label>
					<label className="text-xs flex flex-col gap-1">
						<span>Mix {(chorusMix * 100).toFixed(0)}%</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={chorusMix}
							onChange={(e) => setChorusMix(Number(e.target.value))}
							className="range range-xs range-primary"
						/>
					</label>
				</div>

				<div className="bg-base-200 border border-base-300 rounded-lg p-3">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Delay
					</div>
					<label className="text-xs flex flex-col gap-1">
						<span>Time {(delayTime * 1000).toFixed(0)}ms</span>
						<input
							type="range"
							min={0.01}
							max={1}
							step={0.01}
							value={delayTime}
							onChange={(e) => setDelayTime(Number(e.target.value))}
							className="range range-xs range-secondary"
						/>
					</label>
					<label className="text-xs flex flex-col gap-1">
						<span>Feedback {(delayFeedback * 100).toFixed(0)}%</span>
						<input
							type="range"
							min={0}
							max={0.9}
							step={0.01}
							value={delayFeedback}
							onChange={(e) => setDelayFeedback(Number(e.target.value))}
							className="range range-xs range-secondary"
						/>
					</label>
					<label className="text-xs flex flex-col gap-1">
						<span>Mix {(delayMix * 100).toFixed(0)}%</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={delayMix}
							onChange={(e) => setDelayMix(Number(e.target.value))}
							className="range range-xs range-secondary"
						/>
					</label>
				</div>

				<div className="bg-base-200 border border-base-300 rounded-lg p-3">
					<div className="text-sm font-semibold text-base-content/70 mb-2">
						Reverb
					</div>
					<label className="text-xs flex flex-col gap-1">
						<span>Size {(reverbSize * 100).toFixed(0)}%</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={reverbSize}
							onChange={(e) => setReverbSize(Number(e.target.value))}
							className="range range-xs range-accent"
						/>
					</label>
					<label className="text-xs flex flex-col gap-1">
						<span>Mix {(reverbMix * 100).toFixed(0)}%</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={reverbMix}
							onChange={(e) => setReverbMix(Number(e.target.value))}
							className="range range-xs range-accent"
						/>
					</label>
				</div>
			</div>

			<div className="w-full p-3 rounded-lg bg-base-200 border border-base-300">
				<div className="text-sm font-semibold text-base-content/70 mb-2">
					On-Screen Keyboard
				</div>
				<div className="flex flex-wrap gap-2">
					{KEYBOARD_NOTES.map((note) => {
						const active = activeNotes.includes(note);
						return (
							<button
								type="button"
								key={note}
								onPointerDown={() => sendNoteOn(note)}
								onPointerUp={() => sendNoteOff(note)}
								onPointerLeave={() => sendNoteOff(note)}
								className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`}
							>
								{noteName(note)}
							</button>
						);
					})}
				</div>
			</div>
			<div className="text-xs text-gray-500 mt-2">
				Press keys A-K or click buttons. Spacebar = sustain. Poly: 8 voices with
				chorus, delay and reverb FX.
			</div>
		</div>
	);
}
