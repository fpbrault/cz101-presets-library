/**
 * CZ-101 Window Functions
 *
 * Window functions apply per-cycle amplitude envelopes to the waveform.
 * Each period of the waveform, the window function modulates amplitude
 * based on the current phase position within that cycle.
 *
 * Window IDs 0-5 are used; 6 and 7 are mapped to DoubleSaw (same as 5).
 */

export type WindowId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Window 0: None — constant amplitude of 1.0
 */
function windowNone(_phi: number): number {
	return 1;
}

/**
 * Window 1: Saw — ramps down from 1.0 to 0.0 over the period
 */
function windowSaw(phi: number): number {
	return 1 - phi;
}

/**
 * Window 2: Triangle — 0.0 → 1.0 → 0.0 (peak at midpoint)
 */
function windowTriangle(phi: number): number {
	return phi < 0.5 ? 2 * phi : 2 * (1 - phi);
}

/**
 * Window 3: Trapezoid — holds at 1.0 for first half, then drops
 */
function windowTrapezoid(phi: number): number {
	return phi < 0.5 ? 1 : 2 * (1 - phi);
}

/**
 * Window 4: Pulse — 1.0 for first half, 0.0 for second half
 */
function windowPulse(phi: number): number {
	return phi < 0.5 ? 1 : 0;
}

/**
 * Window 5/6/7: DoubleSaw — two ramps per period: 0→1→0→1→0
 */
function windowDoubleSaw(phi: number): number {
	return 1 - Math.abs(2 * ((phi * 2) % 1) - 1);
}

const WINDOW_FUNCTIONS: Record<number, (phi: number) => number> = {
	0: windowNone,
	1: windowSaw,
	2: windowTriangle,
	3: windowTrapezoid,
	4: windowPulse,
	5: windowDoubleSaw,
	6: windowDoubleSaw,
	7: windowDoubleSaw,
};

/**
 * Apply a window function to a sample at the given phase.
 */
export function applyWindow(
	windowId: WindowId,
	phi: number,
	sample: number,
): number {
	const fn = WINDOW_FUNCTIONS[windowId];
	if (!fn) return sample;
	return sample * fn(phi);
}

/**
 * Get just the window amplitude at a given phase.
 */
export function windowAmplitude(windowId: WindowId, phi: number): number {
	const fn = WINDOW_FUNCTIONS[windowId];
	if (!fn) return 1;
	return fn(phi);
}
