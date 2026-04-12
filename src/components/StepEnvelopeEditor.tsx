import { memo, useCallback, useEffect, useRef, useState } from "react";
import ControlKnob from "./ControlKnob";
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
	const paddingY = 8;
	const paddingX = 12;
	const drawWidth = w - paddingX * 2;
	const drawHeight = h - paddingY * 2;
	ctx.clearRect(0, 0, w, h);

	ctx.fillStyle = "rgba(0,0,0,0.3)";
	ctx.fillRect(0, 0, w, h);

	ctx.strokeStyle = "rgba(100,100,100,0.3)";
	ctx.lineWidth = 1;
	for (let y = 0.25; y < 1; y += 0.25) {
		ctx.beginPath();
		ctx.moveTo(paddingX, h * (1 - y));
		ctx.lineTo(w - paddingX, h * (1 - y));
		ctx.stroke();
	}

	const activeSteps = env.steps.slice(0, env.stepCount);
	let totalTime = 0;
	for (const step of activeSteps) {
		totalTime += rateToSeconds(step.rate);
	}
	if (totalTime <= 0) totalTime = 1;

	let x = paddingX;
	const points: Array<{ x: number; y: number }> = [];
	points.push({ x: paddingX, y: 1 - 0 });

	for (const step of activeSteps) {
		const duration = rateToSeconds(step.rate);
		const dx = (duration / totalTime) * drawWidth;
		points.push({ x: x + dx, y: 1 - step.level });
		x += dx;
	}

	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y * drawHeight + paddingY);
	for (let i = 1; i < points.length; i++) {
		ctx.lineTo(points[i].x, points[i].y * drawHeight + paddingY);
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
			ctx.moveTo(sp.x, paddingY);
			ctx.lineTo(sp.x, h - paddingY);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	for (let i = 1; i < points.length; i++) {
		const p = points[i];
		ctx.fillStyle = i - 1 === susStep ? "#fbbf24" : color;
		ctx.beginPath();
		ctx.arc(p.x, p.y * drawHeight + paddingY, 8, 0, Math.PI * 2);
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
		<div className="max-w-120 rounded-2xl border border-base-300/70 bg-base-200/70 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.2)] space-y-3">
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
				className="max-w-full rounded-xl cursor-crosshair border border-base-300/60 bg-base-300/30"
				style={{ imageRendering: "auto" }}
				onMouseDown={handleCanvasMouseDown}
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
								min={1}
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
		</div>
	);
});

export default StepEnvelopeEditor;
