import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useId,
} from "react";
import {
	type ArcGeometry,
	DEFAULT_ARC_GEOMETRY,
	describeArc,
	describeValuePath,
	modTargetPoint,
	polarToCartesian,
	valueToAngle,
} from "./knobGeometry";

export type KnobVariant = "default" | "accent" | "muted";

export interface KnobViewProps {
	normalizedValue: number;
	/** Pre-computed normalized position of the bipolar zero crossing, or null. */
	bipolarNorm?: number | null;
	/** Normalized position of the modulated value; renders animated mod dot when set. */
	modulatedNorm?: number;
	arcGeometry?: ArcGeometry;
	variant?: KnobVariant;
	/** Escape-hatch raw CSS color; overrides the variant's value/indicator tokens. */
	colorOverride?: string;
	/** Pixel width and height of the rendered knob. */
	size: number;
	dragging?: boolean;
	hovered?: boolean;
	modTrailDuration?: number;
	/** HTML content rendered as a centered overlay on top of the SVG face. */
	htmlOverlay?: ReactNode;
	/** Forwarded ref for the inner SVG element (used by useKnobInteraction for coordinate transforms). */
	svgRef?: RefObject<SVGSVGElement>;
}

export function KnobView({
	normalizedValue,
	bipolarNorm = null,
	modulatedNorm,
	arcGeometry = DEFAULT_ARC_GEOMETRY,
	variant = "default",
	colorOverride,
	size,
	dragging = false,
	hovered = false,
	modTrailDuration = 220,
	htmlOverlay,
	svgRef,
}: KnobViewProps) {
	const uid = useId().replace(/:/g, "");
	const gradId = `knobGrad-${uid}`;
	const innerGradId = `knobInner-${uid}`;

	const cx = Number.isFinite(arcGeometry.cx)
		? arcGeometry.cx
		: DEFAULT_ARC_GEOMETRY.cx;
	const cy = Number.isFinite(arcGeometry.cy)
		? arcGeometry.cy
		: DEFAULT_ARC_GEOMETRY.cy;
	const radius = Number.isFinite(arcGeometry.radius)
		? arcGeometry.radius
		: DEFAULT_ARC_GEOMETRY.radius;
	const trackWidth = Number.isFinite(arcGeometry.trackWidth)
		? arcGeometry.trackWidth
		: DEFAULT_ARC_GEOMETRY.trackWidth;
	const viewBoxSize = Number.isFinite(arcGeometry.viewBoxSize)
		? arcGeometry.viewBoxSize
		: DEFAULT_ARC_GEOMETRY.viewBoxSize;
	const startAngle = Number.isFinite(arcGeometry.startAngle)
		? arcGeometry.startAngle
		: DEFAULT_ARC_GEOMETRY.startAngle;
	const sweepAngle = Number.isFinite(arcGeometry.sweepAngle)
		? arcGeometry.sweepAngle
		: DEFAULT_ARC_GEOMETRY.sweepAngle;
	const indicatorRadius = Number.isFinite(arcGeometry.indicatorRadius)
		? arcGeometry.indicatorRadius
		: DEFAULT_ARC_GEOMETRY.indicatorRadius;

	const safeNormalizedValue = Number.isFinite(normalizedValue)
		? normalizedValue
		: 0;
	const safeModulatedNorm =
		modulatedNorm !== undefined && Number.isFinite(modulatedNorm)
			? modulatedNorm
			: undefined;
	const trailDuration = Number.isFinite(modTrailDuration)
		? modTrailDuration > 0
			? Math.max(60, modTrailDuration)
			: 0
		: 220;

	const indicatorAngle = valueToAngle(
		safeNormalizedValue,
		startAngle,
		sweepAngle,
	);
	const indicatorTip = polarToCartesian(
		cx,
		cy,
		indicatorRadius,
		indicatorAngle,
	);
	const thinTrackWidth = Math.max(1, trackWidth - 2);
	const thickTrackWidth = trackWidth + 1;
	const currentTrackWidth = hovered ? thickTrackWidth : thinTrackWidth;

	const trackPath = describeArc(
		cx,
		cy,
		radius,
		startAngle,
		startAngle + sweepAngle,
	);
	const valuePath = describeValuePath(safeNormalizedValue, bipolarNorm, {
		...arcGeometry,
		cx,
		cy,
		radius,
		trackWidth,
		viewBoxSize,
		startAngle,
		sweepAngle,
		indicatorRadius,
	});
	const safeGeometry: ArcGeometry = {
		...arcGeometry,
		cx,
		cy,
		radius,
		trackWidth,
		viewBoxSize,
		startAngle,
		sweepAngle,
		indicatorRadius,
	};
	const modulatedPoint =
		safeModulatedNorm !== undefined
			? modTargetPoint(safeModulatedNorm, safeGeometry)
			: null;
	const modulatedTrailPath =
		safeModulatedNorm !== undefined &&
		Math.abs(safeModulatedNorm - safeNormalizedValue) >= 0.0008
			? (() => {
					const baseAngle = valueToAngle(
						safeNormalizedValue,
						startAngle,
						sweepAngle,
					);
					const modulatedAngle = valueToAngle(
						safeModulatedNorm,
						startAngle,
						sweepAngle,
					);
					const [from, to] =
						safeModulatedNorm >= safeNormalizedValue
							? [baseAngle, modulatedAngle]
							: [modulatedAngle, baseAngle];
					return describeArc(cx, cy, safeGeometry.modOrbitRadius, from, to);
				})()
			: "";

	const centerTick =
		bipolarNorm !== null
			? (() => {
					const angle = valueToAngle(bipolarNorm, startAngle, sweepAngle);
					const outer = polarToCartesian(
						cx,
						cy,
						radius + currentTrackWidth / 2 + 1,
						angle,
					);
					const inner = polarToCartesian(
						cx,
						cy,
						radius - currentTrackWidth / 2 - 1,
						angle,
					);
					return { outer, inner };
				})()
			: null;

	const overrideStyle: CSSProperties | undefined = colorOverride
		? ({
				"--knob-value-color": colorOverride,
				"--knob-indicator-color": colorOverride,
			} as CSSProperties)
		: undefined;

	return (
		<div
			className={`relative knob-variant-${variant}`}
			style={{ width: size, height: size, ...overrideStyle }}
		>
			<svg
				ref={svgRef}
				width={size}
				height={size}
				viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
				role="presentation"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
						<stop
							offset="0%"
							stopColor="var(--knob-value-color)"
							stopOpacity="0.18"
						/>
						<stop
							offset="100%"
							stopColor="var(--knob-value-color)"
							stopOpacity="0"
						/>
					</linearGradient>
					<radialGradient id={innerGradId} cx="50%" cy="50%" r="50%">
						<stop offset="60%" stopColor="rgba(0,0,0,0)" />
						<stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
					</radialGradient>
				</defs>

				<circle
					cx={cx}
					cy={cy}
					r={cx - 6}
					fill="var(--knob-bg)"
					stroke="var(--knob-border)"
					strokeWidth="1"
				/>
				<circle cx={cx} cy={cy} r={cx - 7} fill={`url(#${gradId})`} />
				<circle cx={cx} cy={cy} r={cx - 7} fill={`url(#${innerGradId})`} />

				<path
					d={trackPath}
					fill="none"
					stroke="var(--knob-track-color)"
					strokeLinecap="round"
					strokeWidth={currentTrackWidth}
				/>

				{valuePath && (
					<path
						d={valuePath}
						fill="none"
						stroke="var(--knob-value-color)"
						strokeLinecap={bipolarNorm !== null ? "butt" : "round"}
						strokeWidth={currentTrackWidth}
					/>
				)}

				{centerTick && (
					<line
						x1={centerTick.inner.x}
						y1={centerTick.inner.y}
						x2={centerTick.outer.x}
						y2={centerTick.outer.y}
						stroke="var(--knob-track-color)"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				)}

				<line
					x1={cx}
					y1={cy}
					x2={indicatorTip.x}
					y2={indicatorTip.y}
					stroke="var(--knob-indicator-color)"
					strokeWidth="3.5"
					strokeLinecap="round"
					className={dragging ? "opacity-100" : "opacity-90"}
				/>
				<circle
					cx={cx}
					cy={cy}
					r="3"
					fill="var(--knob-indicator-color)"
					fillOpacity="0.85"
				/>

				{safeModulatedNorm !== undefined && trailDuration > 0 && (
					<>
						{modulatedTrailPath ? (
							<path
								d={modulatedTrailPath}
								fill="none"
								stroke="var(--knob-value-color)"
								strokeWidth="2"
								strokeLinecap="round"
								strokeOpacity="0.35"
							/>
						) : null}
						{modulatedPoint ? (
							<circle
								cx={modulatedPoint.x}
								cy={modulatedPoint.y}
								r="2.1"
								fill="var(--knob-value-color)"
								fillOpacity="0.95"
							/>
						) : null}
					</>
				)}
			</svg>

			{htmlOverlay && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					{htmlOverlay}
				</div>
			)}
		</div>
	);
}

export default KnobView;
