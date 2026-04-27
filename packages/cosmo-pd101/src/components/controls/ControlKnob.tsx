import { type ReactNode, useCallback, useRef, useState } from "react";
import ModulatableControl from "@/components/controls/modulation/ModulatableControl";
import { useOptionalSynthController } from "@/features/synth/SynthParamController";
import type { ModDestination } from "@/lib/synth/bindings/synth";
import {
	type ModTarget,
	resolveModDestination,
} from "@/lib/synth/modDestination";
import { useHoverInfo, useHoverInfoHandlers } from "../layout/HoverInfo";
import { type KnobVariant, KnobView } from "./knob/KnobView";
import {
	bipolarCenterNorm,
	clampValue,
	DEFAULT_ARC_GEOMETRY,
	normalizeValue,
} from "./knob/knobGeometry";
import { useKnobInteraction } from "./knob/useKnobInteraction";

export interface ControlKnobProps {
	value: number;
	onChange: (value: number) => void;
	disabled?: boolean;
	min?: number;
	max?: number;
	/** Quantize to nearest step. Undefined = continuous. */
	step?: number;
	label?: string;
	tooltip?: string;
	/** Semantic color variant. Prefer this over `color`. */
	variant?: KnobVariant;
	className?: string;
	/**
	 * Raw CSS color override (migration escape hatch).
	 * Maps to `--knob-value-color` and `--knob-indicator-color`.
	 * Prefer `variant` for new code.
	 */
	color?: string;
	size?: number;
	valueFormatter?: (value: number) => string;
	valueVisibility?: "always" | "hover" | "never";
	defaultValue?: number;
	/** When true, renders a bipolar arc anchored at value = 0. */
	bipolar?: boolean;
	/** Arc start angle in degrees. Default -230. */
	arcStartAngle?: number;
	/** Arc total sweep in degrees. Default 280. */
	arcSweepAngle?: number;
	/** Pixels of vertical drag to traverse the full range. Default 200. */
	sensitivity?: number;
	/** Sensitivity divisor when Shift is held. Default 5. */
	fineSensitivity?: number;
	/** Normalized step per wheel tick. Default 0.01. */
	wheelStep?: number;
	/** Normalized step per wheel tick with Shift. Default 0.002. */
	fineWheelStep?: number;
	/** HTML content rendered as a centered overlay on the knob face. */
	children?: ReactNode;
	/**
	 * Simple modulation opt-in: set this to a target key (e.g. "volume" or
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
	/** How long (ms) each trail dot persists. Set to 0 to disable trail. */
	modTrailDuration?: number;
}

