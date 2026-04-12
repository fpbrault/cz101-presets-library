import { useEffect, useRef, useState } from "react";

interface ControlKnobProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	label?: string;
	color?: string;
	size?: number;
	valueFormatter?: (value: number) => string;
}

export function ControlKnob({
	value,
	onChange,
	min = 0,
	max = 1,
	label,
	color = "#f6f06d",
	size = 48,
	valueFormatter,
}: ControlKnobProps) {
	const [dragging, setDragging] = useState(false);
	const startYRef = useRef(0);
	const startValueRef = useRef(0);

	const normalizedValue = (value - min) / (max - min);
	const angle = -140 + normalizedValue * 280;

	useEffect(() => {
		if (!dragging) return;

		const handleMouseMove = (event: MouseEvent) => {
			const deltaY = startYRef.current - event.clientY;
			const range = max - min;
			const sensitivity = Math.max(160, size * 4);
			const nextValue = startValueRef.current + (deltaY / sensitivity) * range;
			onChange(Math.max(min, Math.min(max, nextValue)));
		};

		const handleMouseUp = () => {
			setDragging(false);
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [dragging, max, min, onChange, size]);

	return (
		<div className="flex flex-col items-center gap-1 text-center">
			<button
				type="button"
				className="rounded-full border border-base-300/80 bg-base-300/40 p-0 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm"
				aria-label={label ?? "knob"}
				onMouseDown={(event) => {
					event.preventDefault();
					setDragging(true);
					startYRef.current = event.clientY;
					startValueRef.current = value;
				}}
				style={{ width: size, height: size }}
			>
				<svg width={size} height={size} viewBox="0 0 56 56" role="presentation">
					<circle
						cx="28"
						cy="28"
						r="22"
						fill="rgba(24,24,35,0.95)"
						stroke="rgba(255,255,255,0.08)"
					/>
					<circle
						cx="28"
						cy="28"
						r="21"
						fill="none"
						stroke="rgba(255,255,255,0.08)"
						strokeWidth="1.5"
					/>
					<circle
						cx="28"
						cy="28"
						r="17"
						fill="none"
						stroke={color}
						strokeOpacity="0.3"
						strokeWidth="4"
						strokeDasharray={`${normalizedValue * 106.81} 106.81`}
						transform="rotate(-140 28 28)"
					/>
					<line
						x1="28"
						y1="28"
						x2={28 + Math.cos((angle * Math.PI) / 180) * 14}
						y2={28 + Math.sin((angle * Math.PI) / 180) * 14}
						stroke={color}
						strokeWidth="3.5"
						strokeLinecap="round"
					/>
					<circle cx="28" cy="28" r="3" fill={color} fillOpacity="0.85" />
				</svg>
			</button>
			{label && (
				<div className="space-y-0.5">
					<div className="text-[10px] uppercase tracking-[0.24em] text-base-content/55">
						{label}
					</div>
					<div className="text-[11px] font-semibold text-base-content/80">
						{valueFormatter ? valueFormatter(value) : value.toFixed(2)}
					</div>
				</div>
			)}
		</div>
	);
}

export default ControlKnob;
