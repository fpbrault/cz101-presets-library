/** biome-ignore-all lint/suspicious/noArrayIndexKey: array keys used in stable maps */
import type React from "react";
import { memo } from "react";
import type { EnvelopeStep } from "@/lib/midi/czSysexDecoder";

interface EnvelopeChartProps {
	steps: EnvelopeStep[];
	endStep: number;
	label: string;
	color?: string; // Tailwind/CSS colour token for the line
}

const W = 220;
const H = 80;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 6;
const PAD_B = 18;

const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;
const STEP_CELL_W = INNER_W / 8;

/** Map a 0–99 level value to a Y coordinate (top = high level) */
const ly = (level: number) => PAD_T + INNER_H - (level / 99) * INNER_H;

/** Map a normalized value (0..1) to an X coordinate inside the chart area */
const nx = (v: number) => PAD_L + v * INNER_W;

/** Map step number (1..8) to a fixed X grid column */
const stepColumnX = (stepNum: number) => nx(stepNum / 8);

const clamp99 = (value: number) => Math.max(0, Math.min(99, value));

const EnvelopeChart: React.FC<EnvelopeChartProps> = memo(
	({ steps, endStep, label, color = "#a78bfa" }) => {
		const activeSteps = steps.slice(0, endStep);
		const count = activeSteps.length;

		if (count === 0) return null;

		const xPositions: number[] = [];
		for (let i = 0; i < count; i++) {
			xPositions.push(stepColumnX(i + 1));
		}

		// Build SVG path with rate-aware timing INSIDE each step cell:
		// - R99: near-instant transition at the start of the cell
		// - R0:  transition spans almost the full cell
		const points: [number, number][] = [];

		let currentY = ly(0);
		points.push([PAD_L, currentY]);

		activeSteps.forEach((step, i) => {
			const stepStartX = i === 0 ? PAD_L : stepColumnX(i);
			const stepEndX = stepColumnX(i + 1);
			const targetY = ly(step.level);

			const rate = clamp99(step.rate);
			const durationRatio = Math.max(0.02, (99 - rate) / 99);
			const transitionX = Math.min(
				stepEndX,
				stepStartX + STEP_CELL_W * durationRatio,
			);

			// If a cell starts later than the previous point, hold the current level.
			const lastPoint = points[points.length - 1];
			if (lastPoint[0] < stepStartX) {
				points.push([stepStartX, currentY]);
			}

			// Transition to the step target level according to rate timing.
			points.push([transitionX, targetY]);

			// Hold the target level until the end of the step cell.
			if (transitionX < stepEndX) {
				points.push([stepEndX, targetY]);
			}

			currentY = targetY;
		});

		const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");
		const areaPath =
			`M ${PAD_L},${PAD_T + INNER_H} ` +
			points.map(([x, y]) => `L ${x},${y}`).join(" ") +
			` L ${points[points.length - 1][0]},${PAD_T + INNER_H} Z`;

		return (
			<div className="flex flex-col gap-0.5 min-w-0">
				<span className="text-xs text-base-content/50 font-mono tracking-wider">
					{label}
				</span>
				<svg
					width="100%"
					height={H}
					viewBox={`0 0 ${W} ${H}`}
					preserveAspectRatio="none"
					className="rounded overflow-hidden"
					style={{ background: "rgba(0,0,0,0.25)" }}
					aria-label={label}
				>
					<title>{label}</title>
					{/* Grid lines */}
					{[0, 33, 66, 99].map((level) => (
						<line
							key={level}
							x1={PAD_L}
							y1={ly(level)}
							x2={W - PAD_R}
							y2={ly(level)}
							stroke="rgba(255,255,255,0.06)"
							strokeWidth={1}
						/>
					))}

					{/* Vertical step markers for the full 1..8 grid */}
					{Array.from({ length: 8 }).map((_, i) => (
						<line
							key={i}
							x1={stepColumnX(i + 1)}
							y1={PAD_T}
							x2={stepColumnX(i + 1)}
							y2={PAD_T + INNER_H}
							stroke="rgba(255,255,255,0.05)"
							strokeWidth={1}
						/>
					))}

					{/* Area fill */}
					<path d={areaPath} fill={color} fillOpacity={0.12} />

					{/* Envelope line */}
					<polyline
						points={polyline}
						fill="none"
						stroke={color}
						strokeWidth={1.5}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>

					{/* Sustain dots for DCW */}
					{activeSteps.map((step, i) =>
						step.sustain ? (
							<circle
								key={i}
								cx={xPositions[i]}
								cy={ly(step.level)}
								r={3}
								fill={color}
								stroke="rgba(0,0,0,0.5)"
								strokeWidth={1}
							/>
						) : null,
					)}

					{/* Step dots */}
					{activeSteps.map((step, i) => (
						<circle
							key={`dot-${i}`}
							cx={xPositions[i]}
							cy={ly(step.level)}
							r={2}
							fill={color}
							opacity={0.8}
						/>
					))}

					{/* Step number labels */}
					{activeSteps.map((_, i) => (
						<text
							key={`lbl-${i}`}
							x={xPositions[i]}
							y={H - 4}
							textAnchor="middle"
							fontSize={8}
							fill="rgba(255,255,255,0.3)"
							fontFamily="monospace"
						>
							{i + 1}
						</text>
					))}
				</svg>

				{/* Per-step readout: makes rate and level explicit like a classic CZ panel. */}
				<div className="grid grid-cols-8 gap-1 mt-1">
					{Array.from({ length: 8 }).map((_, i) => {
						const step = activeSteps[i];
						const inactive = !step;
						return (
							<div
								key={`meta-${i}`}
								className={`rounded px-1 py-0.5 text-center border ${
									inactive
										? "border-base-content/5 text-base-content/20"
										: "border-base-content/10 text-base-content/60"
								}`}
							>
								<div className="text-[8px] leading-tight font-mono">
									{i + 1}
								</div>
								<div className="text-[8px] leading-tight font-mono">
									{inactive ? "--" : `R${step.rate}`}
								</div>
								<div className="text-[8px] leading-tight font-mono">
									{inactive ? "--" : `L${step.level}`}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	},
);

EnvelopeChart.displayName = "EnvelopeChart";

export default EnvelopeChart;
