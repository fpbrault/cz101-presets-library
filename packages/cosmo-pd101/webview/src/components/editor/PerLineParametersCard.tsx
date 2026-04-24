import { memo } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import Card from "@/components/primitives/Card";

interface PerLineParametersCardProps {
	color: string;
	warpAmount: number;
	setWarpAmount: (value: number) => void;
	dcwComp: number;
	setDcwComp: (value: number) => void;
	level: number;
	setLevel: (value: number) => void;
	octave: number;
	setOctave: (value: number) => void;
	fineDetune: number;
	setFineDetune: (value: number) => void;
	dcoDepth: number;
	setDcoDepth: (value: number) => void;
	lineIndex: 1 | 2;
}

function PerLineParametersCardInner({
	color,
	warpAmount,
	setWarpAmount,
	dcwComp,
	setDcwComp,
	level,
	setLevel,
	octave,
	setOctave,
	fineDetune,
	setFineDetune,
	dcoDepth,
	setDcoDepth,
	lineIndex,
}: PerLineParametersCardProps) {
	const controls = [
		{
			label: "DCW Amt",
			value: warpAmount,
			min: 0,
			max: 1,
			defaultValue: 1,
			step: 0.01,
			color,
			fmt: (value: number) => value.toFixed(2),
			onChange: setWarpAmount,
			modDest: "dcwBase",
		},
		{
			label: "DCW Comp",
			value: dcwComp,
			min: 0,
			max: 1,
			defaultValue: 0,
			step: 0.01,
			color: "#7f9de4",
			fmt: (value: number) => `${Math.round(value * 100)}%`,
			onChange: setDcwComp,
			modDest: "dcwComp",
		},
		{
			label: "Level",
			value: level,
			min: 0,
			max: 1,
			defaultValue: 1,
			step: 0.01,
			color: "#9cb937",
			fmt: (value: number) => `${Math.round(value * 100)}%`,
			onChange: setLevel,
			modDest: "dcaBase",
		},
		{
			label: "Oct",
			value: octave,
			min: -2,
			max: 2,
			defaultValue: 0,
			step: 1,
			color: "#7f9de4",
			fmt: (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value)}`,
			onChange: (value: number) => setOctave(Math.round(value)),
			modDest: "octave",
		},
		{
			label: "Fine",
			value: fineDetune,
			min: -50,
			max: 50,
			defaultValue: 0,
			step: 1,
			color: "#9cb937",
			fmt: (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value)}`,
			onChange: (value: number) => setFineDetune(Math.round(value)),
			modDest: "detune",
		},
		{
			label: "DCO Rng",
			value: dcoDepth,
			min: 0,
			max: 24,
			defaultValue: 24,
			step: 1,
			color: "#9cb937",
			fmt: (value: number) => `${Math.round(value)} st`,
			onChange: (value: number) => setDcoDepth(Math.round(value)),
			modDest: "dcoDepth",
		},
	] as const;

	return (
		<Card variant="subtle" className="p-3 md:col-span-1 min-h-0 flex flex-col">
			<div className="mb-3 text-3xs uppercase tracking-[0.24em] text-cz-cream">
				Parameters
			</div>
			<div className="flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-3 place-items-center content-start">
				{controls.map(
					({
						label,
						value,
						min,
						max,
						defaultValue,
						step,
						color,
						fmt,
						onChange,
						modDest,
					}) => (
						<ControlKnob
							key={label}
							label={label}
							value={value}
							min={min}
							max={max}
							step={step}
							size={52}
							defaultValue={defaultValue}
							bipolar={min < 0 && max > 0}
							color={color}
							modulatable={modDest}
							lineIndex={lineIndex}
							onChange={onChange}
							valueFormatter={fmt}
						/>
					),
				)}
			</div>
		</Card>
	);
}

const PerLineParametersCard = memo(PerLineParametersCardInner);

export default PerLineParametersCard;
