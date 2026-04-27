import { useCallback } from "react";
import ModulatableControl from "@/components/controls/modulation/ModulatableControl";
import {
	useHoverInfo,
	useHoverInfoHandlers,
} from "@/components/layout/HoverInfo";
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
	label?: string;
	tooltip?: string;
	valueFormatter?: (value: number) => string;
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
	label,
	tooltip,
	valueFormatter,
	modulatable,
	lineIndex = 1,
	modDestination,
}: CzHorizontalSliderProps) {
	const { setControlReadout } = useHoverInfo();
	const resolvedTooltip = tooltip?.trim() ? tooltip : label?.trim();
	const hoverHandlers = useHoverInfoHandlers(resolvedTooltip);
	const emitChange = useCallback(
		(nextValue: number) => {
			onChange(nextValue);
			setControlReadout({
				label: label ?? "Value",
				value: valueFormatter
					? valueFormatter(nextValue)
					: Number.isInteger(nextValue)
						? `${nextValue}`
						: nextValue.toFixed(2),
			});
		},
		[label, onChange, setControlReadout, valueFormatter],
	);

	const input = (
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			onChange={(e) => emitChange(Number(e.target.value))}
			className={`range range-xs w-full ${className}`.trim()}
			aria-label={label}
			data-hover-info={resolvedTooltip}
			{...hoverHandlers}
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
