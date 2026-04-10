import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdVisualizerWorkletUrl } from "@/lib/synth/pdVisualizerWorkletUrl";
import { PerLineWarpBlock } from "./PerLineWarpBlock";
import {
	adsLevel,
	computeWaveform,
	DEFAULT_ADSR,
	envLevel,
	KEYBOARD_NOTES,
	noteName,
	noteToFreq,
	PC_KEY_TO_NOTE,
	PD_ALGOS,
	type PdAlgo,
} from "./pdAlgorithms";
import { drawPhaseMap, drawScope, drawSingleScope } from "./pdCanvas";

export default function PhaseDistortionVisualizer() {
	const [warpAAmount, setWarpAAmount] = useState(0);
	const [warpBAmount, setWarpBAmount] = useState(0);
	const [warpAAlgo, setWarpAAlgo] = useState<PdAlgo>("bend");
	const [warpBAlgo, setWarpBAlgo] = useState<PdAlgo>("bend");
	const [intPmAmount, _setIntPmAmount] = useState(0);
	const [intPmRatio, _setIntPmRatio] = useState(2);
	const [extPmAmount, _setExtPmAmount] = useState(0);
	const [pmPre, _setPmPre] = useState(true);
	const [windowType, _setWindowType] = useState<"off" | "saw" | "triangle">(
		"off",
	);
	const [pitchHz] = useState(220);
	const [volume, _setVolume] = useState(0.5);
	const [line1Level, setLine1Level] = useState(1);
	const [line2Level, setLine2Level] = useState(1);
	const [line1Octave, setLine1Octave] = useState(0);
	const [line2Octave, setLine2Octave] = useState(0);
	const [line1Detune, setLine1Detune] = useState(0);
	const [line2Detune, setLine2Detune] = useState(0);
	const [droneOn, _setDroneOn] = useState(false);
	const [activeNotes, setActiveNotes] = useState<number[]>([]);
	const [lineAEnvs, setLineAEnvs] = useState({
		warp: DEFAULT_ADSR,
		level: DEFAULT_ADSR,
	});
	const [lineBEnvs, setLineBEnvs] = useState({
		warp: DEFAULT_ADSR,
		level: DEFAULT_ADSR,
	});
	const [nowSec, setNowSec] = useState(() => performance.now() / 1000);
	const [noteOnSec, setNoteOnSec] = useState<number | null>(null);
	const [noteOffSec, setNoteOffSec] = useState<number | null>(null);
	const [scopeCycles, setScopeCycles] = useState(2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(1);
	const [scopeTriggerMode, setScopeTriggerMode] = useState<
		"off" | "rise" | "fall"
	>("rise");
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(128);
	const [scopeOpen, setScopeOpen] = useState(true);
	const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

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
			window: "off",
			dca: 1.0,
			dcw: 0,
			modulation: 0,
			warpAlgo: "cz101",
			detuneCents: 0,
			octave: 0,
		},
		line2: {
			waveform: 1,
			window: "off",
			dca: 1.0,
			dcw: 0,
			modulation: 0,
			warpAlgo: "cz101",
			detuneCents: 0,
			octave: 0,
		},
		intPmAmount: 0,
		intPmRatio: 1,
		extPmAmount: 0,
		pmPre: true,
		frequency: 220,
		volume: 0.4,
		gate: true,
		releaseSeconds: 0.25,
	});
	const line1CanvasRef = useRef<HTMLCanvasElement>(null);
	const line2CanvasRef = useRef<HTMLCanvasElement>(null);
	const combinedCanvasRef = useRef<HTMLCanvasElement>(null);
	const phaseCanvasRef = useRef<HTMLCanvasElement>(null);
	const oscilloscopeCanvasRef = useRef<HTMLCanvasElement>(null);
	const prevGateRef = useRef(false);
	const pressedPcKeysRef = useRef<Set<string>>(new Set());
	const releaseStartRef = useRef({
		warpA: 0,
		warpB: 0,
		levelA: 1,
		levelB: 1,
	});

	const heldNote =
		activeNotes.length > 0 ? activeNotes[activeNotes.length - 1] : null;
	const gateOpen = droneOn || activeNotes.length > 0;
	const lastHeldFreqRef = useRef(pitchHz);
	let effectivePitchHz = lastHeldFreqRef.current;
	if (heldNote != null) {
		lastHeldFreqRef.current = noteToFreq(heldNote);
		effectivePitchHz = lastHeldFreqRef.current;
	}

	useEffect(() => {
		let raf = 0;
		const tick = () => {
			setNowSec(performance.now() / 1000);
			raf = window.requestAnimationFrame(tick);
		};
		raf = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(raf);
	}, []);

	useEffect(() => {
		if (gateOpen && !prevGateRef.current) {
			setNoteOnSec(nowSec);
			setNoteOffSec(null);
		}
		if (!gateOpen && prevGateRef.current) {
			setNoteOffSec(nowSec);
			const dt = noteOnSec != null ? nowSec - noteOnSec : 0;
			releaseStartRef.current = {
				warpA: adsLevel(lineAEnvs.warp, dt),
				warpB: adsLevel(lineBEnvs.warp, dt),
				levelA: adsLevel(lineAEnvs.level, dt),
				levelB: adsLevel(lineBEnvs.level, dt),
			};
		}
		prevGateRef.current = gateOpen;
	}, [
		gateOpen,
		nowSec,
		lineAEnvs.warp,
		lineBEnvs.warp,
		lineAEnvs.level,
		lineBEnvs.level,
		noteOnSec,
	]);

	const effectiveWarpA = useMemo(() => {
		return (
			warpAAmount *
			envLevel(
				lineAEnvs.warp,
				nowSec,
				noteOnSec,
				noteOffSec,
				releaseStartRef.current.warpA,
			)
		);
	}, [warpAAmount, lineAEnvs.warp, nowSec, noteOnSec, noteOffSec]);

	const effectiveWarpB = useMemo(() => {
		return (
			warpBAmount *
			envLevel(
				lineBEnvs.warp,
				nowSec,
				noteOnSec,
				noteOffSec,
				releaseStartRef.current.warpB,
			)
		);
	}, [warpBAmount, lineBEnvs.warp, nowSec, noteOnSec, noteOffSec]);

	const effectiveLevelA = useMemo(() => {
		return (
			line1Level *
			envLevel(
				lineAEnvs.level,
				nowSec,
				noteOnSec,
				noteOffSec,
				releaseStartRef.current.levelA,
			)
		);
	}, [line1Level, lineAEnvs.level, nowSec, noteOnSec, noteOffSec]);

	const effectiveLevelB = useMemo(() => {
		return (
			line2Level *
			envLevel(
				lineBEnvs.level,
				nowSec,
				noteOnSec,
				noteOffSec,
				releaseStartRef.current.levelB,
			)
		);
	}, [line2Level, lineBEnvs.level, nowSec, noteOnSec, noteOffSec]);

	const waveform = useMemo(
		() =>
			computeWaveform({
				warpAAmount: effectiveWarpA,
				warpBAmount: effectiveWarpB,
				warpAAlgo,
				warpBAlgo,
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

		const finalPitch = effectivePitchHz;

		const releaseSeconds = Math.max(
			lineAEnvs.level.release,
			lineBEnvs.level.release,
			lineAEnvs.warp.release,
			lineBEnvs.warp.release,
		);

		const params = {
			lineSelect: "L1+L2",
			octave: 0,
			line1: {
				waveform: algoA.waveform,
				window: windowType,
				dca: effectiveLevelA,
				dcw: effectiveWarpA,
				modulation: 0,
				warpAlgo: algoA.algo,
				detuneCents: line1Detune,
				octave: line1Octave,
			},
			line2: {
				waveform: algoB.waveform,
				window: windowType,
				dca: effectiveLevelB,
				dcw: effectiveWarpB,
				modulation: 0,
				warpAlgo: algoB.algo,
				detuneCents: line2Detune,
				octave: line2Octave,
			},
			intPmAmount,
			intPmRatio,
			extPmAmount,
			pmPre,
			frequency: finalPitch,
			volume,
			gate: gateOpen,
			releaseSeconds,
		};
		paramsRef.current = params;
		if (!workletNodeRef.current) return;
		workletNodeRef.current.port.postMessage({ type: "setParams", params });
	}, [
		effectiveWarpA,
		effectiveWarpB,
		effectiveLevelA,
		effectiveLevelB,
		effectivePitchHz,
		warpAAlgo,
		warpBAlgo,
		intPmAmount,
		intPmRatio,
		extPmAmount,
		pmPre,
		windowType,
		volume,
		gateOpen,
		line1Detune,
		line2Detune,
		line1Octave,
		line2Octave,
		lineAEnvs.level.release,
		lineAEnvs.warp.release,
		lineBEnvs.level.release,
		lineBEnvs.warp.release,
	]);

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
					console.log("[PD Visualizer] worklet message:", e.data);
					if (e.data?.type === "ready") {
						workletNodeRef.current = workletNode;
						workletNode.port.postMessage({
							type: "setParams",
							params: paramsRef.current,
						});
						setDebugInfo("Worklet ready — params sent");
					} else if (e.data?.type === "debug") {
						const d = e.data;
						setDebugInfo(
							`freq=${d.smoothFreq?.toFixed(2)}Hz | warpA=${d.smoothWarpA?.toFixed(3)} | warpB=${d.smoothWarpB?.toFixed(3)} | pmAmt=${d.smoothPmAmount?.toFixed(3)} | gate=${d.gateOpen ? "ON" : "OFF"} | samples=${d.samplesProcessed}`,
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

				// Dark background
				ctx.fillStyle = "#0a0a0a";
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				// Grid lines - retro green
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

			// Grid lines - retro green
			ctx.strokeStyle = "rgba(0, 80, 0, 0.4)";
			ctx.lineWidth = 1;
			// Horizontal lines
			for (let y = 0.25; y < 1; y += 0.25) {
				ctx.beginPath();
				ctx.moveTo(0, canvas.height * y);
				ctx.lineTo(canvas.width, canvas.height * y);
				ctx.stroke();
			}
			// Vertical lines
			for (let x = 0.1; x < 1; x += 0.1) {
				ctx.beginPath();
				ctx.moveTo(canvas.width * x, 0);
				ctx.lineTo(canvas.width * x, canvas.height);
				ctx.stroke();
			}

			// Center line
			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, canvas.height / 2);
			ctx.lineTo(canvas.width, canvas.height / 2);
			ctx.stroke();

			// Waveform - bright phosphor green with glow
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

	const triggerNoteOn = useCallback((note: number) => {
		setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
	}, []);

	const triggerNoteOff = useCallback((note: number) => {
		setActiveNotes((prev) => prev.filter((n) => n !== note));
	}, []);

	useEffect(() => {
		const keyDown = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			event.preventDefault();
			if (pressedPcKeysRef.current.has(key)) return;
			pressedPcKeysRef.current.add(key);
			triggerNoteOn(note);
		};
		const keyUp = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			pressedPcKeysRef.current.delete(key);
			triggerNoteOff(note);
		};
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		return () => {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
		};
	}, [triggerNoteOff, triggerNoteOn]);

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
							if (data == null || data.length < 3) return;
							const status = data[0] & 0xf0;
							const note = data[1];
							const velocity = data[2];
							if (status === 0x90 && velocity > 0) triggerNoteOn(note);
							if (status === 0x80 || (status === 0x90 && velocity === 0))
								triggerNoteOff(note);
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
	}, [triggerNoteOff, triggerNoteOn]);

	return (
		<div className="flex flex-col items-center gap-6 p-6">
			<div className="w-full">
				<div className="text-xs font-mono bg-base-300 rounded p-2 mb-2">
					<span className="text-base-content/50">[Worklet Debug] </span>
					<span className="text-success">{debugInfo}</span>
				</div>
			</div>
			{/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
			
				<div className="col-span-1">
					<div className="text-sm font-semibold text-base-content/70 mt-2">
						Combined Display
					</div>
					<canvas
						ref={combinedCanvasRef}
						width={500}
						height={220}
						className="w-full bg-base-200 rounded shadow"
					/>
				</div>
			</div> */}
			{/* <div className="w-full max-w-4xl">
				<div className="text-sm font-semibold text-base-content/70 mt-2">
					Phase Map
				</div>
				<canvas
					ref={phaseCanvasRef}
					width={100}
					height={100}
					className=" bg-base-200 rounded shadow"
				/>
			</div> */}
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
					warpAmount={warpAAmount}
					setWarpAmount={setWarpAAmount}
					level={line1Level}
					setLevel={setLine1Level}
					octave={line1Octave}
					setOctave={setLine1Octave}
					fineDetune={line1Detune}
					setFineDetune={setLine1Detune}
					warpEnv={lineAEnvs.warp}
					setWarpEnv={(e) => setLineAEnvs((p) => ({ ...p, warp: e }))}
					levelEnv={lineAEnvs.level}
					setLevelEnv={(e) => setLineAEnvs((p) => ({ ...p, level: e }))}
				/>
				<PerLineWarpBlock
					label={PD_ALGOS.find((a) => a.value === warpBAlgo)?.label ?? "Line B"}
					waveform={waveform.out2}
					color="#ec4899"
					algo={warpBAlgo}
					setAlgo={setWarpBAlgo}
					warpAmount={warpBAmount}
					setWarpAmount={setWarpBAmount}
					level={line2Level}
					setLevel={setLine2Level}
					octave={line2Octave}
					setOctave={setLine2Octave}
					fineDetune={line2Detune}
					setFineDetune={setLine2Detune}
					warpEnv={lineBEnvs.warp}
					setWarpEnv={(e) => setLineBEnvs((p) => ({ ...p, warp: e }))}
					levelEnv={lineBEnvs.level}
					setLevelEnv={(e) => setLineBEnvs((p) => ({ ...p, level: e }))}
				/>
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
								onPointerDown={() => triggerNoteOn(note)}
								onPointerUp={() => triggerNoteOff(note)}
								onPointerLeave={() => triggerNoteOff(note)}
								className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`}
							>
								{noteName(note)}
							</button>
						);
					})}
				</div>
			</div>
			<div className="text-xs text-gray-500 mt-2">
				Press keys A-K or click buttons. Each line has its own ADSR envelope:
				Line A modulates Warp Amount, Line B modulates Level.
			</div>
		</div>
	);
}
