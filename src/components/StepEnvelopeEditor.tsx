import { memo, useCallback, useEffect, useRef } from "react";
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

	let totalTime = 0;
	for (let i = 0; i < env.steps.length; i++) {
		totalTime += rateToSeconds(env.steps[i].rate);
	}
	if (totalTime <= 0) totalTime = 1;

	let x = 0;
	const points: Array<{ x: number; y: number }> = [];
	points.push({ x: 0, y: 1 - 0 });

	for (let i = 0; i < env.steps.length; i++) {
		const step = env.steps[i];
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

	if (env.sustainStep < env.steps.length) {
		const susIndex = env.sustainStep + 1;
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
		ctx.fillStyle = i - 1 === env.sustainStep ? "#fbbf24" : color;
		ctx.beginPath();
		ctx.arc(p.x, p.y * h, 3, 0, Math.PI * 2);
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
				width={240}
				height={60}
				className="w-full rounded"
				style={{ imageRendering: "auto" }}
			/>

			<div className="grid grid-cols-8 gap-1">
				{env.steps.map((step, i) => (
					<div
						key={STEP_KEYS[i]}
						className="flex flex-col items-center gap-0.5"
					>
						<div className="text-[9px] text-base-content/50">{i + 1}</div>
						<label className="w-full flex flex-col items-center">
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={step.level}
								onChange={(e) => updateStep(i, "level", Number(e.target.value))}
								className="range range-xs range-primary"
								style={{
									writingMode: "vertical-lr" as const,
									direction: "rtl" as const,
									height: "48px",
									width: "20px",
								}}
							/>
						</label>
						<span className="text-[9px] text-base-content/40">
							{Math.round(step.level * 99)}
						</span>
						<label className="w-full flex flex-col items-center">
							<input
								type="range"
								min={1}
								max={99}
								step={1}
								value={step.rate}
								onChange={(e) => updateStep(i, "rate", Number(e.target.value))}
								className="range range-xs range-secondary"
								style={{
									writingMode: "vertical-lr" as const,
									direction: "rtl" as const,
									height: "36px",
									width: "20px",
								}}
							/>
						</label>
						<span className="text-[9px] text-base-content/40">{step.rate}</span>
					</div>
				))}
			</div>

			<label className="text-xs flex items-center gap-1">
				<span>Release</span>
				<input
					type="range"
					min={1}
					max={99}
					step={1}
					value={env.releaseRate}
					onChange={(e) =>
						onChange({ ...env, releaseRate: Number(e.target.value) })
					}
					className="range range-xs range-warning flex-1"
				/>
				<span className="w-6 text-right">{env.releaseRate}</span>
			</label>
		</div>
	);
});

export default StepEnvelopeEditor;