export function ControlKnob({
	value,
	onChange,
	disabled = false,
	min = 0,
	max = 1,
	step,
	label,
	tooltip,
	variant = "default",
	className,
	color,
	size = 32,
	valueFormatter,
	valueVisibility = "always",
	defaultValue,
	bipolar = false,
	arcStartAngle,
	arcSweepAngle,
	sensitivity,
	fineSensitivity,
	wheelStep,
	fineWheelStep,
	children,
	modulatable,
	lineIndex = 1,
	modDestination,
	modulatedValue,
	modTrailDuration = 220,
}: ControlKnobProps) {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const [hovered, setHovered] = useState(false);
	const { setControlReadout } = useHoverInfo();
	const resolvedTooltip = tooltip?.trim() ? tooltip : label?.trim();
	const formatDisplayValue = useCallback(
		(nextValue: number) => {
			if (valueFormatter) {
				return valueFormatter(nextValue);
			}

			return Number.isInteger(nextValue)
				? `${nextValue}`
				: nextValue.toFixed(2);
		},
		[valueFormatter],
	);
	const emitChange = useCallback(
		(nextValue: number) => {
			onChange(nextValue);
			setControlReadout({
				label: label ?? "Value",
				value: formatDisplayValue(nextValue),
			});
		},
		[formatDisplayValue, label, onChange, setControlReadout],
	);

	const arcGeometry =
		arcStartAngle !== undefined || arcSweepAngle !== undefined
			? {
					...DEFAULT_ARC_GEOMETRY,
					startAngle: arcStartAngle ?? DEFAULT_ARC_GEOMETRY.startAngle,
					sweepAngle: arcSweepAngle ?? DEFAULT_ARC_GEOMETRY.sweepAngle,
				}
			: DEFAULT_ARC_GEOMETRY;

	const {
		dragging,
		editing,
		editValue,
		inputRef,
		onPointerDown,
		onDoubleClick,
		onKeyDown,
		beginEdit,
		setEditValue,
		onEditKeyDown,
		onEditBlur,
	} = useKnobInteraction({
		value,
		min,
		max,
		step,
		defaultValue,
		sensitivity,
		fineSensitivity,
		wheelStep,
		fineWheelStep,
		disabled,
		onChange: emitChange,
		arcGeometry,
		svgRef,
		buttonRef,
	});

	const maybeSynthController = useOptionalSynthController();

	const resolvedDestination =
		modDestination ??
		maybeSynthController?.resolveDestination(modulatable, { lineIndex }) ??
		resolveModDestination(modulatable, { lineIndex });

	const computedModulatedValue = maybeSynthController?.getModulatedValue({
		destination: resolvedDestination,
		baseValue: value,
	});
	const effectiveModulatedValue = modulatedValue ?? computedModulatedValue;

	// Normalize the effective modulated value for KnobView
	const modulatedNorm =
		effectiveModulatedValue !== undefined && effectiveModulatedValue !== null
			? normalizeValue(clampValue(effectiveModulatedValue, min, max), min, max)
			: undefined;

	const normalizedValue = normalizeValue(value, min, max);
	const bipolarNorm = bipolar ? bipolarCenterNorm(min, max) : null;

	const displayValue = valueFormatter
		? valueFormatter(value)
		: value.toFixed(2);
	const valueControlLabel = label ? `${label} value` : "knob value";
	const hoverHandlers = useHoverInfoHandlers(resolvedTooltip, {
		useCapture: true,
	});

	const inner = (
		<div
			className={`group flex flex-col items-center gap-0.5 text-center ${className ?? ""}`}
			data-hover-info={resolvedTooltip}
			{...hoverHandlers}
		>
			{label && (
				<div className="space-y-0.5">
					<div className="flex items-center justify-center text-3xs uppercase tracking-[0.24em] text-base-content/55">
						<span>{label}</span>
					</div>
				</div>
			)}
			<button
				ref={buttonRef}
				type="button"
				role="spinbutton"
				className={`rounded-full border border-base-300/80 bg-base-300/40 p-0 shadow-lg backdrop-blur-sm touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-base-content/30 ${
					disabled
						? "cursor-not-allowed opacity-60"
						: "cursor-grab active:cursor-grabbing"
				}`}
				aria-label={label ?? "knob"}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={value}
				aria-valuetext={displayValue}
				aria-disabled={disabled}
				disabled={disabled}
				onPointerEnter={() => setHovered(true)}
				onPointerLeave={() => setHovered(false)}
				onFocus={() => setHovered(true)}
				onBlur={() => setHovered(false)}
				onPointerDown={onPointerDown}
				onDoubleClick={onDoubleClick}
				onKeyDown={onKeyDown}
			>
				<KnobView
					normalizedValue={normalizedValue}
					bipolarNorm={bipolarNorm}
					modulatedNorm={modulatedNorm}
					arcGeometry={arcGeometry}
					variant={variant}
					colorOverride={color}
					size={size}
					dragging={dragging}
					hovered={hovered}
					modTrailDuration={modTrailDuration}
					htmlOverlay={children}
					svgRef={svgRef}
				/>
			</button>
			{label && (
				<div className="min-h-2 -mt-1.5 space-y-0">
					{valueVisibility !== "never" && editing ? (
						<input
							ref={inputRef as React.RefObject<HTMLInputElement>}
							type="text"
							aria-label={valueControlLabel}
							className="w-14 border border-base-300 bg-cz-surface px-1 text-center text-2xs font-semibold text-base-content/80 outline-none focus:border-primary"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onBlur={onEditBlur}
							onKeyDown={onEditKeyDown}
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
							onClick={() => beginEdit(displayValue)}
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
