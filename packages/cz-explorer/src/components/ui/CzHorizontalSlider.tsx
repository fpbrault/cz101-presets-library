interface CzHorizontalSliderProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (v: number) => void;
	disabled?: boolean;
	className?: string;
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
}: CzHorizontalSliderProps) {
	return (
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
}
