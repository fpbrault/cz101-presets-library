import { useMemo } from "react";
import ControlKnob from "@/components/ControlKnob";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import CzButton from "@/components/ui/CzButton";

type LfoWaveform = "sine" | "triangle" | "square" | "saw";
type LfoTarget = "pitch" | "dcw" | "dca" | "filter";

type LfoPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	lfoEnabled: boolean;
	setLfoEnabled: (v: boolean) => void;
	lfoWaveform: LfoWaveform;
	setLfoWaveform: (v: LfoWaveform) => void;
	lfoRate: number;
	setLfoRate: (v: number) => void;
	lfoDepth: number;
	setLfoDepth: (v: number) => void;
	lfoOffset: number;
	setLfoOffset: (v: number) => void;
	lfoTarget: LfoTarget;
	setLfoTarget: (v: LfoTarget) => void;
};

export default function LfoPanel({
	accordionName,
	defaultOpen,
	lfoEnabled,
	setLfoEnabled,
	lfoWaveform,
	setLfoWaveform,
	lfoRate,
	setLfoRate,
	lfoDepth,
	setLfoDepth,
	lfoOffset,
	setLfoOffset,
	lfoTarget,
	setLfoTarget,
}: LfoPanelProps) {
	const lfoDisplayPath = useMemo(() => {
		const width = 220;
		const height = 92;
		const amplitude = 14 + lfoDepth * 24;
		const cycles = 1 + lfoRate / 10;
		const points: string[] = [];

		for (let i = 0; i <= 48; i++) {
			const t = i / 48;
			const phase = (t * cycles) % 1;
			let value = 0;

			if (lfoWaveform === "sine") value = Math.sin(t * cycles * Math.PI * 2);
			else if (lfoWaveform === "triangle")
				value = 1 - 4 * Math.abs(phase - 0.5);
			else if (lfoWaveform === "square") value = phase < 0.5 ? 1 : -1;
			else value = 1 - phase * 2;

			const x = t * width;
			const y = height / 2 - value * amplitude;
			points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
		}

		return points.join(" ");
	}, [lfoDepth, lfoRate, lfoWaveform]);

	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-gold"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="LFO"
		>
			<div className="mb-2 flex items-center justify-center gap-2">
				<span className="text-3xs font-mono text-cz-cream-dim uppercase tracking-wider">
					Enable
				</span>
				<button
					type="button"
					className={`cz-btn-arrow ${lfoEnabled ? "bg-cz-gold" : ""}`}
					onClick={() => setLfoEnabled(!lfoEnabled)}
				>
					<span
						className={`text-5xs font-mono font-bold uppercase tracking-wider ${
							lfoEnabled ? "text-white" : "text-cz-cream-dim"
						}`}
					>
						{lfoEnabled ? "On" : "Off"}
					</span>
				</button>
			</div>
			<div className="mb-3 overflow-hidden rounded-xl border border-cz-border bg-cz-inset p-3">
				<div className="mb-2 cz-light-blue justify-between">
					<span>LFO Visual</span>
					<span>{lfoTarget}</span>
				</div>
				<svg
					viewBox="0 0 220 92"
					className="h-24 w-full rounded-lg border border-cz-border bg-cz-panel"
				>
					<title>LFO waveform display</title>
					{[0.2, 0.4, 0.6, 0.8].map((stop) => (
						<line
							key={stop}
							x1={220 * stop}
							y1="0"
							x2={220 * stop}
							y2="92"
							stroke="rgba(232,119,34,0.08)"
						/>
					))}
					<line
						x1="0"
						y1="46"
						x2="220"
						y2="46"
						stroke="rgba(122,112,96,0.28)"
					/>
					<polyline
						fill="none"
						stroke="#e87722"
						strokeWidth="3"
						strokeLinejoin="round"
						strokeLinecap="round"
						points={lfoDisplayPath}
					/>
				</svg>
			</div>
			<div className="flex flex-wrap gap-1 mb-2">
				{(["sine", "triangle", "square", "saw"] as const).map((w) => (
					<CzButton
						key={w}
						active={lfoWaveform === w}
						onClick={() => setLfoWaveform(w)}
					>
						{w}
					</CzButton>
				))}
			</div>
			<div className="flex justify-center gap-2">
				<ControlKnob
					value={lfoRate}
					onChange={setLfoRate}
					min={0}
					max={20}
					size={44}
					color="#7f9de4"
					label="Rate"
					valueFormatter={(v) => `${v.toFixed(1)}Hz`}
				/>
				<ControlKnob
					value={lfoDepth}
					onChange={setLfoDepth}
					min={0}
					max={1}
					size={44}
					color="#7f9de4"
					label="Depth"
					valueFormatter={(v) => `${Math.round(v * 100)}%`}
				/>
				<ControlKnob
					value={lfoOffset}
					onChange={setLfoOffset}
					min={-1}
					max={1}
					size={44}
					color="#7f9de4"
					label="Offset"
					valueFormatter={(v) => `${Math.round(v * 100)}%`}
				/>
				<ControlKnob
					value={lfoOffset}
					onChange={setLfoOffset}
					min={-1}
					max={1}
					size={44}
					color="#7f9de4"
					label="Offset"
					valueFormatter={(v) => `${Math.round(v * 100)}%`}
				/>
			</div>
			<div className="mt-2">
				<div className="mb-2 cz-light-blue">Target</div>
				<div className="flex flex-wrap gap-1">
					{(["pitch", "dcw", "dca", "filter"] as const).map((t) => (
						<CzButton
							key={t}
							active={lfoTarget === t}
							onClick={() => setLfoTarget(t)}
						>
							{t}
						</CzButton>
					))}
				</div>
			</div>
		</CollapsibleCard>
	);
}
