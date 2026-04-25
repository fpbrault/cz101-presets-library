import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface ReverbSectionProps {
	space: number;
	setSpace: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
	predelay: number;
	setPredelay: (v: number) => void;
	brightness: number;
	setBrightness: (v: number) => void;
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
	brightness,
	setBrightness,
	distance,
	setDistance,
	character,
	setCharacter,
}: ReverbSectionProps) {
	const knobs: FxKnobConfig[] = [
		{
			label: "Space",
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
			value: predelay,
			setValue: setPredelay,
			min: 0,
			max: 0.1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 1000)}ms`,
		},
		{
			label: "Bright",
			value: brightness,
			setValue: setBrightness,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Dist",
			value: distance,
			setValue: setDistance,
			min: 0,
			max: 1,
			size: 44,
			color: "#9cb937",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Char",
			value: character,
			setValue: setCharacter,
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
