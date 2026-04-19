import {
	createContext,
	type ReactNode,
	useContext,
	type MutableRefObject,
} from "react";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";

type AudioEngineRefs = {
	audioCtxRef: MutableRefObject<AudioContext | null>;
	gainNodeRef: MutableRefObject<GainNode | null>;
	analyserNodeRef: MutableRefObject<AnalyserNode | null>;
	workletNodeRef: MutableRefObject<AudioWorkletNode | null>;
	paramsRef: MutableRefObject<EngineParams | null>;
};

type EngineParams = {
	lineSelect: string;
	modMode: string;
	octave: number;
	line1: LineParams;
	line2: LineParams;
	intPmAmount: number;
	intPmRatio: number;
	extPmAmount: number;
	pmPre: boolean;
	frequency: number;
	volume: number;
	polyMode: "poly8" | "mono";
	legato: boolean;
	velocityTarget: "amp" | "dcw" | "both" | "off";
	chorus: { enabled: boolean; rate: number; depth: number; mix: number };
	delay: { enabled: boolean; time: number; feedback: number; mix: number };
	reverb: { enabled: boolean; size: number; mix: number };
	vibrato: {
		enabled: boolean;
		waveform: string;
		rate: number;
		depth: number;
		delay: number;
	};
	portamento: { enabled: boolean; mode: string; rate: number; time: number };
	lfo: {
		enabled: boolean;
		waveform: number;
		rate: number;
		depth: number;
		offset: number;
		target: string;
	};
	filter: {
		enabled: boolean;
		type: string;
		cutoff: number;
		resonance: number;
		envAmount: number;
	};
	pitchBendRange: number;
	modWheelVibratoDepth: number;
};

type LineParams = {
	waveform: number;
	waveform2: number;
	algo2: string | null;
	algoBlend: number;
	window: string;
	dcaBase: number;
	dcwBase: number;
	dcoDepth: number;
	modulation: number;
	dcwComp: number;
	warpAlgo: string;
	detuneCents: number;
	octave: number;
	dcoEnv: {
		steps: { level: number; rate: number }[];
		sustainStep: number;
		stepCount: number;
		loop: boolean;
	};
	dcwEnv: {
		steps: { level: number; rate: number }[];
		sustainStep: number;
		stepCount: number;
		loop: boolean;
	};
	dcaEnv: {
		steps: { level: number; rate: number }[];
		sustainStep: number;
		stepCount: number;
		loop: boolean;
	};
	keyFollow: number;
};

type NoteHandlingApi = {
	activeNotes: number[];
	sendNoteOn: (note: number, velocity?: number) => void;
	sendNoteOff: (note: number) => void;
	setSustain: (on: boolean) => void;
	sendPitchBend: (value: number) => void;
	sendModWheel: (value: number) => void;
};

type LcdControlReadout = {
	label: string;
	value: string;
};

type LcdControlReadoutApi = {
	lcdControlReadout: LcdControlReadout | null;
	pushLcdControlReadout: (key: string, value: unknown) => void;
	formatEnvReadout: (
		prev: {
			steps: { level: number; rate: number }[];
			sustainStep: number;
			stepCount: number;
			loop: boolean;
		},
		next: {
			steps: { level: number; rate: number }[];
			sustainStep: number;
			stepCount: number;
			loop: boolean;
		},
	) => string;
};

interface SynthUiContextValue {
	synthState: UseSynthStateResult;
	audioRefs: AudioEngineRefs;
	noteHandling: NoteHandlingApi;
	lcdReadout: LcdControlReadoutApi;
}

const SynthUiContext = createContext<SynthUiContextValue | null>(null);

interface SynthUiProviderProps {
	children: ReactNode;
	synthState: UseSynthStateResult;
	audioRefs: AudioEngineRefs;
	noteHandling: NoteHandlingApi;
	lcdReadout: LcdControlReadoutApi;
}

export function SynthUiProvider({
	children,
	synthState,
	audioRefs,
	noteHandling,
	lcdReadout,
}: SynthUiProviderProps) {
	return (
		<SynthUiContext.Provider
			value={{
				synthState,
				audioRefs,
				noteHandling,
				lcdReadout,
			}}
		>
			{children}
		</SynthUiContext.Provider>
	);
}

export function useSynthUiContext(): SynthUiContextValue {
	const ctx = useContext(SynthUiContext);
	if (!ctx) {
		throw new Error("useSynthUiContext must be used within SynthUiProvider");
	}
	return ctx;
}
