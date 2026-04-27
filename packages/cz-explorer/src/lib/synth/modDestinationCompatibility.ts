type ModRouteLike = {
	destination: string;
};

// Legacy engines only support this destination set in setParams JSON parsing.
export const LEGACY_MOD_DESTINATIONS = new Set<string>([
	"volume",
	"pitch",
	"intPmAmount",
	"line1DcwBase",
	"line1DcaBase",
	"line1AlgoBlend",
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
	"line2AlgoBlend",
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

export function parseSupportedModDestinationsFromSetParamsError(
	errorMessage: string,
): Set<string> | null {
	if (
		!errorMessage.includes("unknown variant") ||
		!errorMessage.includes("expected one of")
	) {
		return null;
	}

	const supported = new Set<string>();
	for (const match of errorMessage.matchAll(/`([^`]+)`/g)) {
		const destination = match[1]?.trim();
		if (destination) {
			supported.add(destination);
		}
	}

	if (supported.size === 0) {
		return null;
	}

	return supported;
}

export function filterRoutesToSupportedDestinations<
	TRoute extends ModRouteLike,
>(routes: TRoute[], supportedDestinations: Set<string>): TRoute[] {
	if (supportedDestinations.size === 0 || routes.length === 0) {
		return routes;
	}

	return routes.filter((route) => supportedDestinations.has(route.destination));
}
