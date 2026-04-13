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
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Mix",
			value: mix,
			setValue: setMix,
			min: 0,
			max: 1,
			size: 44,
			color: "#3dff3d",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
	];
	return <BaseFxSection title="Reverb" knobs={knobs} />;
}
