import { describe, expect, it } from "vitest";
import {
	bipolarCenterNorm,
	clampValue,
	DEFAULT_ARC_GEOMETRY,
	denormalizeValue,
	describeArc,
	describeValuePath,
	normalizeValue,
	polarToCartesian,
	snapToStep,
	svgPointToNorm,
	valueToAngle,
} from "./knobGeometry";

describe("clampValue", () => {
	it("returns value within range unchanged", () => {
		expect(clampValue(0.5, 0, 1)).toBe(0.5);
	});
	it("clamps below min", () => {
		expect(clampValue(-1, 0, 1)).toBe(0);
	});
	it("clamps above max", () => {
		expect(clampValue(2, 0, 1)).toBe(1);
	});
	it("handles equal min/max", () => {
		expect(clampValue(5, 3, 3)).toBe(3);
	});
});

describe("normalizeValue / denormalizeValue", () => {
	it("maps min to 0", () => {
		expect(normalizeValue(0, 0, 100)).toBe(0);
	});
	it("maps max to 1", () => {
		expect(normalizeValue(100, 0, 100)).toBe(1);
	});
	it("maps midpoint to 0.5", () => {
		expect(normalizeValue(50, 0, 100)).toBe(0.5);
	});
	it("denormalizes 0 to min", () => {
		expect(denormalizeValue(0, 0, 100)).toBe(0);
	});
	it("denormalizes 1 to max", () => {
		expect(denormalizeValue(1, 0, 100)).toBe(100);
	});
	it("round-trips value", () => {
		const v = 37;
		expect(denormalizeValue(normalizeValue(v, 0, 100), 0, 100)).toBeCloseTo(v);
	});
});

describe("snapToStep", () => {
	it("returns value unchanged when step is undefined", () => {
		expect(snapToStep(0.37, undefined, 0, 1)).toBeCloseTo(0.37);
	});
	it("snaps to nearest step", () => {
		expect(snapToStep(0.34, 0.1, 0, 1)).toBeCloseTo(0.3);
	});
	it("rounds up when closer to next step", () => {
		expect(snapToStep(0.36, 0.1, 0, 1)).toBeCloseTo(0.4);
	});
	it("snaps to step boundary at min", () => {
		expect(snapToStep(0, 0.25, 0, 1)).toBe(0);
	});
	it("snaps to step boundary at max", () => {
		expect(snapToStep(1, 0.25, 0, 1)).toBe(1);
	});
});

describe("bipolarCenterNorm", () => {
	it("returns null when range does not cross 0", () => {
		expect(bipolarCenterNorm(1, 5)).toBeNull();
	});
	it("returns 0.5 for symmetric range", () => {
		expect(bipolarCenterNorm(-1, 1)).toBeCloseTo(0.5);
	});
	it("returns 0.2 for asymmetric range", () => {
		// 0 crossing: -min/(max-min) = 1/5 = 0.2
		expect(bipolarCenterNorm(-1, 4)).toBeCloseTo(0.2);
	});
	it("returns null when min is exactly 0", () => {
		expect(bipolarCenterNorm(0, 1)).toBeNull();
	});
});

describe("polarToCartesian", () => {
	it("maps 0° (right) to correct point", () => {
		const p = polarToCartesian(0, 0, 10, 0);
		expect(p.x).toBeCloseTo(10);
		expect(p.y).toBeCloseTo(0);
	});
	it("maps 90° (down in SVG) to correct point", () => {
		const p = polarToCartesian(0, 0, 10, 90);
		expect(p.x).toBeCloseTo(0);
		expect(p.y).toBeCloseTo(10);
	});
});

describe("valueToAngle", () => {
	it("maps 0 to startAngle", () => {
		expect(valueToAngle(0, -230, 280)).toBe(-230);
	});
	it("maps 1 to startAngle + sweepAngle", () => {
		expect(valueToAngle(1, -230, 280)).toBe(50);
	});
	it("maps 0.5 to midpoint", () => {
		expect(valueToAngle(0.5, -230, 280)).toBe(-90);
	});
});

describe("describeArc", () => {
	it("returns a non-empty path string", () => {
		const path = describeArc(28, 28, 17, -230, 50);
		expect(typeof path).toBe("string");
		expect(path.length).toBeGreaterThan(0);
		expect(path).toContain("A");
	});
	it("handles full arc without NaN", () => {
		const path = describeArc(28, 28, 17, -230, 130);
		expect(path).not.toContain("NaN");
	});
});

describe("describeValuePath", () => {
	it("returns empty string at normalizedValue=0 for unipolar", () => {
		const path = describeValuePath(0, null, DEFAULT_ARC_GEOMETRY);
		expect(path).toBe("");
	});
	it("returns non-empty string for normalizedValue=0.5", () => {
		const path = describeValuePath(0.5, null, DEFAULT_ARC_GEOMETRY);
		expect(path.length).toBeGreaterThan(0);
	});
	it("returns non-empty string at bipolar center (0 in range)", () => {
		// At bipolar center, value == zero crossing, arc has no area but shouldn't crash
		const bipolarNorm = 0.5;
		const path = describeValuePath(
			bipolarNorm,
			bipolarNorm,
			DEFAULT_ARC_GEOMETRY,
		);
		expect(typeof path).toBe("string");
	});
	it("returns arc above center for positive bipolar value", () => {
		const bipolarNorm = 0.5;
		const path = describeValuePath(0.75, bipolarNorm, DEFAULT_ARC_GEOMETRY);
		expect(path.length).toBeGreaterThan(0);
	});
});

describe("svgPointToNorm", () => {
	const g = DEFAULT_ARC_GEOMETRY;
	it("returns 0 for point at start-angle position", () => {
		// Point on the start-angle of the arc
		const startAngleRad = (g.startAngle * Math.PI) / 180;
		const x = g.cx + Math.cos(startAngleRad) * g.radius;
		const y = g.cy + Math.sin(startAngleRad) * g.radius;
		const norm = svgPointToNorm(x, y, g);
		expect(norm).toBeCloseTo(0, 2);
	});
	it("returns 1 for point at end-angle position", () => {
		const endAngle = g.startAngle + g.sweepAngle;
		const endAngleRad = (endAngle * Math.PI) / 180;
		const x = g.cx + Math.cos(endAngleRad) * g.radius;
		const y = g.cy + Math.sin(endAngleRad) * g.radius;
		const norm = svgPointToNorm(x, y, g);
		expect(norm).toBeCloseTo(1, 2);
	});
	it("clamps result to [0, 1]", () => {
		// Point at 90° relative to center (outside arc range)
		const norm = svgPointToNorm(g.cx + 20, g.cy, g);
		expect(norm).toBeGreaterThanOrEqual(0);
		expect(norm).toBeLessThanOrEqual(1);
	});
});
