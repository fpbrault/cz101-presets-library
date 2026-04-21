import ModulatableControl from "@/components/ui/ModulatableControl";
import type { ModDestination } from "@/lib/synth/bindings/synth";
import {
	type ModTarget,
	resolveModDestination,
} from "@/lib/synth/modDestination";

interface CzHorizontalSliderProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (v: number) => void;
	disabled?: boolean;
	className?: string;
	/** Simple modulation opt-in with auto destination resolution. */
	modulatable?: ModTarget;
	/** Line context for line-scoped targets (defaults to line 1). */
	lineIndex?: 1 | 2;
	/** When provided, wraps the slider in a ModulatableControl for this destination. */
	modDestination?: ModDestination;
}

/**
 * A horizontal range slider using the DaisyUI `range` class,
 * styled to match the CZ-101 explorer theme. Used for algo control
 * numeric parameters.
 */
export default function CzHorizontalSlider({
	value,
	min,
	max,
	step = 0.01,
	onChange,
	disabled = false,
	className = "",
	modulatable,
	lineIndex = 1,
	modDestination,
}: CzHorizontalSliderProps) {
	const input = (
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			onChange={(e) => onChange(Number(e.target.value))}
			className={`range range-xs w-full ${className}`.trim()}
			disabled={disabled}
		/>
	);

	const resolvedDestination =
		modDestination ?? resolveModDestination(modulatable, { lineIndex });

	if (resolvedDestination) {
		return (
			<ModulatableControl destinationId={resolvedDestination}>
				{input}
			</ModulatableControl>
		);
	}

	return input;
}
