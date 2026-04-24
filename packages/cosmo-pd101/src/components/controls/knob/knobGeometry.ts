export const DEFAULT_START_ANGLE = -230;
export const DEFAULT_SWEEP_ANGLE = 280;

export interface ArcGeometry {
	/** Arc start angle in degrees. Default -230. */
	startAngle: number;
	/** Arc total sweep in degrees. Default 280. */
	sweepAngle: number;
	/** Arc radius in viewBox units. Default 17. */
	radius: number;
	/** Track/arc stroke width. Default 4. */
	trackWidth: number;
	/** Center X in viewBox units. Default 28. */
	cx: number;
	/** Center Y in viewBox units. Default 28. */
	cy: number;
	/** viewBox width = height. Default 56. */
	viewBoxSize: number;
	/** Indicator line end radius (distance from center to tip). Default 14. */
	indicatorRadius: number;
	/** Orbit radius for the modulation target dot. Default 22.5. */
	modOrbitRadius: number;
	/** Hit radius for the handle in viewBox units (for angular drag detection). Default 6. */
	handleHitRadius: number;
}

export const DEFAULT_ARC_GEOMETRY: ArcGeometry = {
	startAngle: DEFAULT_START_ANGLE,
	sweepAngle: DEFAULT_SWEEP_ANGLE,
	radius: 17,
	trackWidth: 4,
	cx: 28,
	cy: 28,
	viewBoxSize: 56,
	indicatorRadius: 14,
	modOrbitRadius: 22.5,
	handleHitRadius: 6,
};

/** Clamp a value to [min, max]. */
export function clampValue(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Map a domain value to normalized [0, 1]. */
export function normalizeValue(
	value: number,
	min: number,
	max: number,
): number {
	if (max <= min) return 0;
	return clampValue((value - min) / (max - min), 0, 1);
}

/** Map a normalized [0, 1] value back to the domain. */
export function denormalizeValue(
	norm: number,
	min: number,
	max: number,
): number {
	return min + clampValue(norm, 0, 1) * (max - min);
}

/**
 * Snap a domain value to the nearest step boundary.
 * No-ops when step is undefined or ≤ 0.
 */
export function snapToStep(
	value: number,
	step: number | undefined,
	min: number,
	max: number,
): number {
	if (!step || step <= 0) return value;
	const steps = Math.round((value - min) / step);
	return clampValue(steps * step + min, min, max);
}

/** Convert polar coordinates to Cartesian. Angle in degrees. */
export function polarToCartesian(
	cx: number,
	cy: number,
	r: number,
	angleDeg: number,
): { x: number; y: number } {
	const rad = (angleDeg * Math.PI) / 180;
	return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

/** Map a normalized value to an arc angle in degrees. */
export function valueToAngle(
	normalized: number,
	startAngle: number,
	sweepAngle: number,
): number {
	return startAngle + normalized * sweepAngle;
}

/**
 * Build an SVG arc path string from startAngleDeg to endAngleDeg
 * (clockwise when endAngleDeg > startAngleDeg).
 */
export function describeArc(
	cx: number,
	cy: number,
	r: number,
	startAngleDeg: number,
	endAngleDeg: number,
): string {
	const start = polarToCartesian(cx, cy, r, startAngleDeg);
	const end = polarToCartesian(cx, cy, r, endAngleDeg);
	const sweep = endAngleDeg - startAngleDeg;
	const largeArc = Math.abs(sweep) >= 180 ? 1 : 0;
	const sweepFlag = sweep >= 0 ? 1 : 0;
	return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

/**
 * Returns the normalized position (0–1) of value=0 for bipolar controls
 * (where min < 0 < max), or null if the range does not cross zero.
 */
export function bipolarCenterNorm(min: number, max: number): number | null {
	if (min >= 0 || max <= 0) return null;
	return -min / (max - min);
}

/**
 * Build the SVG path for the active value arc.
 * For bipolar controls, draws from the zero-crossing to the current value.
 * For unipolar, draws from the arc start to the current value.
 */
export function describeValuePath(
	normalizedValue: number,
	bipolarNorm: number | null,
	geometry: ArcGeometry,
): string {
	const { startAngle, sweepAngle, radius, cx, cy } = geometry;

	if (bipolarNorm !== null) {
		if (Math.abs(normalizedValue - bipolarNorm) < 0.001) return "";
		const centerAngle = valueToAngle(bipolarNorm, startAngle, sweepAngle);
		const valueAngle = valueToAngle(normalizedValue, startAngle, sweepAngle);
		// Always pass the smaller angle first so arc draws clockwise
		const [from, to] =
			normalizedValue >= bipolarNorm
				? [centerAngle, valueAngle]
				: [valueAngle, centerAngle];
		return describeArc(cx, cy, radius, from, to);
	}

	if (normalizedValue <= 0.001) return "";
	const endAngle = valueToAngle(normalizedValue, startAngle, sweepAngle);
	return describeArc(cx, cy, radius, startAngle, endAngle);
}

/** Cartesian position of the modulation target indicator dot. */
export function modTargetPoint(
	modulatedNorm: number,
	geometry: ArcGeometry,
): { x: number; y: number } {
	const angle = valueToAngle(
		modulatedNorm,
		geometry.startAngle,
		geometry.sweepAngle,
	);
	return polarToCartesian(
		geometry.cx,
		geometry.cy,
		geometry.modOrbitRadius,
		angle,
	);
}

/** Cartesian position of the tip of the indicator line. */
export function indicatorEndPoint(
	normalizedValue: number,
	geometry: ArcGeometry,
): { x: number; y: number } {
	const angle = valueToAngle(
		normalizedValue,
		geometry.startAngle,
		geometry.sweepAngle,
	);
	return polarToCartesian(
		geometry.cx,
		geometry.cy,
		geometry.indicatorRadius,
		angle,
	);
}

/**
 * Determine whether a point in SVG-local coordinates falls within the handle
 * hit area (the indicator tip).
 */
export function isOnHandle(
	svgX: number,
	svgY: number,
	normalizedValue: number,
	geometry: ArcGeometry,
): boolean {
	const tip = indicatorEndPoint(normalizedValue, geometry);
	const dx = svgX - tip.x;
	const dy = svgY - tip.y;
	return (
		dx * dx + dy * dy <= geometry.handleHitRadius * geometry.handleHitRadius
	);
}

/**
 * Convert SVG-local coordinates to a normalized knob value via angular
 * tracking. Values outside the active arc snap to the nearest endpoint.
 */
export function svgPointToNorm(
	x: number,
	y: number,
	geometry: ArcGeometry,
): number {
	const { cx, cy, startAngle, sweepAngle } = geometry;
	const rawAngle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
	// Shift so angle is relative to the arc start, then wrap to [0, 360)
	let relative = (((rawAngle - startAngle) % 360) + 360) % 360;
	// Outside the valid sweep — snap to nearest endpoint
	if (relative > sweepAngle) {
		const halfGap = (360 - sweepAngle) / 2;
		relative = relative - sweepAngle < halfGap ? sweepAngle : 0;
	}
	return clampValue(relative / sweepAngle, 0, 1);
}
