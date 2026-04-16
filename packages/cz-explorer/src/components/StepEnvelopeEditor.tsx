import { memo, useCallback, useEffect, useRef, useState } from "react";
import ControlKnob from "./ControlKnob";
import type { StepEnvData } from "./pdAlgorithms";
import Card from "./ui/Card";

const STEP_KEYS = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;

interface StepEnvelopeEditorProps {
	title: string;
	env: StepEnvData;
	onChange: (env: StepEnvData) => void;
	color?: string;
}

type EnvPoint = {
	index: number;
	x: number;
	y: number;
};

const CHART_PADDING_Y = 8;
const CHART_PADDING_X = 12;
const HOVER_RADIUS_PX = 22;

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function editorStepDuration(rate: number, activeStepCount: number): number {
	// Reciprocal spacing model: each step gets a width weight of
	// 1 / ((rate + 1) * activeSteps). This keeps high-rate changes smooth
	// (no abrupt 98/99 jump) while preserving "higher rate = shorter time".
	const clampedRate = clamp(Math.round(rate), 0, 99);
	const safeStepCount = Math.max(1, activeStepCount);
	return 1 / ((clampedRate + 1) * safeStepCount);
}

function getStepAllowedXRange(
	stepIndex: number,
	activeStepCount: number,
	canvasWidth: number,
) {
	const drawWidth = canvasWidth - CHART_PADDING_X * 2;
	const safeStepCount = Math.max(1, activeStepCount);
	const cellWidth = drawWidth / safeStepCount;
	const minX = CHART_PADDING_X + stepIndex * cellWidth;
	const maxX = CHART_PADDING_X + (stepIndex + 1) * cellWidth;
	return { minX, maxX };
}

function buildEnvelopePoints(
	env: StepEnvData,
	width: number,
	height: number,
): EnvPoint[] {
	const activeSteps = env.steps.slice(0, env.stepCount);
	if (activeSteps.length === 0) return [];
	const activeStepCount = activeSteps.length;

	const drawWidth = width - CHART_PADDING_X * 2;
	const drawHeight = height - CHART_PADDING_Y * 2;

	let totalTime = 0;
	for (const step of activeSteps)
		totalTime += editorStepDuration(step.rate, activeStepCount);
	if (totalTime <= 0) totalTime = 1;

	const points: EnvPoint[] = [];
	let x = CHART_PADDING_X;

	for (let i = 0; i < activeSteps.length; i++) {
		const step = activeSteps[i];
		const duration = editorStepDuration(step.rate, activeStepCount);
		const dx = (duration / totalTime) * drawWidth;
		x += dx;
		points.push({
			index: i,
			x,
			y: CHART_PADDING_Y + (1 - step.level) * drawHeight,
		});
	}

	return points;
}

function findClosestPoint(
	points: EnvPoint[],
	x: number,
	y: number,
): { point: EnvPoint; distanceSquared: number } | null {
	if (points.length === 0) return null;

	let closest = points[0];
	let bestDist = Number.POSITIVE_INFINITY;

	for (const point of points) {
		const dx = point.x - x;
		const dy = point.y - y;
		const dist = dx * dx + dy * dy;
		if (dist < bestDist) {
			bestDist = dist;
			closest = point;
		}
	}

	return { point: closest, distanceSquared: bestDist };
}

function drawEnvPreview(
	canvas: HTMLCanvasElement,
	env: StepEnvData,
	color: string,
	highlightStep: number | null,
) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const w = canvas.width;
	const h = canvas.height;
	const drawHeight = h - CHART_PADDING_Y * 2;
	ctx.clearRect(0, 0, w, h);

	ctx.fillStyle = "rgba(0,0,0,0.3)";
	ctx.fillRect(0, 0, w, h);

	ctx.strokeStyle = "rgba(100,100,100,0.3)";
	ctx.lineWidth = 1;
	for (let y = 0.25; y < 1; y += 0.25) {
		ctx.beginPath();
		ctx.moveTo(CHART_PADDING_X, h * (1 - y));
		ctx.lineTo(w - CHART_PADDING_X, h * (1 - y));
		ctx.stroke();
	}
	const points = buildEnvelopePoints(env, w, h);

	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(CHART_PADDING_X, CHART_PADDING_Y + drawHeight);
	for (let i = 0; i < points.length; i++) {
		ctx.lineTo(points[i].x, points[i].y);
	}
	ctx.stroke();

	const susStep = Math.min(env.sustainStep, env.stepCount - 1);
	if (susStep >= 0 && susStep < points.length) {
		const sp = points[susStep];
		ctx.strokeStyle = "rgba(255,200,0,0.6)";
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(sp.x, CHART_PADDING_Y);
		ctx.lineTo(sp.x, h - CHART_PADDING_Y);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		const isHighlighted = highlightStep === p.index;
		if (isHighlighted) {
			ctx.strokeStyle = "rgba(255,255,255,0.8)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
			ctx.stroke();
		}

		ctx.fillStyle = p.index === susStep ? "#fbbf24" : color;
		ctx.beginPath();
		ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
		ctx.fill();
	}
}

