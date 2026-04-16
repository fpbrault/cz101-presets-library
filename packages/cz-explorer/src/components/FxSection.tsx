import ControlKnob from "./ControlKnob";

export interface FxKnobConfig {
	label: string;
	value: number;
	setValue: (v: number) => void;
	min: number;
	max: number;
	size: number;
	color: string;
	valueFormatter: (value: number) => string;
}

export interface FxSectionProps {
	title: string;
	knobs: FxKnobConfig[];
}

export function FxSection({ title, knobs }: FxSectionProps) {
	return (
		<div className="space-y-2 bg-base-300 py-4 rounded-xl">
			<div className="text-sm text-base-content/70 text-center font-bold uppercase ">
				{title}
			</div>
			<div className="flex justify-center gap-2 md:gap-4">
				{knobs.map((knob) => (
					<ControlKnob
						key={knob.label}
						value={knob.value}
						onChange={knob.setValue}
						min={knob.min}
						max={knob.max}
						size={knob.size}
						color={knob.color}
						label={knob.label}
						valueFormatter={knob.valueFormatter}
					/>
				))}
			</div>
		</div>
	);
}
