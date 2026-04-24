import { useMemo } from "react";
import { useSynthEngineController } from "@/features/synth/engine/synthEngineAdapter";
import { createSynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
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

	const snapshot = useMemo(
		() =>
			createSynthEngineSnapshot({
				synthState,
				effectivePitchHz,
				extPmAmount,
			}),
		[synthState, effectivePitchHz, extPmAmount],
	);

	useSynthEngineController({ adapter, snapshot });
}
