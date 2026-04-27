import ControlKnob from "@/components/controls/ControlKnob";
import type { KnobVariant } from "@/components/controls/knob/KnobView";

export interface FxKnobConfig {
	label: string;
	tooltip?: string;
	value: number;
	setValue: (v: number) => void;
	min: number;
	max: number;
	size: number;
	/** Prefer variant over color for new configs. */
	variant?: KnobVariant;
	/** Legacy: raw CSS color override. Prefer variant. */
	color?: string;
	valueFormatter: (value: number) => string;
}

export interface BaseFxSectionProps {
	title: string;
	knobs: FxKnobConfig[];
}

export function BaseFxSection({ title, knobs }: BaseFxSectionProps) {
	return (
		<div className="space-y-2 bg-cz-surface border border-cz-border rounded-sm py-3">
			<div className="cz-light-blue">{title}</div>
			<div className="flex justify-center gap-2 md:gap-4">
				{knobs.map((knob) => (
					<ControlKnob
						key={knob.label}
						value={knob.value}
						onChange={knob.setValue}
						min={knob.min}
						max={knob.max}
						size={knob.size}
						variant={knob.variant}
						color={knob.color}
						label={knob.label}
						tooltip={knob.tooltip}
						valueFormatter={knob.valueFormatter}
					/>
				))}
			</div>
		</div>
	);
}