export const StepEnvelopeEditor = memo(function StepEnvelopeEditor({
	title,
	env,
	onChange,
	color = "#60a5fa",
}: StepEnvelopeEditorProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [hoverStep, setHoverStep] = useState<number | null>(null);
	const [dragState, setDragState] = useState<{
		pointerId: number;
		stepIndex: number;
		startClientX: number;
		startClientY: number;
		startLevel: number;
		startRate: number;
	} | null>(null);

	useEffect(() => {
		if (canvasRef.current) {
			drawEnvPreview(
				canvasRef.current,
				env,
				color,
				dragState?.stepIndex ?? hoverStep,
			);
		}
	}, [env, color, hoverStep, dragState]);

	const updateStep = useCallback(
		(index: number, field: "level" | "rate", value: number) => {
			const newSteps = env.steps.map((s, i) =>
				i === index ? { ...s, [field]: value } : s,
			);
			onChange({ ...env, steps: newSteps });
		},
		[env, onChange],
	);

	const updateStepValues = useCallback(
		(index: number, level: number, rate: number) => {
			const newSteps = env.steps.map((step, i) =>
				i === index ? { ...step, level, rate } : step,
			);
			onChange({ ...env, steps: newSteps });
		},
		[env, onChange],
	);

	const getRateForPointerX = useCallback(
		(stepIndex: number, pointerX: number, canvasWidth: number) => {
			const activeSteps = env.steps.slice(0, env.stepCount);
			const activeStepCount = activeSteps.length;
			if (stepIndex < 0 || stepIndex >= activeSteps.length) {
				return env.steps[stepIndex]?.rate ?? 0;
			}
			const allowed = getStepAllowedXRange(
				stepIndex,
				activeStepCount,
				canvasWidth,
			);
			const clampedPointerX = clamp(pointerX, allowed.minX, allowed.maxX);

			const drawWidth = canvasWidth - CHART_PADDING_X * 2;
			let bestRate = activeSteps[stepIndex]?.rate ?? 0;
			let bestDistance = Number.POSITIVE_INFINITY;

			for (let candidateRate = 0; candidateRate <= 99; candidateRate++) {
				let totalTime = 0;
				let cumulative = 0;

				for (let i = 0; i < activeSteps.length; i++) {
					const rate = i === stepIndex ? candidateRate : activeSteps[i].rate;
					const duration = editorStepDuration(rate, activeStepCount);
					totalTime += duration;
					if (i <= stepIndex) cumulative += duration;
				}

				if (totalTime <= 0) continue;
				const pointX = CHART_PADDING_X + (cumulative / totalTime) * drawWidth;
				const distance = Math.abs(pointX - clampedPointerX);

				if (distance < bestDistance) {
					bestDistance = distance;
					bestRate = candidateRate;
				}
			}

			return bestRate;
		},
		[env.stepCount, env.steps],
	);

	const getRelativePointerPosition = useCallback(
		(clientX: number, clientY: number) => {
			const canvas = canvasRef.current;
			if (!canvas) return null;

			const rect = canvas.getBoundingClientRect();
			const x = ((clientX - rect.left) / rect.width) * canvas.width;
			const y = ((clientY - rect.top) / rect.height) * canvas.height;
			return { x, y, rect };
		},
		[],
	);

	const getClosestStepAtPointer = useCallback(
		(clientX: number, clientY: number) => {
			const pos = getRelativePointerPosition(clientX, clientY);
			if (!pos) return null;

			const points = buildEnvelopePoints(env, 1000, 200);
			const closest = findClosestPoint(points, pos.x, pos.y);
			if (!closest) return null;

			return {
				stepIndex: closest.point.index,
				distanceSquared: closest.distanceSquared,
			};
		},
		[env, getRelativePointerPosition],
	);

	const handleCanvasPointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const closest = getClosestStepAtPointer(e.clientX, e.clientY);
			if (!closest) return;

			const step = env.steps[closest.stepIndex];
			if (!step) return;

			canvas.setPointerCapture(e.pointerId);
			setHoverStep(closest.stepIndex);
			setDragState({
				pointerId: e.pointerId,
				stepIndex: closest.stepIndex,
				startClientX: e.clientX,
				startClientY: e.clientY,
				startLevel: step.level,
				startRate: step.rate,
			});
		},
		[env.steps, getClosestStepAtPointer],
	);

	const handleCanvasPointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (dragState && dragState.pointerId === e.pointerId) {
				const pos = getRelativePointerPosition(e.clientX, e.clientY);
				if (!pos) return;

				const levelDelta =
					(dragState.startClientY - e.clientY) / pos.rect.height;
				const level = clamp(dragState.startLevel + levelDelta, 0, 1);
				const isLastActiveStep = dragState.stepIndex === env.stepCount - 1;
				const allowed = getStepAllowedXRange(
					dragState.stepIndex,
					env.stepCount,
					canvasRef.current?.width ?? 1000,
				);
				const clampedX = clamp(pos.x, allowed.minX, allowed.maxX);
				const rate = isLastActiveStep
					? clamp(
							Math.round(
								((allowed.maxX - clampedX) /
									Math.max(1, allowed.maxX - allowed.minX)) *
									99,
							),
							0,
							99,
						)
					: getRateForPointerX(
							dragState.stepIndex,
							clampedX,
							canvasRef.current?.width ?? 1000,
						);
				updateStepValues(dragState.stepIndex, level, rate);
				setHoverStep(dragState.stepIndex);
				return;
			}

			const closest = getClosestStepAtPointer(e.clientX, e.clientY);
			if (!closest) {
				setHoverStep(null);
				return;
			}

			if (closest.distanceSquared <= HOVER_RADIUS_PX * HOVER_RADIUS_PX) {
				setHoverStep(closest.stepIndex);
			} else {
				setHoverStep(null);
			}
		},
		[
			dragState,
			env.stepCount,
			getClosestStepAtPointer,
			getRateForPointerX,
			getRelativePointerPosition,
			updateStepValues,
		],
	);

	const handleCanvasPointerUp = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (dragState?.pointerId !== e.pointerId) return;
			setDragState(null);
		},
		[dragState],
	);

	const handleCanvasPointerLeave = useCallback(() => {
		if (!dragState) setHoverStep(null);
	}, [dragState]);

	return (
		<Card
			variant="subtle"
			className="space-y-3 bg-base-200/70 shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
		>
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-base-content/70">
					{title}
				</span>
				<div className="flex items-center gap-2">
					<label className="text-xs flex items-center gap-1">
						<input
							type="checkbox"
							checked={env.loop}
							onChange={(e) => onChange({ ...env, loop: e.target.checked })}
							className="checkbox checkbox-xs"
						/>
						Loop
					</label>
					<label className="text-xs flex items-center gap-1">
						<span>Sus</span>
						<select
							className="select select-bordered select-xs w-12"
							value={env.sustainStep}
							onChange={(e) =>
								onChange({
									...env,
									sustainStep: Number(e.target.value),
								})
							}
						>
							{env.steps.map((_, i) => (
								<option key={STEP_KEYS[i]} value={i}>
									{i + 1}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

			<canvas
				ref={canvasRef}
				width={1000}
				height={200}
				className="max-w-full rounded-xl cursor-crosshair border border-base-300/60 bg-base-300/30 touch-none"
				style={{ imageRendering: "auto" }}
				onPointerDown={handleCanvasPointerDown}
				onPointerMove={handleCanvasPointerMove}
				onPointerUp={handleCanvasPointerUp}
				onPointerCancel={handleCanvasPointerUp}
				onPointerLeave={handleCanvasPointerLeave}
			/>

			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-8">
				{env.steps.slice(0, env.stepCount).map((step, i) => (
					<div
						key={STEP_KEYS[i]}
						className="rounded-xl border border-base-300/60 bg-base-300/20 px-1 py-2"
					>
						<div className="mb-1 text-center text-[9px] uppercase tracking-[0.2em] text-base-content/45">
							{i + 1}
						</div>
						<div className="flex flex-col items-center justify-center gap-2">
							<ControlKnob
								value={step.level}
								onChange={(v) => updateStep(i, "level", v)}
								label="Lvl"
								valueFormatter={(v) => `${Math.round(v * 99)}`}
								color={color}
								size={30}
							/>
							<ControlKnob
								value={step.rate}
								onChange={(v) => updateStep(i, "rate", v)}
								min={0}
								max={99}
								label="Rate"
								valueFormatter={(v) => `${Math.round(v)}`}
								color="#a3a3a3"
								size={30}
							/>
						</div>
					</div>
				))}
			</div>

			<div className="flex items-center gap-2">
				<label className="text-xs flex items-center gap-1">
					<span>Steps</span>
					<select
						className="select select-bordered select-xs w-12"
						value={env.stepCount}
						onChange={(e) =>
							onChange({ ...env, stepCount: Number(e.target.value) })
						}
					>
						{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
							<option key={n} value={n}>
								{n}
							</option>
						))}
					</select>
				</label>
				<span className="text-xs text-base-content/50 ml-auto">
					Release: L
					{Math.round((env.steps[env.stepCount - 1]?.level ?? 0) * 99)} R
					{(env.steps[env.stepCount - 1]?.rate ?? 0).toFixed(0)}
				</span>
			</div>
		</Card>
	);
});

export default StepEnvelopeEditor;
