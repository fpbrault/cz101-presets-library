import { PD_ALGOS } from "@/components/pdAlgorithms";
import type { SynthEngineAdapter } from "@/features/synth/engine/synthEngineAdapter";
import type { SynthEngineSnapshot } from "@/features/synth/engine/synthEngineSnapshot";
import type { EngineParams } from "@/features/synth/hooks/useAudioEngine";

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
			const algoA =
				PD_ALGOS.find((a) => String(a.value) === String(snapshot.warpAAlgo)) ??
				PD_ALGOS[0];
			const algoB =
				PD_ALGOS.find((a) => String(a.value) === String(snapshot.warpBAlgo)) ??
				PD_ALGOS[0];
			const algo2ADef = snapshot.algo2A
				? (PD_ALGOS.find((a) => String(a.value) === String(snapshot.algo2A)) ??
					null)
				: null;
			const algo2BDef = snapshot.algo2B
				? (PD_ALGOS.find((a) => String(a.value) === String(snapshot.algo2B)) ??
					null)
				: null;

			const params: EngineParams = {
				lineSelect: snapshot.lineSelect,
				modMode: snapshot.modMode,
				octave: 0,
				line1: {
					waveform: algoA.waveform,
					waveform2: algo2ADef?.waveform ?? 1,
					algo2: algo2ADef?.algo ?? null,
					algoBlend: snapshot.algoBlendA,
					window: snapshot.windowType,
					dcaBase: snapshot.line1Level,
					dcwBase: snapshot.warpAAmount,
					dcoDepth: snapshot.line1DcoDepth,
					modulation: 0,
					dcwComp: snapshot.line1DcwComp,
					warpAlgo: algoA.algo,
					detuneCents: snapshot.line1Detune,
					octave: snapshot.line1Octave,
					dcoEnv: snapshot.line1DcoEnv,
					dcwEnv: snapshot.line1DcwEnv,
					dcaEnv: snapshot.line1DcaEnv,
					keyFollow: snapshot.line1DcwKeyFollow,
				},
				line2: {
					waveform: algoB.waveform,
					waveform2: algo2BDef?.waveform ?? 1,
					algo2: algo2BDef?.algo ?? null,
					algoBlend: snapshot.algoBlendB,
					window: snapshot.windowType,
					dcaBase: snapshot.line2Level,
					dcwBase: snapshot.warpBAmount,
					dcoDepth: snapshot.line2DcoDepth,
					modulation: 0,
					dcwComp: snapshot.line2DcwComp,
					warpAlgo: algoB.algo,
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
			};
			paramsRef.current = params;
			if (!workletNodeRef.current) return;
			workletNodeRef.current.port.postMessage({ type: "setParams", params });
		},
	};
}
