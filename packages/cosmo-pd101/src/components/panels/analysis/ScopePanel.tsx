import { type ReactElement, type RefObject, useEffect, useRef } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import { useSynthUiStore } from "@/features/synth/synthUiStore";
import { drawOscilloscope } from "@/lib/synth/drawOscilloscope";

export type ScopeMiniDisplayProps = {
	analyserNodeRef?: RefObject<AnalyserNode | null>;
	audioCtxRef?: RefObject<AudioContext | null>;
	effectivePitchHz: number;
	subscribeScopeFrames?: (
		onFrame: (frame: {
			samples: Float32Array;
			sampleRate: number;
			hz: number;
		}) => void,
	) => () => void;
};

/** @deprecated Use ScopeMiniDisplayProps */
export type ScopePanelProps = ScopeMiniDisplayProps;

function drawScopeBackdrop(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const dpr = window.devicePixelRatio || 1;
	const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
	const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
	const pixelWidth = Math.floor(drawWidth * dpr);
	const pixelHeight = Math.floor(drawHeight * dpr);
	if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = "#051005";
	ctx.fillRect(0, 0, drawWidth, drawHeight);
	ctx.strokeStyle = "rgba(0, 120, 0, 0.35)";
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
}

function calculateFrameMean(samples: Uint8Array | Float32Array): number {
	if (samples.length === 0) return 128;
	let sum = 0;
	if (samples instanceof Uint8Array) {
		for (let i = 0; i < samples.length; i++) sum += samples[i];
		return sum / samples.length;
	}
	for (let i = 0; i < samples.length; i++) sum += samples[i];
	const meanFloat = sum / samples.length;
	return Math.max(0, Math.min(255, meanFloat * 128 + 128));
}

/**
 * Compact oscilloscope canvas placed next to the single-cycle display in the
 * main toolbar.  Scope settings (cycles, zoom, trigger) are read from
 * useSynthUiStore so they stay in sync with the ScopePanel controls.
 */
export function ScopeMiniDisplay({
	analyserNodeRef,
	audioCtxRef,
	effectivePitchHz,
	subscribeScopeFrames,
}: ScopeMiniDisplayProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafIdRef = useRef(0);
	const unsubscribeRef = useRef<(() => void) | null>(null);
	const smoothedTriggerRef = useRef<number | null>(null);

	const scopeCycles = useSynthUiStore((s) => s.scopeCycles);
	const scopeVerticalZoom = useSynthUiStore((s) => s.scopeVerticalZoom);
	const scopeTriggerLevel = useSynthUiStore((s) => s.scopeTriggerLevel);

	// Keep refs to the latest values so RAF/subscription closures always read
	// current state without needing to restart effects on every settings change.
	const settingsRef = useRef({
		scopeCycles,
		scopeVerticalZoom,
		scopeTriggerLevel,
	});
	settingsRef.current = { scopeCycles, scopeVerticalZoom, scopeTriggerLevel };

	const propsRef = useRef({ effectivePitchHz, analyserNodeRef, audioCtxRef });
	propsRef.current = { effectivePitchHz, analyserNodeRef, audioCtxRef };

	// Stable draw function stored in a ref; updated each render so it always
	// reads the current settings/props refs without recreating effects.
	const drawFrameRef = useRef(
		(
			_canvas: HTMLCanvasElement,
			_samples: Uint8Array | Float32Array,
			_hz: number,
			_sampleRate: number,
		) => {},
	);
	drawFrameRef.current = (
		canvas: HTMLCanvasElement,
		samples: Uint8Array | Float32Array,
		hz: number,
		sampleRate: number,
	) => {
		const mean = calculateFrameMean(samples);
		if (smoothedTriggerRef.current == null) {
			smoothedTriggerRef.current = mean;
		} else {
			smoothedTriggerRef.current += 0.18 * (mean - smoothedTriggerRef.current);
		}
		const bias = settingsRef.current.scopeTriggerLevel - 128;
		const triggerLevel = Math.max(
			0,
			Math.min(255, smoothedTriggerRef.current + bias),
		);
		drawOscilloscope(
			canvas,
			samples,
			{
				cycles: settingsRef.current.scopeCycles,
				verticalZoom: settingsRef.current.scopeVerticalZoom,
				triggerLevel,
				triggerMode: "rise",
			},
			hz,
			sampleRate,
		);
	};

	// Subscribe to external frame push stream (plugin mode).
	useEffect(() => {
		unsubscribeRef.current?.();
		unsubscribeRef.current = null;
		if (!subscribeScopeFrames) return;
		unsubscribeRef.current = subscribeScopeFrames((frame) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			drawFrameRef.current(
				canvas,
				frame.samples,
				Math.max(1, frame.hz),
				frame.sampleRate,
			);
		});
		return () => {
			unsubscribeRef.current?.();
			unsubscribeRef.current = null;
		};
	}, [subscribeScopeFrames]);

	// RAF loop for AnalyserNode path (web-audio mode).
	useEffect(() => {
		const draw = () => {
			rafIdRef.current = window.requestAnimationFrame(draw);
			const canvas = canvasRef.current;
			if (!canvas) return;
			// External stream takes priority.
			if (unsubscribeRef.current) return;
			const {
				effectivePitchHz: hz,
				analyserNodeRef: aRef,
				audioCtxRef: ctxRef,
			} = propsRef.current;
			const analyserNode = aRef?.current;
			if (!analyserNode) {
				drawScopeBackdrop(canvas);
				return;
			}
			const data = new Uint8Array(analyserNode.fftSize);
			analyserNode.getByteTimeDomainData(data);
			const sampleRate = ctxRef?.current?.sampleRate ?? 44100;
			drawFrameRef.current(canvas, data, Math.max(1, hz), sampleRate);
		};
		draw();
		return () => {
			window.cancelAnimationFrame(rafIdRef.current);
		};
	}, []); // Runs once on mount; reads latest values through refs.

	return (
		<div className="flex flex-col items-center">
			<span className="mb-1 text-3xs uppercase tracking-[0.24em] text-base-content/55">
				Scope
			</span>
			<div className="relative overflow-hidden rounded border border-cz-border bg-cz-lcd-bg">
				<div className="absolute left-1 top-0.5 text-5xs font-mono text-cz-lcd-fg/60">
					CH1
				</div>
				<canvas
					ref={canvasRef}
					className="h-16 w-36"
					style={{ imageRendering: "pixelated" }}
				/>
			</div>
		</div>
	);
}

