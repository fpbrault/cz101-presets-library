import {
	motion,
	useReducedMotion,
	useSpring,
	useTransform,
} from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useEffect,
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
	const reducedMotion = useReducedMotion();

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
		? Math.max(60, modTrailDuration)
		: 220;
	const headDamping = Math.max(24, Math.min(52, trailDuration / 7));
	const midDamping = Math.max(26, Math.min(56, trailDuration / 6));
	const tailDamping = Math.max(28, Math.min(60, trailDuration / 5));

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

	const trailHead = useSpring(safeModulatedNorm ?? safeNormalizedValue, {
		stiffness: 420,
		damping: headDamping,
		mass: 0.2,
	});
	const trailMid = useSpring(trailHead, {
		stiffness: 260,
		damping: midDamping,
		mass: 0.28,
	});
	const trailTail = useSpring(trailMid, {
		stiffness: 180,
		damping: tailDamping,
		mass: 0.35,
	});
	const trailFar = useSpring(trailTail, {
		stiffness: 130,
		damping: Math.max(30, tailDamping + 3),
		mass: 0.42,
	});

	useEffect(() => {
		trailHead.set(safeModulatedNorm ?? safeNormalizedValue);
	}, [safeModulatedNorm, safeNormalizedValue, trailHead]);

	const headX = useTransform(
		trailHead,
		(norm) => modTargetPoint(norm, safeGeometry).x,
	);
	const headY = useTransform(
		trailHead,
		(norm) => modTargetPoint(norm, safeGeometry).y,
	);

	const trailFrontPath = useTransform(
		[trailHead, trailMid],
		([headNorm, midNorm]: number[]) => {
			if (!Number.isFinite(headNorm) || !Number.isFinite(midNorm)) return "";
			if (Math.abs(headNorm - midNorm) < 0.0008) return "";
			const from = valueToAngle(midNorm, startAngle, sweepAngle);
			const to = valueToAngle(headNorm, startAngle, sweepAngle);
			return describeArc(cx, cy, safeGeometry.modOrbitRadius, from, to);
		},
	);

	const trailBackPath = useTransform(
		[trailMid, trailFar],
		([midNorm, farNorm]: number[]) => {
			if (!Number.isFinite(midNorm) || !Number.isFinite(farNorm)) return "";
			if (Math.abs(midNorm - farNorm) < 0.0008) return "";
			const from = valueToAngle(farNorm, startAngle, sweepAngle);
			const to = valueToAngle(midNorm, startAngle, sweepAngle);
			return describeArc(cx, cy, safeGeometry.modOrbitRadius, from, to);
		},
	);

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

	const motionTransition =
		dragging || reducedMotion
			? { duration: 0 }
			: { duration: 0.18, ease: [0.34, 1.2, 0.64, 1] as const };

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

				<motion.path
					d={trackPath}
					fill="none"
					stroke="var(--knob-track-color)"
					strokeLinecap="round"
					strokeWidth={currentTrackWidth}
					animate={{ strokeWidth: currentTrackWidth }}
					transition={{ duration: 0.2, ease: "easeOut" }}
				/>

				{valuePath && (
					<motion.path
						d={valuePath}
						fill="none"
						stroke="var(--knob-value-color)"
						strokeLinecap={bipolarNorm !== null ? "butt" : "round"}
						strokeWidth={currentTrackWidth}
						animate={{ d: valuePath, strokeWidth: currentTrackWidth }}
						transition={motionTransition}
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

				<motion.line
					x1={cx}
					y1={cy}
					x2={indicatorTip.x}
					y2={indicatorTip.y}
					stroke="var(--knob-indicator-color)"
					strokeWidth="3.5"
					strokeLinecap="round"
					className={dragging ? "opacity-100" : "opacity-90"}
					animate={{ x2: indicatorTip.x, y2: indicatorTip.y }}
					transition={
						dragging || reducedMotion
							? { duration: 0 }
							: { type: "spring", stiffness: 380, damping: 26, mass: 0.24 }
					}
				/>
				<circle
					cx={cx}
					cy={cy}
					r="3"
					fill="var(--knob-indicator-color)"
					fillOpacity="0.85"
				/>

				{safeModulatedNorm !== undefined && (
					<>
						<motion.path
							d={trailBackPath}
							fill="none"
							stroke="var(--knob-value-color)"
							strokeWidth="1.45"
							strokeLinecap="round"
							strokeOpacity="0.2"
						/>
						<motion.path
							d={trailFrontPath}
							fill="none"
							stroke="var(--knob-value-color)"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeOpacity="0.42"
						/>
						<motion.circle
							cx={headX}
							cy={headY}
							r="2.1"
							fill="var(--knob-value-color)"
							fillOpacity="0.95"
						/>
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
