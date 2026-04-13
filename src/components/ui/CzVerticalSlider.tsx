import { useCallback, useRef } from "react";

interface CzVerticalSliderProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (v: number) => void;
	color?: string;
	/** Height of the slider track in px */
	trackHeight?: number;
}

/**
 * A vertical fader styled after the CZ-101 hardware volume slider:
 * tall pill-shaped track with a rectangular notched cap.
 */
export default function CzVerticalSlider({
	value,
	min,
	max,
	step = 0.01,
	onChange,
	color = "#9cb937",
	trackHeight = 96,
}: CzVerticalSliderProps) {
	const trackRef = useRef<HTMLDivElement>(null);

	const capH = 22; // height of the fader cap in px
	const trackW = 14; // track width in px

	const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
	// cap top position: norm=1 → top, norm=0 → bottom
	const capTop = (1 - norm) * (trackHeight - capH);

	const clampToStep = useCallback(
		(raw: number) => {
			const clamped = Math.max(min, Math.min(max, raw));
			if (step === 0) return clamped;
			return Math.round((clamped - min) / step) * step + min;
		},
		[min, max, step],
	);

	const posToValue = useCallback(
		(clientY: number, rect: DOMRect) => {
			const relY = clientY - rect.top;
			const n = 1 - Math.max(0, Math.min(1, relY / trackHeight));
			return clampToStep(min + n * (max - min));
		},
		[trackHeight, min, max, clampToStep],
	);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.preventDefault();
			const el = trackRef.current;
			if (!el) return;
			el.setPointerCapture(e.pointerId);
			const rect = el.getBoundingClientRect();
			onChange(posToValue(e.clientY, rect));

			const onMove = (ev: PointerEvent) => {
				const r = el.getBoundingClientRect();
				onChange(posToValue(ev.clientY, r));
			};
			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
			};
			el.addEventListener("pointermove", onMove);
			el.addEventListener("pointerup", onUp);
		},
		[onChange, posToValue],
	);

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();
			const delta = -e.deltaY / 100;
			const range = max - min;
			onChange(clampToStep(value + delta * range * 0.05));
		},
		[value, min, max, clampToStep, onChange],
	);

	return (
		<div
			ref={trackRef}
			onPointerDown={handlePointerDown}
			onWheel={handleWheel}
			className="relative select-none cursor-ns-resize"
			style={{ width: trackW, height: trackHeight }}
			role="slider"
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max}
			tabIndex={0}
			onKeyDown={(e) => {
				const inc = step || (max - min) / 100;
				if (e.key === "ArrowUp") onChange(clampToStep(value + inc));
				if (e.key === "ArrowDown") onChange(clampToStep(value - inc));
			}}
		>
			{/* Track pill */}
			<div
				className="absolute inset-x-0 rounded-full"
				style={{
					top: 0,
					bottom: 0,
					left: "50%",
					transform: "translateX(-50%)",
					width: 6,
					background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
					border: "1px solid #3a3a3a",
					boxShadow: "inset 0 1px 3px rgba(0,0,0,0.6)",
				}}
			/>

			{/* Filled portion below cap */}
			<div
				className="absolute rounded-full"
				style={{
					top: capTop + capH / 2,
					bottom: 0,
					left: "50%",
					transform: "translateX(-50%)",
					width: 4,
					background: `linear-gradient(to top, ${color}88, ${color}33)`,
				}}
			/>

			{/* Fader cap — rectangular with notch lines */}
			<div
				className="absolute"
				style={{
					top: capTop,
					left: 0,
					width: trackW,
					height: capH,
					background: "linear-gradient(to bottom, #4a4a4a, #2e2e2e)",
					border: "1px solid #555",
					borderRadius: 3,
					boxShadow:
						"0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 2,
				}}
			>
				{/* Three notch lines like hardware fader grip */}
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						style={{
							width: "70%",
							height: 1,
							background: i === 1 ? color : "rgba(255,255,255,0.18)",
							borderRadius: 1,
						}}
					/>
				))}
			</div>
		</div>
	);
}
