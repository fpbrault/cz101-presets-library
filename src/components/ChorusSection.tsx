import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface ChorusSectionProps {
	rate: number;
	setRate: (v: number) => void;
	depth: number;
	setDepth: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
}

export function ChorusSection({
	rate,
	setRate,
	depth,
	setDepth,
	mix,
	setMix,
}: ChorusSectionProps) {
	const knobs: FxKnobConfig[] = [
		{
			label: "Rate",
			value: rate,
			setValue: setRate,
			min: 0.1,
			max: 5,
			size: 44,
			color: "#60a5fa",
			valueFormatter: (value) => value.toFixed(1),
		},
		{
			label: "Depth",
			value: depth,
			setValue: setDepth,
			min: 0,
			max: 3,
			size: 44,
			color: "#38bdf8",
			valueFormatter: (value) => `${Math.round(value)}`,
		},
		{
			label: "Mix",
			value: mix,
			setValue: setMix,
			min: 0,
			max: 1,
			size: 44,
			color: "#f472b6",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
	];
	return <BaseFxSection title="Chorus" knobs={knobs} />;
}
