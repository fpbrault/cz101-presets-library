import type { ModDestination } from "@/lib/synth/bindings/synth";

const DIRECT_DESTINATIONS: ReadonlySet<ModDestination> = new Set([
	"volume",
	"pitch",
	"intPmAmount",
	"line1DcwBase",
	"line1DcaBase",
	"line1DcoDepth",
	"line1AlgoBlend",
	"line1DcwComp",
	"line1Detune",
	"line1Octave",
	"line1AlgoParam1",
	"line1AlgoParam2",
	"line1AlgoParam3",
	"line1AlgoParam4",
	"line1AlgoParam5",
	"line1AlgoParam6",
	"line1AlgoParam7",
	"line1AlgoParam8",
	"line2DcwBase",
	"line2DcaBase",
	"line2DcoDepth",
	"line2AlgoBlend",
	"line2DcwComp",
	"line2Detune",
	"line2Octave",
	"line2AlgoParam1",
	"line2AlgoParam2",
	"line2AlgoParam3",
	"line2AlgoParam4",
	"line2AlgoParam5",
	"line2AlgoParam6",
	"line2AlgoParam7",
	"line2AlgoParam8",
	"filterCutoff",
	"filterResonance",
	"filterEnvAmount",
	"chorusMix",
	"delayMix",
	"reverbMix",
	"vibratoDepth",
	"lfoDepth",
	"lfoRate",
]);

export type LineScopedModTarget =
	| "dcwBase"
	| "dcaBase"
	| "dcoDepth"
	| "algoBlend"
	| "dcwComp"
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

export type ModTarget = ModDestination | LineScopedModTarget | AlgoParamSlotTarget;

export function algoParamTargetFromSlot(slot: number): AlgoParamSlotTarget | undefined {
	if (!Number.isInteger(slot) || slot < 1 || slot > 8) {
		return undefined;
	}
	return `algoParam${slot}` as AlgoParamSlotTarget;
}

export function resolveModDestination(
	target: ModTarget | undefined,
	options?: { lineIndex?: 1 | 2 },
): ModDestination | undefined {
	if (!target) {
		return undefined;
	}

	if (DIRECT_DESTINATIONS.has(target as ModDestination)) {
		return target as ModDestination;
	}

	const linePrefix = options?.lineIndex === 2 ? "line2" : "line1";

	switch (target) {
		case "dcwBase":
			return `${linePrefix}DcwBase` as ModDestination;
		case "dcaBase":
			return `${linePrefix}DcaBase` as ModDestination;
		case "dcoDepth":
			return `${linePrefix}DcoDepth` as ModDestination;
		case "algoBlend":
			return `${linePrefix}AlgoBlend` as ModDestination;
		case "dcwComp":
			return `${linePrefix}DcwComp` as ModDestination;
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