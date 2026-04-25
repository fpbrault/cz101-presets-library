import type { SynthEngineAdapter } from "@/features/synth/engine/synthEngineAdapter";
import type { SynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
import type { EngineParams } from "@/features/synth/hooks/useAudioEngine";
import { resolveAlgoRef } from "@/lib/synth/algoRef";

type CreateWorkletSynthEngineAdapterParams = {
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	paramsRef: React.MutableRefObject<EngineParams>;
};

export function createWorkletSynthEngineAdapter({
	workletNodeRef,
	paramsRef,
}: CreateWorkletSynthEngineAdapterParams): SynthEngineAdapter {
	return {
		sync(snapshot: SynthEngineSnapshot) {
			const baseParams = snapshot.params;
			const algoA = baseParams.line1.algo;
			const algoB = baseParams.line2.algo;
			const resolvedAlgoA = resolveAlgoRef(algoA);
			const resolvedAlgoB = resolveAlgoRef(algoB);
			const line1Window = resolvedAlgoA.windowType ?? baseParams.line1.window;
			const line2Window = resolvedAlgoB.windowType ?? baseParams.line2.window;

			const params: EngineParams = {
				...baseParams,
				line1: {
					...baseParams.line1,
					algo: algoA,
					algo2: baseParams.line1.algo2 ?? null,
					window: line1Window,
				},
				line2: {
					...baseParams.line2,
					algo: algoB,
					algo2: baseParams.line2.algo2 ?? null,
					window: line2Window,
				},
				modMatrix: { routes: baseParams.modMatrix?.routes ?? [] },
			};
			paramsRef.current = params;
			if (!workletNodeRef.current) return;
			// Always pass velocityTarget: "off" so the Rust engine does not apply
			// velocity to amp/dcw directly. Velocity routing is handled via mod matrix.
			workletNodeRef.current.port.postMessage({
				type: "setParams",
				params: { ...params, velocityTarget: "off" },
			});
		},
	};
}
