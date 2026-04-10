/**
 * CZ-101 Phase Distortion Oscillator
 *
 * Implements the 8 basic waveform transfer functions and combination wave logic.
 * Each transfer function maps linear phase φ ∈ [0,1) to a distorted phase,
 * which is then passed through sin(2π · f(φ)) to produce the waveform sample.
 *
 * The distortion depth parameter (controlled by the DCW envelope, 0 to 1)
 * interpolates between a pure sine and the fully distorted waveform:
 *   output = sin(2π · lerp(φ, f(φ), depth))
 */

export type WaveformId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TWO_PI = 2 * Math.PI;

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Waveform 1: Saw (actually a half-sine shape)
 * Linear phase — produces a sine ramp that looks sawtooth-ish
 */
function sawTransfer(phi: number): number {
	return phi;
}

/**
 * Waveform 2: Square
 * Step function — phase stays at 0 for first half, jumps to 1 for second half
 */
function squareTransfer(phi: number): number {
	return phi < 0.5 ? 0 : 1;
}

/**
 * Waveform 3: Pulse (centered)
 * Pulse centered in the period: high from 0.25 to 0.75
 */
function pulseTransfer(phi: number): number {
	return phi >= 0.25 && phi < 0.75 ? 1 : 0;
}

/**
 * Waveform 4: Null (percussive attack then silence)
 * Very short spike at the start of the period, then silence
 */
function nullTransfer(phi: number): number {
	if (phi < 0.01) return phi / 0.01;
	return 0;
}

/**
 * Waveform 5: Sine-Pulse (pulse at start of period)
 * Sharp pulse at the beginning, then silence
 */
function sinePulseTransfer(phi: number): number {
	if (phi < 0.15) return phi / 0.15;
	return 0;
}

/**
 * Waveform 6: Saw-Pulse
 * Sharp pulse at start, then saw continues
 */
function sawPulseTransfer(phi: number): number {
	if (phi < 0.15) return phi / 0.15;
	return phi;
}

/**
 * Waveform 7: Multi-Sine (resonance)
 * Produces a barrage of sine waves within each period.
 * The resonance factor k controls peak count.
 */
function multiSineTransfer(phi: number, k = 3): number {
	return phi + k * Math.sin(TWO_PI * phi) * Math.sin(Math.PI * phi);
}

/**
 * Waveform 8: Pulse2 (double-frequency pulse)
 * Pulses at the start and midpoint of the period
 */
function pulse2Transfer(phi: number): number {
	return phi < 0.15 || (phi >= 0.5 && phi < 0.65) ? 1 : 0;
}

const TRANSFER_FUNCTIONS: Record<WaveformId, (phi: number) => number> = {
	1: sawTransfer,
	2: squareTransfer,
	3: pulseTransfer,
	4: nullTransfer,
	5: sinePulseTransfer,
	6: sawPulseTransfer,
	7: multiSineTransfer,
	8: pulse2Transfer,
};

/**
 * Apply a waveform transfer function to phase.
 */
export function applyTransfer(waveformId: WaveformId, phi: number): number {
	const fn = TRANSFER_FUNCTIONS[waveformId];
	if (!fn) return phi;
	return fn(phi);
}

/**
 * Render a single sample from a PD oscillator.
 *
 * @param phi         - Current phase [0, 1)
 * @param waveformId  - Which waveform transfer function to use
 * @param depth       - PD depth [0, 1]: 0 = pure sine, 1 = full waveform
 * @param cycleCount  - Running cycle counter (for combination waves)
 * @param waveform2   - Second waveform (if combination wave is active)
 */
export function renderPdSample(
	phi: number,
	waveformId: WaveformId,
	depth: number,
	cycleCount: number,
	waveform2: WaveformId | null,
): number {
	const useWave: WaveformId =
		waveform2 !== null && cycleCount % 2 === 1 ? waveform2 : waveformId;
	const distorted = applyTransfer(useWave, phi);
	const lerped =
		depth === 0 ? phi : depth === 1 ? distorted : lerp(phi, distorted, depth);
	return Math.sin(TWO_PI * lerped);
}

/**
 * Phase distortion oscillator state for one line.
 */
export interface PdOscillatorState {
	phi: number;
	cycleCount: number;
}

export function createPdOscillator(): PdOscillatorState {
	return { phi: 0, cycleCount: 0 };
}

/**
 * Advance phase by one sample. Returns true if a new cycle started.
 */
export function advancePhase(
	state: PdOscillatorState,
	frequency: number,
	sampleRate: number,
): boolean {
	state.phi += frequency / sampleRate;
	let newCycle = false;
	while (state.phi >= 1) {
		state.phi -= 1;
		state.cycleCount++;
		newCycle = true;
	}
	return newCycle;
}
