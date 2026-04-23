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
			const algoA = snapshot.warpAAlgo;
			const algoB = snapshot.warpBAlgo;
			const algo2A = snapshot.algo2A ?? null;
			const algo2B = snapshot.algo2B ?? null;
			const resolvedAlgoA = resolveAlgoRef(algoA);
			const resolvedAlgoB = resolveAlgoRef(algoB);
			const line1Window = resolvedAlgoA.windowType ?? snapshot.windowType;
			const line2Window = resolvedAlgoB.windowType ?? snapshot.windowType;

			const params: EngineParams = {
				lineSelect: snapshot.lineSelect,
				modMode: snapshot.modMode,
				octave: 0,
				line1: {
					algo: algoA,
					algo2: algo2A,
					algoBlend: snapshot.algoBlendA,
					window: line1Window,
					cz: {
						slotAWaveform: snapshot.line1CzSlotAWaveform,
						slotBWaveform: snapshot.line1CzSlotBWaveform,
						window: snapshot.line1CzWindow,
					},
					algoControls: snapshot.line1AlgoControlsA,
					algoControlsA: snapshot.line1AlgoControlsA,
					algoControlsB: snapshot.line1AlgoControlsB,
					dcaBase: snapshot.line1Level,
					dcwBase: snapshot.warpAAmount,
					dcoDepth: snapshot.line1DcoDepth,
					modulation: 0,
					dcwComp: snapshot.line1DcwComp,
					detuneCents: snapshot.line1Detune,
					octave: snapshot.line1Octave,
					dcoEnv: snapshot.line1DcoEnv,
					dcwEnv: snapshot.line1DcwEnv,
					dcaEnv: snapshot.line1DcaEnv,
					keyFollow: snapshot.line1DcwKeyFollow,
				},
				line2: {
					algo: algoB,
					algo2: algo2B,
					algoBlend: snapshot.algoBlendB,
					window: line2Window,
					cz: {
						slotAWaveform: snapshot.line2CzSlotAWaveform,
						slotBWaveform: snapshot.line2CzSlotBWaveform,
						window: snapshot.line2CzWindow,
					},
					algoControls: snapshot.line2AlgoControlsA,
					algoControlsA: snapshot.line2AlgoControlsA,
					algoControlsB: snapshot.line2AlgoControlsB,
					dcaBase: snapshot.line2Level,
					dcwBase: snapshot.warpBAmount,
					dcoDepth: snapshot.line2DcoDepth,
					modulation: 0,
					dcwComp: snapshot.line2DcwComp,
					detuneCents: snapshot.line2Detune,
					octave: snapshot.line2Octave,
					dcoEnv: snapshot.line2DcoEnv,
					dcwEnv: snapshot.line2DcwEnv,
					dcaEnv: snapshot.line2DcaEnv,
					keyFollow: snapshot.line2DcwKeyFollow,
				},
				intPmAmount: snapshot.phaseModEnabled ? snapshot.intPmAmount : 0,
				intPmRatio: snapshot.intPmRatio,
				extPmAmount: snapshot.extPmAmount,
				pmPre: snapshot.pmPre,
				frequency: snapshot.effectivePitchHz,
				volume: snapshot.volume,
				polyMode: snapshot.polyMode,
				legato: snapshot.legato,
				velocityTarget: snapshot.velocityTarget,
				chorus: {
					enabled: snapshot.chorusEnabled,
					rate: snapshot.chorusRate,
					depth: snapshot.chorusDepth,
					mix: snapshot.chorusEnabled ? snapshot.chorusMix : 0,
				},
				delay: {
					enabled: snapshot.delayEnabled,
					time: snapshot.delayTime,
					feedback: snapshot.delayFeedback,
					mix: snapshot.delayEnabled ? snapshot.delayMix : 0,
				},
				reverb: {
					enabled: snapshot.reverbEnabled,
					size: snapshot.reverbSize,
					mix: snapshot.reverbEnabled ? snapshot.reverbMix : 0,
				},
				vibrato: {
					enabled: snapshot.vibratoEnabled,
					waveform: snapshot.vibratoWave,
					rate: snapshot.vibratoRate,
					depth: snapshot.vibratoDepth,
					delay: snapshot.vibratoDelay,
				},
				portamento: {
					enabled: snapshot.portamentoEnabled,
					mode: snapshot.portamentoMode,
					rate: snapshot.portamentoRate,
					time: snapshot.portamentoTime,
				},
				lfo: {
					enabled: snapshot.lfoEnabled,
					waveform: snapshot.lfoWaveform,
					rate: snapshot.lfoRate,
					depth: snapshot.lfoDepth,
					offset: snapshot.lfoOffset,
					target: snapshot.lfoTarget,
				},
				filter: {
					enabled: snapshot.filterEnabled,
					type: snapshot.filterType,
					cutoff: snapshot.filterCutoff,
					resonance: snapshot.filterResonance,
					envAmount: snapshot.filterEnvAmount,
				},
				pitchBendRange: snapshot.pitchBendRange,
				modWheelVibratoDepth: snapshot.modWheelVibratoDepth,
				modMatrix: { routes: snapshot.modMatrix.routes ?? [] },
			};
			paramsRef.current = params;
			if (!workletNodeRef.current) return;
			workletNodeRef.current.port.postMessage({ type: "setParams", params });
		},
	};
}
