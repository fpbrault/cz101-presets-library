import type { ModDestination } from "@/lib/synth/bindings/synth";
import {
	isRegisteredModDestination,
	type ModTargetContext,
	type ModTargetKey,
	resolveTargetFromMetadata,
} from "@/lib/synth/modTargets";

export type LineScopedModTarget =
	| "dcwBase"
	| "dcaBase"
	| "algoBlend"
	| "detune"
	| "octave";

export type AlgoParamSlotTarget =
	| "algoParam1"
	| "algoParam2"
	| "algoParam3"
	| "algoParam4"
	| "algoParam5"
	| "algoParam6"
	| "algoParam7"
	| "algoParam8";

export type ModTarget =
	| ModDestination
	| LineScopedModTarget
	| AlgoParamSlotTarget
	| ModTargetKey;

export function algoParamTargetFromSlot(
	slot: number,
): AlgoParamSlotTarget | undefined {
	if (!Number.isInteger(slot) || slot < 1 || slot > 8) {
		return undefined;
	}
	return `algoParam${slot}` as AlgoParamSlotTarget;
}

export function resolveModDestination(
	target: ModTarget | undefined,
	options?: { lineIndex?: 1 | 2 } & ModTargetContext,
): ModDestination | undefined {
	if (!target) {
		return undefined;
	}

	if (isRegisteredModDestination(target as ModDestination)) {
		return target as ModDestination;
	}

	const metadataDestination = resolveTargetFromMetadata(
		target as ModTargetKey,
		options,
	);
	if (metadataDestination) {
		return metadataDestination;
	}

	const linePrefix = options?.lineIndex === 2 ? "line2" : "line1";

	switch (target) {
		case "dcwBase":
			return `${linePrefix}DcwBase` as ModDestination;
		case "dcaBase":
			return `${linePrefix}DcaBase` as ModDestination;
		case "algoBlend":
			return `${linePrefix}AlgoBlend` as ModDestination;
		case "detune":
			return `${linePrefix}Detune` as ModDestination;
		case "octave":
			return `${linePrefix}Octave` as ModDestination;
		case "algoParam1":
			return `${linePrefix}AlgoParam1` as ModDestination;
		case "algoParam2":
			return `${linePrefix}AlgoParam2` as ModDestination;
		case "algoParam3":
			return `${linePrefix}AlgoParam3` as ModDestination;
		case "algoParam4":
			return `${linePrefix}AlgoParam4` as ModDestination;
		case "algoParam5":
			return `${linePrefix}AlgoParam5` as ModDestination;
		case "algoParam6":
			return `${linePrefix}AlgoParam6` as ModDestination;
		case "algoParam7":
			return `${linePrefix}AlgoParam7` as ModDestination;
		case "algoParam8":
			return `${linePrefix}AlgoParam8` as ModDestination;
		default:
			return undefined;
	}
}
