import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface ReverbSectionProps {
	size: number;
	setSize: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
	damping: number;
	setDamping: (v: number) => void;
	preDelay: number;
	setPreDelay: (v: number) => void;
}

export function ReverbSection({
	size,
	setSize,
	mix,
	setMix,
	damping,
	setDamping,
	preDelay,
	setPreDelay,
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
			label: "Damping",
			value: damping,
			setValue: setDamping,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Pre-Dly",
			value: preDelay,
			setValue: setPreDelay,
			min: 0,
			max: 0.1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 1000)}ms`,
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
