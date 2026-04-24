import type { UseSynthStateResult } from "@/features/synth/useSynthState";
import type { SynthParams } from "@/lib/synth/bindings/synth";

export type SynthEngineSnapshot = {
	params: SynthParams;
};

type CreateSynthEngineSnapshotParams = {
	synthState: UseSynthStateResult;
	effectivePitchHz: number;
	extPmAmount: number;
};

export function createSynthEngineSnapshot({
	synthState,
	effectivePitchHz,
	extPmAmount,
}: CreateSynthEngineSnapshotParams): SynthEngineSnapshot {
	const { params } = synthState.gatherState();

	return {
		params: {
			...params,
			frequency: effectivePitchHz,
			extPmAmount,
			line1: {
				...params.line1,
				algoControlsA: params.line1.algoControlsA ?? [],
				algoControlsB: params.line1.algoControlsB ?? [],
			},
			line2: {
				...params.line2,
				algoControlsA: params.line2.algoControlsA ?? [],
				algoControlsB: params.line2.algoControlsB ?? [],
			},
			modMatrix: {
				routes: params.modMatrix?.routes ?? [],
			},
		},
	};
}
