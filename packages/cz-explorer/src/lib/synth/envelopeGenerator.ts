/**
 * CZ-101 Envelope Generator
 *
 * Implements an 8-step envelope state machine with exponential rate mapping.
 * Each envelope has Attack → Sustain → Release → Off phases.
 */

export type EnvelopePhase = "attack" | "sustain" | "release" | "off";

export interface EnvelopeStep {
	rate: number;
	level: number;
	falling: boolean;
	sustain: boolean;
}

export interface EnvelopeParams {
	steps: EnvelopeStep[];
	endStep: number;
}

export interface EnvelopeState {
	phase: EnvelopePhase;
	currentLevel: number;
	currentStep: number;
	stepOffsetMs: number;
	releaseStartLevel: number;
	releaseOffsetMs: number;
}

export function createEnvelopeState(): EnvelopeState {
	return {
		phase: "off",
		currentLevel: 0,
		currentStep: 0,
		stepOffsetMs: 0,
		releaseStartLevel: 0,
		releaseOffsetMs: 0,
	};
}

export function rateToDurationMs(rate: number): number {
	return 10000 * 0.5 ** ((99 - rate) / 25);
}

export function advanceEnvelope(
	state: EnvelopeState,
	params: EnvelopeParams,
	deltaMs: number,
): number {
	if (state.phase === "off") {
		return 0;
	}

	if (state.phase === "release") {
		state.releaseOffsetMs += deltaMs;
		const releaseDuration = 200;
		if (state.releaseOffsetMs >= releaseDuration) {
			state.phase = "off";
			state.currentLevel = 0;
			return 0;
		}
		const t = state.releaseOffsetMs / releaseDuration;
		state.currentLevel = state.releaseStartLevel * (1 - t);
		return state.currentLevel;
	}

	if (state.phase === "sustain") {
		return state.currentLevel;
	}

	let remainingMs = deltaMs;
	let currentLevel = state.currentLevel;
	let currentStep = state.currentStep;
	let stepOffsetMs = state.stepOffsetMs;

	while (remainingMs > 0 && state.phase === "attack") {
		if (currentStep >= params.endStep) {
			state.phase = "sustain";
			state.currentLevel = currentLevel;
			state.currentStep = currentStep;
			state.stepOffsetMs = 0;
			return currentLevel;
		}

		const step = params.steps[currentStep];
		if (step == null) {
			state.phase = "sustain";
			return currentLevel;
		}

		const stepDurationMs = rateToDurationMs(step.rate);

		if (step.sustain && stepOffsetMs === 0) {
			state.phase = "sustain";
			state.currentLevel = currentLevel;
			state.currentStep = currentStep;
			state.stepOffsetMs = 0;
			return currentLevel;
		}

		const elapsedInStep = stepOffsetMs + remainingMs;

		if (elapsedInStep < stepDurationMs) {
			const targetLevel = step.level / 99;
			const fromLevel = currentLevel;
			const progress = elapsedInStep / stepDurationMs;
			currentLevel = fromLevel + (targetLevel - fromLevel) * progress;
			state.currentLevel = currentLevel;
			state.currentStep = currentStep;
			state.stepOffsetMs = elapsedInStep;
			return currentLevel;
		}

		const nextTargetLevel = params.steps[currentStep + 1]?.level ?? step.level;
		currentLevel = nextTargetLevel / 99;
		remainingMs = elapsedInStep - stepDurationMs;
		currentStep++;
		stepOffsetMs = 0;
	}

	state.currentLevel = currentLevel;
	state.currentStep = currentStep;
	state.stepOffsetMs = stepOffsetMs;
	return state.currentLevel;
}

export function envelopeNoteOn(
	state: EnvelopeState,
	_params: EnvelopeParams,
): void {
	state.phase = "attack";
	state.currentLevel = 0;
	state.currentStep = 0;
	state.stepOffsetMs = 0;
	state.releaseStartLevel = 0;
	state.releaseOffsetMs = 0;
}

export function envelopeNoteOff(state: EnvelopeState): void {
	if (state.phase !== "off") {
		state.releaseStartLevel = state.currentLevel;
		state.releaseOffsetMs = 0;
		state.phase = "release";
	}
}
