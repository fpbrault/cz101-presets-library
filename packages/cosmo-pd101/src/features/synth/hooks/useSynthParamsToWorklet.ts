import { useEffect, useMemo } from "react";
import { SynthEngineController } from "@/features/synth/engine/synthEngineAdapter";
import { createSynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
import { createWorkletSynthEngineAdapter } from "@/features/synth/engine/workletSynthEngineAdapter";
import { useSynthStore } from "@/features/synth/synthStore";
import type { SynthPresetV1 } from "@/lib/synth/bindings/synth";
import type { EngineParams } from "./useAudioEngine";

type UseSynthParamsToWorkletParams = {
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	paramsRef: React.MutableRefObject<EngineParams>;
	effectivePitchHz: number;
	extPmAmount: number;
	gatherState: () => SynthPresetV1;
};

export function useSynthParamsToWorklet({
	workletNodeRef,
	paramsRef,
	effectivePitchHz,
	extPmAmount,
	gatherState,
}: UseSynthParamsToWorkletParams) {
	const adapter = useMemo(
		() => createWorkletSynthEngineAdapter({ workletNodeRef, paramsRef }),
		[workletNodeRef, paramsRef],
	);

	// Lifecycle: connect / dispose
	useEffect(() => {
		const controller = new SynthEngineController(adapter);
		controller.connect();
		return () => controller.dispose();
	}, [adapter]);

	// Outbound sync: subscribe to Zustand so every state change syncs to
	// the worklet. Also re-run when effectivePitchHz / extPmAmount change.
	useEffect(() => {
		const sync = () => {
			const snapshot = createSynthEngineSnapshot({
				gatherState,
				effectivePitchHz,
				extPmAmount,
			});
			adapter.sync(snapshot);
		};
		sync();
		return useSynthStore.subscribe(sync);
	}, [adapter, gatherState, effectivePitchHz, extPmAmount]);
}
