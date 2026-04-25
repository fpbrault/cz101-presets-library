/**
 * Apply an exponential velocity curve to a normalized velocity [0, 1].
 *
 * curve = 0  → linear (identity)
 * curve > 0  → convex  (more sensitive — high output at low input)
 * curve < 0  → concave (less sensitive — needs hard hit for high output)
 */
export function applyVelocityCurve(velocity: number, curve: number): number {
	if (Math.abs(curve) < 0.001) return velocity;
	const exponent = Math.pow(2, -curve * 2.5);
	return Math.pow(Math.max(0, Math.min(1, velocity)), exponent);
}
