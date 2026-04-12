import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeCzPatch } from "@/lib/midi/czSysexDecoder";
import { convertDecodedPatchToSynthPreset } from "@/lib/synth/czPresetConverter";
import { pdVisualizerWorkletUrl } from "@/lib/synth/pdVisualizerWorkletUrl";
import {
	DEFAULT_PRESET,
	deletePreset,
	exportPreset,
	importPreset,
	listPresets,
	loadCurrentState,
	loadPreset,
	type SynthPresetData,
	saveCurrentState,
	savePreset,
} from "@/lib/synth/presetStorage";
import { ChorusSection } from "./ChorusSection";
import ControlKnob from "./ControlKnob";
import { DelaySection } from "./DelaySection";
import { PerLineWarpBlock } from "./PerLineWarpBlock";
import {
	computeWaveform,
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	noteToFreq,
	PC_KEY_TO_NOTE,
	PD_ALGOS,
	type PdAlgo,
	type StepEnvData,
} from "./pdAlgorithms";
import { drawPhaseMap, drawScope, drawSingleScope } from "./pdCanvas";
import { ReverbSection } from "./ReverbSection";

type PolyMode = "poly8" | "mono";
type VelocityTarget = "amp" | "dcw" | "both" | "off";

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
	const [intPmRatio, setIntPmRatio] = useState(1);
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
	const [activeLineTab, setActiveLineTab] = useState<"a" | "b">("a");
	const [scopeCycles, setScopeCycles] = useState(2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(1.0);
	const [scopeTriggerMode, _setScopeTriggerMode] = useState<
		"off" | "rise" | "fall"
	>("rise");
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(128);
	const [scopeOpen, setScopeOpen] = useState(true);

	const [chorusRate, setChorusRate] = useState(0.8);
	const [chorusDepth, setChorusDepth] = useState(3);
	const [chorusMix, setChorusMix] = useState(0);
	const [delayTime, setDelayTime] = useState(0.3);
	const [delayFeedback, setDelayFeedback] = useState(0.35);
	const [delayMix, setDelayMix] = useState(0);
	const [reverbSize, setReverbSize] = useState(0.5);
	const [reverbMix, setReverbMix] = useState(0);

	const [lineSelect, setLineSelect] = useState<
		"L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'"
	>("L1+L2");
	const [line1RingMod, setLine1RingMod] = useState(false);
	const [line1Noise, setLine1Noise] = useState(false);
	const [line2RingMod, setLine2RingMod] = useState(false);
	const [line2Noise, setLine2Noise] = useState(false);
	const [line1DcwKeyFollow, setLine1DcwKeyFollow] = useState(0);
	const [line1DcaKeyFollow, setLine1DcaKeyFollow] = useState(0);
	const [line2DcwKeyFollow, setLine2DcwKeyFollow] = useState(0);
	const [line2DcaKeyFollow, setLine2DcaKeyFollow] = useState(0);

	const [presetName, setPresetName] = useState("");
	const [presetList, setPresetList] = useState<string[]>([]);

	const gatherState = useCallback(
		(): SynthPresetData => ({
			warpAAmount,
			warpBAmount,
			warpAAlgo: warpAAlgo,
			warpBAlgo: warpBAlgo,
			algo2A: algo2A ?? null,
			algo2B: algo2B ?? null,
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
			lineSelect,
			line1RingMod,
			line1Noise,
			line2RingMod,
			line2Noise,
			line1DcwKeyFollow,
			line1DcaKeyFollow,
			line2DcwKeyFollow,
			line2DcaKeyFollow,
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
			lineSelect,
			line1RingMod,
			line1Noise,
			line2RingMod,
			line2Noise,
			line1DcwKeyFollow,
			line1DcaKeyFollow,
			line2DcwKeyFollow,
			line2DcaKeyFollow,
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
		setLineSelect(data.lineSelect);
		setLine1RingMod(data.line1RingMod);
		setLine1Noise(data.line1Noise);
		setLine2RingMod(data.line2RingMod);
		setLine2Noise(data.line2Noise);
		setLine1DcwKeyFollow(data.line1DcwKeyFollow);
		setLine1DcaKeyFollow(data.line1DcaKeyFollow);
		setLine2DcwKeyFollow(data.line2DcwKeyFollow);
		setLine2DcaKeyFollow(data.line2DcaKeyFollow);
	}, []);

	const resetToDefaults = useCallback(() => {
		applyPreset(DEFAULT_PRESET);
	}, [applyPreset]);

	const copyLineSettings = useCallback(
		(
			source: "a" | "b",
			target: "a" | "b",
			mode: "algos" | "envelopes" | "full",
		) => {
			const sourceLine =
				source === "a"
					? {
							warpAmount: warpAAmount,
							algo: warpAAlgo,
							algo2: algo2A,
							algoBlend: algoBlendA,
							dcwComp: line1DcwComp,
							level: line1Level,
							octave: line1Octave,
							fineDetune: line1Detune,
							dcoDepth: line1DcoDepth,
							dcoEnv: line1DcoEnv,
							dcwEnv: line1DcwEnv,
							dcaEnv: line1DcaEnv,
						}
					: {
							warpAmount: warpBAmount,
							algo: warpBAlgo,
							algo2: algo2B,
							algoBlend: algoBlendB,
							dcwComp: line2DcwComp,
							level: line2Level,
							octave: line2Octave,
							fineDetune: line2Detune,
							dcoDepth: line2DcoDepth,
							dcoEnv: line2DcoEnv,
							dcwEnv: line2DcwEnv,
							dcaEnv: line2DcaEnv,
						};

			const applyToTarget = {
				algos: () => {
					if (target === "a") {
						setWarpAAlgo(sourceLine.algo);
						setAlgo2A(sourceLine.algo2);
						setAlgoBlendA(sourceLine.algoBlend);
						setWarpAAmount(sourceLine.warpAmount);
						return;
					}
					setWarpBAlgo(sourceLine.algo);
					setAlgo2B(sourceLine.algo2);
					setAlgoBlendB(sourceLine.algoBlend);
					setWarpBAmount(sourceLine.warpAmount);
				},
				envelopes: () => {
					if (target === "a") {
						setLine1DcoEnv(sourceLine.dcoEnv);
						setLine1DcwEnv(sourceLine.dcwEnv);
						setLine1DcaEnv(sourceLine.dcaEnv);
						return;
					}
					setLine2DcoEnv(sourceLine.dcoEnv);
					setLine2DcwEnv(sourceLine.dcwEnv);
					setLine2DcaEnv(sourceLine.dcaEnv);
				},
				full: () => {
					if (target === "a") {
						setWarpAAmount(sourceLine.warpAmount);
						setWarpAAlgo(sourceLine.algo);
						setAlgo2A(sourceLine.algo2);
						setAlgoBlendA(sourceLine.algoBlend);
						setLine1DcwComp(sourceLine.dcwComp);
						setLine1Level(sourceLine.level);
						setLine1Octave(sourceLine.octave);
						setLine1Detune(sourceLine.fineDetune);
						setLine1DcoDepth(sourceLine.dcoDepth);
						setLine1DcoEnv(sourceLine.dcoEnv);
						setLine1DcwEnv(sourceLine.dcwEnv);
						setLine1DcaEnv(sourceLine.dcaEnv);
						return;
					}
					setWarpBAmount(sourceLine.warpAmount);
					setWarpBAlgo(sourceLine.algo);
					setAlgo2B(sourceLine.algo2);
					setAlgoBlendB(sourceLine.algoBlend);
					setLine2DcwComp(sourceLine.dcwComp);
					setLine2Level(sourceLine.level);
					setLine2Octave(sourceLine.octave);
					setLine2Detune(sourceLine.fineDetune);
					setLine2DcoDepth(sourceLine.dcoDepth);
					setLine2DcoEnv(sourceLine.dcoEnv);
					setLine2DcwEnv(sourceLine.dcwEnv);
					setLine2DcaEnv(sourceLine.dcaEnv);
				},
			};

			applyToTarget[mode]();
		},
		[
			algo2A,
			algo2B,
			algoBlendA,
			algoBlendB,
			line1DcaEnv,
			line1DcoDepth,
			line1DcoEnv,
			line1DcwComp,
			line1DcwEnv,
			line1Detune,
			line1Level,
			line1Octave,
			line2DcaEnv,
			line2DcoDepth,
			line2DcoEnv,
			line2DcwComp,
			line2DcwEnv,
			line2Detune,
			line2Level,
			line2Octave,
			warpAAlgo,
			warpAAmount,
			warpBAlgo,
			warpBAmount,
		],
	);

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
			dcoDepth: 12,
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
			dcoDepth: 12,
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
	const leftScopeCanvasRef = useRef<HTMLCanvasElement>(null);
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
					} else if (e.data?.type === "debug") {
						// debug info - uncomment for development
						// console.log(e.data);
					}
				};
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
	}, []);

	useEffect(() => {
		const canvas = oscilloscopeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf = 0;
		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
			const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
			const dpr = window.devicePixelRatio || 1;
			const pixelWidth = Math.floor(drawWidth * dpr);
			const pixelHeight = Math.floor(drawHeight * dpr);
			if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			const analyser = analyserNodeRef.current;
			if (!analyser) {
				ctx.clearRect(0, 0, drawWidth, drawHeight);

				ctx.fillStyle = "#0a0a0a";
				ctx.fillRect(0, 0, drawWidth, drawHeight);

				ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
				ctx.beginPath();
				ctx.moveTo(0, drawHeight / 2);
				ctx.lineTo(drawWidth, drawHeight / 2);
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

			ctx.clearRect(0, 0, drawWidth, drawHeight);

			ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
			ctx.lineWidth = 1;
			for (let y = 0.25; y < 1; y += 0.25) {
				ctx.beginPath();
				ctx.moveTo(0, drawHeight * y);
				ctx.lineTo(drawWidth, drawHeight * y);
				ctx.stroke();
			}
			for (let x = 0.1; x < 1; x += 0.1) {
				ctx.beginPath();
				ctx.moveTo(drawWidth * x, 0);
				ctx.lineTo(drawWidth * x, drawHeight);
				ctx.stroke();
			}

			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, drawHeight / 2);
			ctx.lineTo(drawWidth, drawHeight / 2);
			ctx.stroke();

			ctx.shadowColor = "#00ff00";
			ctx.shadowBlur = 8;
			ctx.strokeStyle = "#00ff00";
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < viewSamples; i++) {
				const x = (i / (viewSamples - 1)) * drawWidth;
				const idx = start + i;
				const centered = (data[idx] - mean) / 128;
				const y =
					drawHeight / 2 - centered * (drawHeight / 2 - 8) * scopeVerticalZoom;
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
		const canvas = leftScopeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf = 0;
		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
			const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
			const dpr = window.devicePixelRatio || 1;
			const pixelWidth = Math.floor(drawWidth * dpr);
			const pixelHeight = Math.floor(drawHeight * dpr);
			if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			const analyser = analyserNodeRef.current;
			if (!analyser) {
				ctx.clearRect(0, 0, drawWidth, drawHeight);

				ctx.fillStyle = "#0a0a0a";
				ctx.fillRect(0, 0, drawWidth, drawHeight);

				ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
				ctx.beginPath();
				ctx.moveTo(0, drawHeight / 2);
				ctx.lineTo(drawWidth, drawHeight / 2);
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
				Math.min(data.length - 2, Math.round(samplesPerCycle * 1)),
			);

			const start = Math.max(1, Math.floor((data.length - viewSamples) / 2));

			let mean = 0;
			for (let i = 0; i < viewSamples; i++) mean += data[start + i];
			mean /= viewSamples;

			ctx.clearRect(0, 0, drawWidth, drawHeight);

			ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
			ctx.lineWidth = 1;
			for (let y = 0.25; y < 1; y += 0.25) {
				ctx.beginPath();
				ctx.moveTo(0, drawHeight * y);
				ctx.lineTo(drawWidth, drawHeight * y);
				ctx.stroke();
			}

			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, drawHeight / 2);
			ctx.lineTo(drawWidth, drawHeight / 2);
			ctx.stroke();

			ctx.shadowColor = "#00ff00";
			ctx.shadowBlur = 8;
			ctx.strokeStyle = "#00ff00";
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < viewSamples; i++) {
				const x = (i / (viewSamples - 1)) * drawWidth;
				const idx = start + i;
				const centered = (data[idx] - mean) / 128;
				const y = drawHeight / 2 - centered * (drawHeight / 2 - 8) * 1;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
			ctx.shadowBlur = 0;
		};
		draw();
		return () => window.cancelAnimationFrame(raf);
	}, [effectivePitchHz]);

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
	const monoNoteRef = useRef<number | null>(null);
	const sendNoteOn = useCallback(
		(note: number, velocity = 100) => {
			if (activeNotesRef.current.has(note)) return;
			const isMono = polyMode === "mono";
			const prevMonoNote = monoNoteRef.current;
			if (isMono && prevMonoNote != null) {
				activeNotesRef.current.delete(prevMonoNote);
				workletNodeRef.current?.port.postMessage({
					type: "noteOff",
					note: prevMonoNote,
				});
			}
			activeNotesRef.current.add(note);
			monoNoteRef.current = note;
			setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
			const freq = noteToFreq(note);
			workletNodeRef.current?.port.postMessage({
				type: "noteOn",
				note,
				frequency: freq,
				velocity: velocityTarget !== "off" ? velocity / 127 : 0,
			});
		},
		[polyMode, velocityTarget],
	);
	const sendNoteOff = useCallback(
		(note: number) => {
			if (polyMode === "mono" && monoNoteRef.current === note) {
				monoNoteRef.current = null;
			}
			activeNotesRef.current.delete(note);
			setActiveNotes((prev) => prev.filter((n) => n !== note));
			if (!sustainRef.current) {
				workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
			}
		},
		[polyMode],
	);

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
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,113,206,0.08),transparent_22%),radial-gradient(circle_at_20%_20%,rgba(61,237,255,0.08),transparent_20%),linear-gradient(180deg,#141624_0%,#10111a_100%)] p-4 md:p-6 w-full">
			<div className="mx-auto grid w-full gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
				<aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-y-auto">
					<div className="flex h-full flex-col gap-4 rounded-[1.8rem] border border-base-300/70 bg-[linear-gradient(180deg,rgba(22,23,36,0.97),rgba(17,18,28,0.98))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
						<div className="border-b border-base-300/50 pb-3 shrink-0">
							<div className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
								CZ Lab
							</div>
							<h1 className="mt-2 text-2xl font-semibold text-base-content">
								Phase Distortion Deck
							</h1>
							<p className="mt-2 text-sm text-base-content/55">
								Retro-cyber patch bay for fast CZ sculpting.
							</p>
						</div>

						<div className="mt-auto rounded-2xl border border-base-300/70 bg-base-300/20 p-3">
							<div className="mb-2 flex items-center justify-between gap-2">
								<div className="text-[10px] uppercase tracking-[0.24em] text-base-content/55">
									Scope
								</div>
								<button
									type="button"
									className={`btn btn-xs ${scopeOpen ? "btn-primary" : "btn-outline"}`}
									onClick={() => setScopeOpen(!scopeOpen)}
								>
									{scopeOpen ? "Hide" : "Show"}
								</button>
							</div>
							{scopeOpen && (
								<div className="space-y-2">
									<div className="relative overflow-hidden rounded-lg border border-success/25 bg-[#08110f]">
										<div className="absolute left-2 top-1 text-[8px] font-mono text-success/60">
											CH1
										</div>
										<div className="absolute right-3 top-3 text-[10px] font-mono uppercase tracking-[0.2em] text-success/60">
											{effectivePitchHz.toFixed(1)} Hz
										</div>
										<canvas
											ref={oscilloscopeCanvasRef}
											width={900}
											height={220}
											className="h-36 w-full"
											style={{ imageRendering: "pixelated" }}
										/>
									</div>
									<div className="flex justify-center gap-2">
										<ControlKnob
											value={scopeCycles}
											onChange={setScopeCycles}
											min={0.5}
											max={8}
											size={48}
											color="#4ade80"
											label="Cycles"
											valueFormatter={(value) => value.toFixed(1)}
										/>
										<ControlKnob
											value={scopeVerticalZoom}
											onChange={setScopeVerticalZoom}
											min={0.25}
											max={4}
											size={48}
											color="#facc15"
											label="Zoom"
											valueFormatter={(value) => `${value.toFixed(1)}x`}
										/>
										<ControlKnob
											value={scopeTriggerLevel}
											onChange={(value) =>
												setScopeTriggerLevel(Math.round(value))
											}
											min={0}
											max={255}
											size={48}
											color="#67e8f9"
											label="Trig"
											valueFormatter={(value) => `${Math.round(value)}`}
										/>
									</div>
									<div className="mt-3 grid grid-cols-2 gap-3">
										<div className="rounded-xl border border-base-300/60 bg-base-100/30 p-2">
											<div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-base-content/45">
												Mix A/B
											</div>
											<canvas
												ref={combinedCanvasRef}
												width={220}
												height={70}
												className="h-17.5 w-full rounded-lg"
											/>
										</div>
										<div className="rounded-xl border border-base-300/60 bg-base-100/30 p-2">
											<div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-base-content/45">
												Phase Map
											</div>
											<canvas
												ref={phaseCanvasRef}
												width={220}
												height={70}
												className="h-17.5 w-full rounded-lg"
											/>
										</div>
									</div>
								</div>
							)}
						</div>

						<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3 shrink-0">
							<div className="mb-3 flex items-center justify-between">
								<div className="text-[10px] uppercase tracking-[0.24em] text-base-content/55">
									Presets
								</div>
								<button
									type="button"
									className="btn btn-xs btn-warning"
									onClick={resetToDefaults}
								>
									Reset
								</button>
								<label className="btn btn-xs btn-outline">
									Import SysEx
									<input
										type="file"
										accept=".syx"
										className="hidden"
										onChange={async (e) => {
											const file = e.target.files?.[0];
											if (!file) return;
											const buffer = await file.arrayBuffer();
											const data = new Uint8Array(buffer);
											const decoded = decodeCzPatch(data);
											if (decoded) {
												const preset =
													convertDecodedPatchToSynthPreset(decoded);
												applyPreset(preset);
											}
											e.target.value = "";
										}}
									/>
								</label>
							</div>
							<div className="space-y-2">
								<select
									className="select select-bordered select-sm w-full"
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
									className="input input-bordered input-sm w-full"
									placeholder="Preset name"
									value={presetName}
									onChange={(e) => setPresetName(e.target.value)}
								/>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										className="btn btn-sm btn-primary"
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
										className="btn btn-sm btn-outline"
										disabled={!presetName.trim()}
										onClick={() => {
											deletePreset(presetName.trim());
											setPresetList(listPresets());
											setPresetName("");
										}}
									>
										Delete
									</button>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										className="btn btn-xs btn-outline flex-1"
										onClick={() => {
											const exported = exportPreset(presetList[0] ?? "");
											if (exported) {
												const blob = new Blob([exported], {
													type: "application/json",
												});
												const url = URL.createObjectURL(blob);
												const a = document.createElement("a");
												a.href = url;
												a.download = `cz101-preset-${presetList[0] || "export"}.json`;
												a.click();
												URL.revokeObjectURL(url);
											}
										}}
										disabled={presetList.length === 0}
									>
										Export
									</button>
									<label className="btn btn-xs btn-outline flex-1">
										Import
										<input
											type="file"
											accept=".json"
											className="hidden"
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (!file) return;
												const text = await file.text();
												const imported = importPreset(text);
												if (imported) {
													applyPreset(imported);
												}
											}}
										/>
									</label>
								</div>
								<div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-base-300/60 bg-base-100/40 p-2">
									{presetList.length === 0 ? (
										<div className="px-2 py-3 text-xs text-base-content/45">
											No stored presets yet.
										</div>
									) : (
										presetList.map((name) => (
											<button
												key={name}
												type="button"
												className="btn btn-ghost btn-sm w-full justify-start rounded-lg"
												onClick={() => {
													const data = loadPreset(name);
													if (data) applyPreset(data);
												}}
											>
												{name}
											</button>
										))
									)}
								</div>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
							<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3">
								<div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-base-content/55">
									Global Voice
								</div>
								<div className="mb-3 flex justify-center">
									<ControlKnob
										value={volume}
										onChange={setVolume}
										min={0}
										max={1}
										size={58}
										color="#f6f06d"
										label="Volume"
										valueFormatter={(value) => `${Math.round(value * 100)}%`}
									/>
								</div>
								<div className="space-y-2">
									<div className="join w-full">
										<button
											type="button"
											className={`btn btn-sm join-item flex-1 ${polyMode === "poly8" ? "btn-primary" : "btn-outline"}`}
											onClick={() => setPolyMode("poly8")}
										>
											Poly 8
										</button>
										<button
											type="button"
											className={`btn btn-sm join-item flex-1 ${polyMode === "mono" ? "btn-primary" : "btn-outline"}`}
											onClick={() => setPolyMode("mono")}
										>
											Mono
										</button>
									</div>
									{polyMode === "mono" && (
										<label className="label cursor-pointer justify-start gap-2 rounded-xl border border-base-300/60 bg-base-100/40 px-3 py-2">
											<input
												type="checkbox"
												checked={legato}
												onChange={(e) => setLegato(e.target.checked)}
												className="checkbox checkbox-xs"
											/>
											<span className="label-text text-xs">Legato</span>
										</label>
									)}
									<div className="flex items-center gap-2">
										<button
											type="button"
											className={`btn btn-sm ${sustainOn ? "btn-primary" : "btn-outline"}`}
											onClick={() => setSustain(!sustainOn)}
										>
											Sustain
										</button>
										<span className="text-xs text-base-content/45">
											Spacebar
										</span>
									</div>
									<div>
										<div className="mb-1 text-xs text-base-content/55">
											Velocity
										</div>
										<div className="flex flex-wrap gap-1">
											{(["amp", "dcw", "both", "off"] as VelocityTarget[]).map(
												(target) => (
													<button
														key={target}
														type="button"
														className={`btn btn-xs ${velocityTarget === target ? "btn-primary" : "btn-outline"}`}
														onClick={() => setVelocityTarget(target)}
													>
														{target === "amp"
															? "Amp"
															: target === "dcw"
																? "DCW"
																: target === "both"
																	? "Both"
																	: "Off"}
													</button>
												),
											)}
										</div>
									</div>
									<div>
										<div className="mb-1 text-xs text-base-content/55">
											Window
										</div>
										<select
											className="select select-bordered select-sm w-full"
											value={windowType}
											onChange={(e) =>
												setWindowType(
													e.target.value as "off" | "saw" | "triangle",
												)
											}
										>
											<option value="off">Off</option>
											<option value="saw">Saw</option>
											<option value="triangle">Triangle</option>
										</select>
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3">
								<div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-base-content/55">
									Phase Mod
								</div>
								<div className="flex justify-center gap-4">
									<ControlKnob
										value={intPmAmount}
										onChange={setIntPmAmount}
										min={0}
										max={0.3}
										size={52}
										color="#fda4af"
										label="Amount"
										valueFormatter={(value) => value.toFixed(2)}
									/>
									<ControlKnob
										value={intPmRatio}
										onChange={setIntPmRatio}
										min={0.5}
										max={4}
										size={52}
										color="#fdba74"
										label="Ratio"
										valueFormatter={(value) => value.toFixed(1)}
									/>
								</div>
								<label className="label mt-3 cursor-pointer justify-start gap-2 rounded-xl border border-base-300/60 bg-base-100/40 px-3 py-2">
									<input
										type="checkbox"
										checked={pmPre}
										onChange={(e) => setPmPre(e.target.checked)}
										className="checkbox checkbox-xs"
									/>
									<span className="label-text text-xs">Pre-warp PM</span>
								</label>
							</div>
						</div>

						<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3"></div>
					</div>
				</aside>

				<main className="space-y-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
					<section className="rounded-[1.8rem] border border-base-300/70 bg-[linear-gradient(180deg,rgba(27,29,43,0.95),rgba(17,18,28,0.98))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
						<div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-base-content/55">
							FX Rack
						</div>
						<div className="grid grid-cols-3 gap-x-3">
							<ChorusSection
								rate={chorusRate}
								setRate={setChorusRate}
								depth={chorusDepth}
								setDepth={setChorusDepth}
								mix={chorusMix}
								setMix={setChorusMix}
							/>
							<DelaySection
								time={delayTime}
								setTime={setDelayTime}
								feedback={delayFeedback}
								setFeedback={setDelayFeedback}
								mix={delayMix}
								setMix={setDelayMix}
							/>
							<ReverbSection
								size={reverbSize}
								setSize={setReverbSize}
								mix={reverbMix}
								setMix={setReverbMix}
							/>
						</div>
					</section>

					<section className="space-y-4">
						<div className="flex justify-center gap-2">
							<button
								type="button"
								className={`btn btn-sm ${activeLineTab === "a" ? "btn-primary" : "btn-outline"}`}
								onClick={() => setActiveLineTab("a")}
							>
								Line A
							</button>
							<button
								type="button"
								className={`btn btn-sm ${activeLineTab === "b" ? "btn-secondary" : "btn-outline"}`}
								onClick={() => setActiveLineTab("b")}
							>
								Line B
							</button>
						</div>

						{activeLineTab === "a" && (
							<PerLineWarpBlock
								label={
									PD_ALGOS.find((a) => a.value === warpAAlgo)?.label ?? "Line A"
								}
								waveform={waveform.out1}
								color="#3dedff"
								copyTargetLabel={
									PD_ALGOS.find((a) => a.value === warpBAlgo)?.label ?? "Line B"
								}
								onCopyAlgos={() => copyLineSettings("a", "b", "algos")}
								onCopyEnvelopes={() => copyLineSettings("a", "b", "envelopes")}
								onCopyFull={() => copyLineSettings("a", "b", "full")}
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
						)}

						{activeLineTab === "b" && (
							<PerLineWarpBlock
								label={
									PD_ALGOS.find((a) => a.value === warpBAlgo)?.label ?? "Line B"
								}
								waveform={waveform.out2}
								color="#ff71ce"
								copyTargetLabel={
									PD_ALGOS.find((a) => a.value === warpAAlgo)?.label ?? "Line A"
								}
								onCopyAlgos={() => copyLineSettings("b", "a", "algos")}
								onCopyEnvelopes={() => copyLineSettings("b", "a", "envelopes")}
								onCopyFull={() => copyLineSettings("b", "a", "full")}
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
						)}
					</section>
				</main>
			</div>
		</div>
	);
}
