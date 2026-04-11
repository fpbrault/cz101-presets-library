import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { StepEnvData } from "./pdAlgorithms";
import { rateToSeconds } from "./pdAlgorithms";

const STEP_KEYS = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;

interface StepEnvelopeEditorProps {
	title: string;
	env: StepEnvData;
	onChange: (env: StepEnvData) => void;
	color?: string;
}

function drawEnvPreview(
	canvas: HTMLCanvasElement,
	env: StepEnvData,
	color: string,
) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const w = canvas.width;
	const h = canvas.height;
	ctx.clearRect(0, 0, w, h);

	ctx.fillStyle = "rgba(0,0,0,0.3)";
	ctx.fillRect(0, 0, w, h);

	ctx.strokeStyle = "rgba(100,100,100,0.3)";
	ctx.lineWidth = 1;
	for (let y = 0.25; y < 1; y += 0.25) {
		ctx.beginPath();
		ctx.moveTo(0, h * (1 - y));
		ctx.lineTo(w, h * (1 - y));
		ctx.stroke();
	}

	const activeSteps = env.steps.slice(0, env.stepCount);
	let totalTime = 0;
	for (const step of activeSteps) {
		totalTime += rateToSeconds(step.rate);
	}
	if (totalTime <= 0) totalTime = 1;

	let x = 0;
	const points: Array<{ x: number; y: number }> = [];
	points.push({ x: 0, y: 1 - 0 });

	for (const step of activeSteps) {
		const duration = rateToSeconds(step.rate);
		const dx = (duration / totalTime) * w;
		points.push({ x: x + dx, y: 1 - step.level });
		x += dx;
	}

	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y * h);
	for (let i = 1; i < points.length; i++) {
		ctx.lineTo(points[i].x, points[i].y * h);
	}
	ctx.stroke();

	const susStep = Math.min(env.sustainStep, env.stepCount - 1);
	if (susStep < activeSteps.length) {
		const susIndex = susStep + 1;
		if (susIndex < points.length) {
			const sp = points[susIndex];
			ctx.strokeStyle = "rgba(255,200,0,0.6)";
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(sp.x, 0);
			ctx.lineTo(sp.x, h);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	for (let i = 1; i < points.length; i++) {
		const p = points[i];
		ctx.fillStyle = i - 1 === susStep ? "#fbbf24" : color;
		ctx.beginPath();
		ctx.arc(p.x, p.y * h, 3, 0, Math.PI * 2);
		ctx.fill();
	}
}

function RotaryKnob({
	value,
	onChange,
	min = 0,
	max = 1,
	label,
	color,
	size = 32,
}: {
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
	label?: string;
	color?: string;
	size?: number;
}) {
	const knobRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState(false);
	const startYRef = useRef(0);
	const startValueRef = useRef(0);

	const normalizedValue = (value - min) / (max - min);
	const angle = -135 + normalizedValue * 270;

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		setDragging(true);
		startYRef.current = e.clientY;
		startValueRef.current = value;
	};

	useEffect(() => {
		if (!dragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			const deltaY = startYRef.current - e.clientY;
			const range = max - min;
			const sensitivity = 200;
			const newValue = startValueRef.current + (deltaY / sensitivity) * range;
			onChange(Math.max(min, Math.min(max, newValue)));
		};

		const handleMouseUp = () => {
			setDragging(false);
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [dragging, min, max, onChange]);

	return (
		<div className="flex flex-col items-center gap-0.5">
			<div
				ref={knobRef}
				role="slider"
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={value}
				aria-label={label ?? "knob"}
				tabIndex={0}
				className="cursor-ns-resize"
				onMouseDown={handleMouseDown}
				style={{ width: size, height: size }}
			>
				<svg width={size} height={size} viewBox="0 0 40 40" role="presentation">
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="text-base-content/20"
					/>
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						stroke={color ?? "currentColor"}
						strokeWidth="3"
						strokeDasharray={`${normalizedValue * 100.53} 100.53`}
						transform="rotate(-135 20 20)"
						style={{ transition: dragging ? "none" : "stroke-dasharray 0.15s" }}
					/>
					<line
						x1="20"
						y1="20"
						x2={20 + Math.cos((angle * Math.PI) / 180) * 12}
						y2={20 + Math.sin((angle * Math.PI) / 180) * 12}
						stroke={color ?? "currentColor"}
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</div>
			{label && (
				<span className="text-[9px] text-base-content/50">{label}</span>
			)}
		</div>
	);
}

export const StepEnvelopeEditor = memo(function StepEnvelopeEditor({
	title,
	env,
	onChange,
	color = "#60a5fa",
}: StepEnvelopeEditorProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [dragStep, setDragStep] = useState<number | null>(null);

	useEffect(() => {
		if (canvasRef.current) {
			drawEnvPreview(canvasRef.current, env, color);
		}
	}, [env, color]);

	const updateStep = useCallback(
		(index: number, field: "level" | "rate", value: number) => {
			const newSteps = env.steps.map((s, i) =>
				i === index ? { ...s, [field]: value } : s,
			);
			onChange({ ...env, steps: newSteps });
		},
		[env, onChange],
	);

	const handleCanvasMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = (e.clientX - rect.left) / rect.width;
			const y = 1 - (e.clientY - rect.top) / rect.height;

			let totalTime = 0;
			for (let i = 0; i < env.steps.length; i++) {
				totalTime += rateToSeconds(env.steps[i].rate);
			}
			if (totalTime <= 0) totalTime = 1;

			let currentX = 0;
			for (let i = 0; i < env.steps.length; i++) {
				const duration = rateToSeconds(env.steps[i].rate);
				const dx = duration / totalTime;
				const stepX = currentX + dx / 2;

				if (Math.abs(x - stepX) < dx / 2) {
					setDragStep(i);
					updateStep(i, "level", Math.max(0, Math.min(1, y)));
					break;
				}
				currentX += dx;
			}
		},
		[env, updateStep],
	);

	useEffect(() => {
		if (dragStep === null) return;

		const handleMouseMove = (e: MouseEvent) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const y = 1 - (e.clientY - rect.top) / rect.height;
			updateStep(dragStep, "level", Math.max(0, Math.min(1, y)));
		};

		const handleMouseUp = () => {
			setDragStep(null);
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [dragStep, updateStep]);

	return (
		<div className="p-2 rounded-lg bg-base-200 border border-base-300 space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold text-base-content/70">
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
				width={500}
				height={100}
				className="w-full rounded cursor-crosshair"
				style={{ imageRendering: "auto" }}
				onMouseDown={handleCanvasMouseDown}
			/>

			<div className="grid grid-cols-8 gap-1">
				{env.steps.slice(0, env.stepCount).map((step, i) => (
					<div
						key={STEP_KEYS[i]}
						className="flex flex-col items-center gap-0.5"
					>
						<span className="text-[9px] text-base-content/50">{i + 1}</span>
						<RotaryKnob
							value={step.level}
							onChange={(v) => updateStep(i, "level", v)}
							color={color}
							size={28}
						/>
						<span className="text-[9px] text-base-content/40">
							{Math.round(step.level * 99)}
						</span>
						<RotaryKnob
							value={step.rate}
							onChange={(v) => updateStep(i, "rate", v)}
							min={1}
							max={99}
							color="#a3a3a3"
							size={24}
						/>
						<span className="text-[9px] text-base-content/40">
							{step.rate.toFixed(0)}
						</span>
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
		</div>
	);
});

export default StepEnvelopeEditor;
