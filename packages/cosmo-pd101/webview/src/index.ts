export type { AsidePanelTab } from "./components/layout/AsidePanelSwitcher";
export { default as SynthRenderer } from "./components/renderer/SynthRenderer";

export { useAudioEngine } from "./features/synth/hooks/useAudioEngine";
export { useLcdControlReadout } from "./features/synth/hooks/useLcdControlReadout";
export { useNoteHandling } from "./features/synth/hooks/useNoteHandling";
export { useSynthParamsToWorklet } from "./features/synth/hooks/useSynthParamsToWorklet";
export type { LibraryPreset } from "./features/synth/types/libraryPreset";
export { useSynthPresetManager } from "./features/synth/useSynthPresetManager";
export { useSynthState } from "./features/synth/useSynthState";
export type {
	DecodedPatch,
	EnvelopeStep,
	ModulationType,
	WaveformConfig,
	WaveformId,
} from "./lib/midi/czSysexDecoder";
export { decodeCzPatch, WF_NAMES } from "./lib/midi/czSysexDecoder";
export type { StepEnvData } from "./lib/synth/bindings/synth";
export { convertDecodedPatchToSynthPreset } from "./lib/synth/czPresetConverter";
export { DEFAULT_SYNTH_PRESETS } from "./lib/synth/defaultPresets";
export { noteToFreq } from "./lib/synth/pdAlgorithms";
export {
	pdVisualizerWorkletUrl,
	synthBindingsUrl,
	synthWasmUrl,
} from "./lib/synth/pdVisualizerWorkletUrl";
