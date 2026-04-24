import { useMemo } from "react";
import { useSynthEngineController } from "@/features/synth/engine/synthEngineAdapter";
import type { SynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
import { createWorkletSynthEngineAdapter } from "@/features/synth/engine/workletSynthEngineAdapter";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";
import type { EngineParams } from "./useAudioEngine";

type UseSynthParamsToWorkletParams = {
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	paramsRef: React.MutableRefObject<EngineParams>;
	effectivePitchHz: number;
	extPmAmount: number;
	synthState: UseSynthStateResult;
};

export function useSynthParamsToWorklet({
	workletNodeRef,
	paramsRef,
	effectivePitchHz,
	extPmAmount,
	synthState,
}: UseSynthParamsToWorkletParams) {
	const adapter = useMemo(
		() => createWorkletSynthEngineAdapter({ workletNodeRef, paramsRef }),
		[workletNodeRef, paramsRef],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: synthState.gatherState is a stable proxy — it changes identity whenever any individual state value changes
	const snapshot = useMemo(
		(): SynthEngineSnapshot => ({
			...synthState,
			effectivePitchHz,
			extPmAmount,
		}),
		[synthState.gatherState, effectivePitchHz, extPmAmount],
	);

	useSynthEngineController({ adapter, snapshot });
}
