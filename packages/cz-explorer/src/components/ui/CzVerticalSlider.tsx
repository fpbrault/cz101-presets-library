import { useCallback, useRef } from "react";
import ModulatableControl from "@/components/ui/ModulatableControl";
import type { ModDestination } from "@/lib/synth/bindings/synth";

interface CzVerticalSliderProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (v: number) => void;
	color?: string;
	/** Optional fixed height for the slider in px. When omitted, it fills parent height. */
	trackHeight?: number;
	/** When provided, wraps the slider in a ModulatableControl for this destination. */
	modDestination?: ModDestination;
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
	trackHeight,
	modDestination,
}: CzVerticalSliderProps) {
	const trackRef = useRef<HTMLDivElement>(null);

	const capH = 30; // height of the fader cap in px
	const trackW = 30; // overall control width in px

	const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
	const capTop = `calc(${(1 - norm) * 100}% - ${(1 - norm) * capH}px)`;
	const fillTop = `calc(${(1 - norm) * 100}% - ${(1 - norm) * capH}px + ${capH / 2}px)`;

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
			const n = 1 - Math.max(0, Math.min(1, relY / Math.max(rect.height, 1)));
			return clampToStep(min + n * (max - min));
		},
		[min, max, clampToStep],
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

	const inner = (
		<div
			ref={trackRef}
			onPointerDown={handlePointerDown}
			onWheel={handleWheel}
			className="relative h-full min-h-8 select-none cursor-ns-resize"
			style={{
				width: trackW,
				height: trackHeight ?? "100%",
				touchAction: "none",
			}}
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
			{/* Track channel */}
			<div
				className="absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-[7px]"
				style={{
					width: 12,
					background: "linear-gradient(to bottom, #171a1d, #23282c)",
					border: "1px solid #30373d",
					boxShadow: "inset 0 2px 5px rgba(0,0,0,0.62)",
				}}
			/>

			{/* Side ruler markings inspired by CZ-1 slider scale */}
			<div className="pointer-events-none absolute inset-y-1 left-0 w-2">
				{Array.from({ length: 13 }).map((_, i) => {
					const p = (i / 12) * 100;
					const isMajor = i % 3 === 0;
					return (
						<div
							key={`l-${p}`}
							className="absolute right-0"
							style={{
								top: `${p}%`,
								width: isMajor ? 7 : 4,
								height: 1,
								background: isMajor
									? "rgba(240,246,255,0.72)"
									: "rgba(240,246,255,0.42)",
								transform: "translateY(-50%)",
								borderRadius: 999,
							}}
						/>
					);
				})}
			</div>
			<div className="pointer-events-none absolute inset-y-1 right-0 w-2">
				{Array.from({ length: 13 }).map((_, i) => {
					const p = (i / 12) * 100;
					const isMajor = i % 3 === 0;
					return (
						<div
							key={`r-${p}`}
							className="absolute left-0"
							style={{
								top: `${p}%`,
								width: isMajor ? 7 : 4,
								height: 1,
								background: isMajor
									? "rgba(240,246,255,0.72)"
									: "rgba(240,246,255,0.42)",
								transform: "translateY(-50%)",
								borderRadius: 999,
							}}
						/>
					);
				})}
			</div>
			<div
				className="pointer-events-none absolute inset-y-1 left-1/2 -translate-x-1/2 rounded-full"
				style={{
					width: 2,
					background:
						"linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.04))",
				}}
			/>

			{/* Filled portion below cap */}
			<div
				className="absolute left-1/2 -translate-x-1/2 rounded-full"
				style={{
					top: fillTop,
					bottom: 0,
					width: 4,
					background: `linear-gradient(to top, ${color}AA, ${color}30)`,
					boxShadow: `0 0 6px ${color}33`,
				}}
			/>

			{/* Fader cap — larger CZ-style rectangular handle */}
			<div
				className="absolute left-1/2 -translate-x-1/2"
				style={{
					top: capTop,
					width: 24,
					height: capH,
					background:
						"linear-gradient(to bottom, #4d545a 0%, #343b42 52%, #242a30 100%)",
					border: "1px solid #6b737b",
					borderRadius: 4,
					boxShadow:
						"0 3px 7px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.22)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 3,
				}}
			>
				{/* Three grip lines like hardware fader cap */}
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						style={{
							width: "72%",
							height: 2,
							background: i === 1 ? color : "rgba(255,255,255,0.18)",
							borderRadius: 1,
						}}
					/>
				))}
			</div>
		</div>
	);

	if (modDestination) {
		return (
			<ModulatableControl destinationId={modDestination}>
				{inner}
			</ModulatableControl>
		);
	}

	return inner;
}
