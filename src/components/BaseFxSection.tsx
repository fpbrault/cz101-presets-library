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

export interface BaseFxSectionProps {
	title: string;
	knobs: FxKnobConfig[];
}

export function BaseFxSection({ title, knobs }: BaseFxSectionProps) {
	return (
		<div className="space-y-2 bg-cz-surface border border-cz-border rounded-sm py-3">
			<div className="cz-section-bar">{title}</div>
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
