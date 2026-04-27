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
			tooltip: "Sets chorus modulation speed.",
			value: rate,
			setValue: setRate,
			min: 0.1,
			max: 5,
			size: 44,
			color: "#7f9de4",
			valueFormatter: (value) => value.toFixed(1),
		},
		{
			label: "Depth",
			tooltip: "Sets how wide the chorus pitch modulation swings.",
			value: depth,
			setValue: setDepth,
			min: 0,
			max: 3,
			size: 44,
			color: "#7f9de4",
			valueFormatter: (value) => `${Math.round((value / 3) * 100)}%`,
		},
		{
			label: "Mix",
			tooltip: "Blends dry signal with the chorus effect.",
			value: mix,
			setValue: setMix,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
	];
	return <BaseFxSection title="Chorus" knobs={knobs} />;
}