/**
 * Aside-panel component containing only the scope adjustment controls.
 * The oscilloscope canvas itself lives in ScopeMiniDisplay (toolbar).
 */
function ScopePanel() {
	const scopeCycles = useSynthUiStore((s) => s.scopeCycles);
	const scopeVerticalZoom = useSynthUiStore((s) => s.scopeVerticalZoom);
	const scopeTriggerLevel = useSynthUiStore((s) => s.scopeTriggerLevel);
	const setScopeCycles = useSynthUiStore((s) => s.setScopeCycles);
	const setScopeVerticalZoom = useSynthUiStore((s) => s.setScopeVerticalZoom);
	const setScopeTriggerLevel = useSynthUiStore((s) => s.setScopeTriggerLevel);

	return (
		<SynthPanelContainer>
			<div className="flex justify-center gap-2">
				<ControlKnob
					value={scopeCycles}
					onChange={setScopeCycles}
					min={0.5}
					max={8}
					size={48}
					color="#3dff3d"
					label="Cycles"
					valueFormatter={(value) => value.toFixed(1)}
				/>
				<ControlKnob
					value={scopeVerticalZoom}
					onChange={setScopeVerticalZoom}
					min={0.25}
					max={4}
					size={48}
					color="#9cb937"
					label="Zoom"
					valueFormatter={(value) => `${value.toFixed(1)}x`}
				/>
				<ControlKnob
					value={scopeTriggerLevel}
					onChange={(value) => setScopeTriggerLevel(Math.round(value))}
					min={0}
					max={255}
					size={48}
					color="#7f9de4"
					label="Trig"
					valueFormatter={(value) => `${Math.round(value)}`}
				/>
			</div>
		</SynthPanelContainer>
	);
}

ScopePanel.panelId = "scope" as const;
ScopePanel.panelTab = { topLabel: "Scope", bottomLabel: "Ctrl" } as const;

export default ScopePanel as unknown as (() => ReactElement) &
	AsidePanelComponent<"scope">;
