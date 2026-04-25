import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface PhaserSectionProps {
	rate: number;
	setRate: (v: number) => void;
	depth: number;
	setDepth: (v: number) => void;
	feedback: number;
	setFeedback: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
}

export function PhaserSection({
	rate,
	setRate,
	depth,
	setDepth,
	feedback,
	setFeedback,
	mix,
	setMix,
}: PhaserSectionProps) {
	const knobs: FxKnobConfig[] = [
		{
			label: "Rate",
			value: rate,
			setValue: setRate,
			min: 0.1,
			max: 10,
			size: 44,
			color: "#a78bfa",
			valueFormatter: (value) => `${value.toFixed(1)}Hz`,
		},
		{
			label: "Depth",
			value: depth,
			setValue: setDepth,
			min: 0,
			max: 1,
			size: 44,
			color: "#a78bfa",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Fdbk",
			value: feedback,
			setValue: setFeedback,
			min: -0.9,
			max: 0.9,
			size: 42,
			color: "#a78bfa",
			valueFormatter: (value) =>
				value >= 0
					? `+${Math.round(value * 100)}%`
					: `${Math.round(value * 100)}%`,
		},
		{
			label: "Mix",
			value: mix,
			setValue: setMix,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
	];
	return <BaseFxSection title="Phaser" knobs={knobs} />;
}
