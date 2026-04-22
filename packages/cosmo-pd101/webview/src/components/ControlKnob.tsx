import { useEffect, useRef, useState } from "react";
import ModulatableControl from "@/components/ui/ModulatableControl";
import { useOptionalSynthController } from "@/features/synth/SynthParamController";
import type { ModDestination } from "@/lib/synth/bindings/synth";
import {
	type ModTarget,
	resolveModDestination,
} from "@/lib/synth/modDestination";

type KnobSvgProps = {
	size: number;
	color: string;
	arcPath: string;
	hasModulation: boolean;
	modTargetX: number;
	modTargetY: number;
	angle: number;
};

function renderKnobSvg({
	size,
	color,
	arcPath,
	hasModulation,
	modTargetX,
	modTargetY,
	angle,
}: KnobSvgProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 56 56" role="presentation">
			<defs>
				<linearGradient id="knobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor={color} stopOpacity="0.2" />
					<stop offset="100%" stopColor={color} stopOpacity="0" />
				</linearGradient>
				<radialGradient id="knobInner" cx="50%" cy="50%" r="50%">
					<stop offset="60%" stopColor="rgba(0,0,0,0)" />
					<stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
				</radialGradient>
			</defs>
			<circle
				cx="28"
				cy="28"
				r="22"
				fill="rgba(24,24,35,0.95)"
				stroke="rgba(255,255,255,0.08)"
			/>
			<circle cx="28" cy="28" r="21" fill="url(#knobGrad)" />
			<circle
				cx="28"
				cy="28"
				r="21"
				fill="none"
				stroke="rgba(255,255,255,0.08)"
				strokeWidth="1.5"
			/>
			<path
				d={arcPath}
				fill="none"
				stroke={color}
				strokeOpacity="0.3"
				strokeWidth="4"
				strokeLinecap="round"
			/>
			{hasModulation && (
				<circle
					cx={modTargetX}
					cy={modTargetY}
					r="2.25"
					fill="#67c7ff"
					fillOpacity="0.95"
				/>
			)}
			<line
				x1="28"
				y1="28"
				x2={28 + Math.cos((angle * Math.PI) / 180) * 14}
				y2={28 + Math.sin((angle * Math.PI) / 180) * 14}
				stroke={color}
				strokeWidth="3.5"
				strokeLinecap="round"
			/>
			<circle cx="28" cy="28" r="21" fill="url(#inner)" />
			<circle cx="28" cy="28" r="3" fill={color} fillOpacity="0.85" />
		</svg>
	);
}

interface ControlKnobProps {
	value: number;
	onChange: (value: number) => void;
	disabled?: boolean;
	min?: number;
	max?: number;
	label?: string;
	tooltip?: string;
	color?: string;
	size?: number;
	valueFormatter?: (value: number) => string;
	valueVisibility?: "always" | "hover" | "never";
	defaultValue?: number;
	/**
	 * Simple modulation opt-in: set this to a target key (for example "volume" or
	 * line-scoped values like "dcwBase") and the destination is resolved
	 * automatically.
	 */
	modulatable?: ModTarget;
	/** Line context for line-scoped targets (defaults to line 1). */
	lineIndex?: 1 | 2;
	/** When provided, wraps the knob in a ModulatableControl for this destination. */
	modDestination?: ModDestination;
	/** Final value after modulation, used only for indicator rendering. */
	modulatedValue?: number;
}

