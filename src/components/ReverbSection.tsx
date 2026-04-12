import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface ReverbSectionProps {
	size: number;
	setSize: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
}

export function ReverbSection({
	size,
	setSize,
	mix,
	setMix,
}: ReverbSectionProps) {
	const knobs: FxKnobConfig[] = [
		{
			label: "Size",
			value: size,
			setValue: setSize,
			min: 0,
			max: 1,
			size: 44,
			color: "#fdba74",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Mix",
			value: mix,
			setValue: setMix,
			min: 0,
			max: 1,
			size: 44,
			color: "#fda4af",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
	];
	return <BaseFxSection title="Reverb" knobs={knobs} />;
}
