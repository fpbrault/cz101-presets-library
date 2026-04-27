import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface ReverbSectionProps {
	space: number;
	setSpace: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
	predelay: number;
	setPredelay: (v: number) => void;
	distance: number;
	setDistance: (v: number) => void;
	character: number;
	setCharacter: (v: number) => void;
}

export function ReverbSection({
	space,
	setSpace,
	mix,
	setMix,
	predelay,
	setPredelay,
	distance,
	setDistance,
	character,
	setCharacter,
}: ReverbSectionProps) {
	const knobs: FxKnobConfig[] = [
		{
			label: "Space",
			tooltip: "Sets the virtual room size of the reverb.",
			value: space,
			setValue: setSpace,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Pre-Dly",
			tooltip: "Adds a short delay before reverb reflections begin.",
			value: predelay,
			setValue: setPredelay,
			min: 0,
			max: 0.1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 1000)}ms`,
		},
		{
			label: "Char",
			tooltip: "Shapes reverb tone between darker and brighter tails.",
			value: character,
			setValue: setCharacter,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Dist",
			tooltip: "Moves the source closer or farther inside the virtual space.",
			value: distance,
			setValue: setDistance,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Mix",
			tooltip: "Blends dry signal with reverb output.",
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