export function ControlKnob({
	value,
	onChange,
	disabled = false,
	min = 0,
	max = 1,
	label,
	tooltip,
	color = "#f6f06d",
	size = 32,
	valueFormatter,
	valueVisibility = "always",
	defaultValue,
	modulatable,
	lineIndex = 1,
	modDestination,
	modulatedValue,
}: ControlKnobProps) {
	const [dragging, setDragging] = useState(false);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState("");
	const startYRef = useRef(0);
	const startValueRef = useRef(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const valueControlLabel = label ? `${label} value` : "knob value";
	const displayValue = valueFormatter
		? valueFormatter(value)
		: value.toFixed(2);
	const maybeSynthController = useOptionalSynthController();

	const normalizedValue = (value - min) / (max - min);
	const angle = -230 + normalizedValue * 280;
	const startAngleRad = (-230 * Math.PI) / 180;
	const endAngleRad = (angle * Math.PI) / 180;
	const startX = 28 + Math.cos(startAngleRad) * 17;
	const startY = 28 + Math.sin(startAngleRad) * 17;
	const endX = 28 + Math.cos(endAngleRad) * 17;
	const endY = 28 + Math.sin(endAngleRad) * 17;
	const sweepAngle = normalizedValue * 280;
	const largeArcFlag = sweepAngle >= 180 ? 1 : 0;
	const arcPath =
		normalizedValue > 0
			? `M ${startX} ${startY} A 17 17 0 ${largeArcFlag} 1 ${endX} ${endY}`
			: "";

	const resolvedDestination =
		modDestination ??
		maybeSynthController?.resolveDestination(modulatable, { lineIndex }) ??
		resolveModDestination(modulatable, { lineIndex });
	const computedModulatedValue = maybeSynthController?.getModulatedValue({
		destination: resolvedDestination,
		baseValue: value,
	});
	const effectiveModulatedValue = modulatedValue ?? computedModulatedValue;
	const hasModulation = effectiveModulatedValue != null;
	const moddedValue = Math.max(
		min,
		Math.min(max, effectiveModulatedValue ?? value),
	);
	const modTargetNorm = (moddedValue - min) / (max - min || 1);
	const modTargetAngle = -230 + modTargetNorm * 280;
	const modTargetRad = (modTargetAngle * Math.PI) / 180;
	const modTargetX = 28 + Math.cos(modTargetRad) * 19.5;
	const modTargetY = 28 + Math.sin(modTargetRad) * 19.5;

	const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
		if (disabled) return;
		event.preventDefault();
		setDragging(true);
		startYRef.current = event.clientY;
		startValueRef.current = value;
	};

	const handleDoubleClick = () => {
		if (disabled) return;
		if (defaultValue !== undefined) {
			onChange(defaultValue);
		}
	};

	const handleDisplayClick = () => {
		if (disabled) return;
		setEditing(true);
		setEditValue(displayValue);
	};

	const commitEdit = () => {
		setEditing(false);
		const parsed = Number.parseFloat(editValue);
		if (!Number.isNaN(parsed)) {
			onChange(Math.max(min, Math.min(max, parsed)));
		}
	};

	const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			commitEdit();
		} else if (event.key === "Escape") {
			setEditing(false);
		}
	};

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editing]);

	useEffect(() => {
		if (!dragging || disabled) return;

		const handlePointerMove = (event: PointerEvent) => {
			const deltaY = startYRef.current - event.clientY;
			const range = max - min;
			const sensitivity = Math.max(160, size * 4);
			const nextValue = startValueRef.current + (deltaY / sensitivity) * range;
			onChange(Math.max(min, Math.min(max, nextValue)));
		};

		const handlePointerUp = () => {
			setDragging(false);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [disabled, dragging, max, min, onChange, size]);

	const inner = (
		<div className="group flex flex-col items-center gap-0.5 text-center">
			{label && (
				<div className="space-y-0.5">
					<div className="flex items-center justify-center gap-1 text-3xs uppercase tracking-[0.24em] text-base-content/55">
						<span>{label}</span>
						{tooltip ? (
							<div
								className="tooltip tooltip-right z-50 [&:before]:bg-cz-body [&:before]:text-left [&:before]:text-xs normal-case [&:before]:leading-tight"
								data-tip={tooltip}
							>
								<button
									type="button"
									className="btn btn-ghost btn-circle btn-xs h-4 min-h-4 w-4 border border-cz-border p-0 text-2xs font-semibold leading-none text-cz-cream/70 hover:border-cz-light-blue hover:text-cz-light-blue"
									aria-label="Show control description"
									tabIndex={-1}
								>
									?
								</button>
							</div>
						) : null}
					</div>
				</div>
			)}
			<button
				type="button"
				className={`rounded-full border border-base-300/80 bg-base-300/40 p-0 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm touch-none ${
					disabled ? "cursor-not-allowed opacity-60" : ""
				}`}
				aria-label={label ?? "knob"}
				disabled={disabled}
				onPointerDown={handlePointerDown}
				onDoubleClick={handleDoubleClick}
				style={{ width: size, height: size }}
			>
				{renderKnobSvg({
					size,
					color,
					arcPath,
					hasModulation,
					modTargetX,
					modTargetY,
					angle,
				})}
			</button>
			{label && (
				<div className="space-y-0 min-h-2 -mt-1.5">
					{valueVisibility !== "never" && editing ? (
						<input
							ref={inputRef}
							type="text"
							aria-label={valueControlLabel}
							className="w-14 border border-base-300 bg-cz-surface px-1 text-center text-2xs font-semibold text-base-content/80 outline-none focus:border-primary"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onBlur={commitEdit}
							onKeyDown={handleEditKeyDown}
						/>
					) : valueVisibility !== "never" ? (
						<button
							type="button"
							aria-label={valueControlLabel}
							className={`text-2xs leading-none font-semibold transition-opacity ${
								disabled
									? "cursor-not-allowed text-base-content/55"
									: "cursor-pointer text-base-content/80 hover:text-base-content"
							} ${
								valueVisibility === "always" || dragging
									? "opacity-100"
									: "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
							}`}
							disabled={disabled}
							onClick={handleDisplayClick}
						>
							{displayValue}
						</button>
					) : null}
				</div>
			)}
		</div>
	);

	if (resolvedDestination) {
		const knobLabelOffset = label ? 16 : 0;
		const iconTop = knobLabelOffset + size - 6;

		return (
			<ModulatableControl
				destinationId={resolvedDestination}
				label={label}
				iconClassName="!right-[0px] !bottom-auto"
				iconStyle={{ top: iconTop }}
			>
				{inner}
			</ModulatableControl>
		);
	}

	return inner;
}

export default ControlKnob;
