import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
} from "@/components/pdAlgorithms";
import type { DecodedPatch, EnvelopeStep } from "@/lib/midi/czSysexDecoder";
import type {
	EnvStep,
	StepEnvData,
	SynthPresetV1,
} from "@/lib/synth/bindings/synth";
import { DEFAULT_PRESET } from "@/lib/synth/presetStorage";

function convertEnvelope(env: {
	steps: EnvelopeStep[];
	endStep: number;
}): StepEnvData {
	const czSteps = env.steps.slice(0, env.endStep);
	const steps: EnvStep[] = czSteps.map((step) => ({
		level: step.level / 99,
		rate: step.rate,
	}));

	while (steps.length < 8) {
		steps.push({ level: 0, rate: 50 });
	}

	const sustainIndex = czSteps.findIndex((s) => s.sustain);
	const sustainStep = sustainIndex >= 0 ? sustainIndex : env.endStep - 1;

	return {
		steps,
		sustainStep: Math.min(sustainStep, 7),
		stepCount: env.endStep,
		loop: false,
	};
}

function waveformToCzWaveform(
	waveform: DecodedPatch["dco1"]["firstWaveform"],
):
	| "saw"
	| "square"
	| "pulse"
	| "null"
	| "sinePulse"
	| "sawPulse"
	| "multiSine"
	| "pulse2" {
	if (waveform === 1) return "saw";
	if (waveform === 2) return "square";
	if (waveform === 3) return "pulse";
	if (waveform === 4) return "null";
	if (waveform === 5) return "sinePulse";
	if (waveform === 6) return "sawPulse";
	if (waveform === 7) return "multiSine";
	return "pulse2";
}

function calculateDetune(
	direction: "+" | "-",
	fine: number,
	octave: number,
	note: number,
): number {
	const sign = direction === "+" ? 1 : -1;
	const cents = fine * 2 + octave * 1200 + note * 100;
	return sign * cents;
}

export function convertDecodedPatchToSynthPreset(
	decoded: DecodedPatch,
): SynthPresetV1 {
	const preset: SynthPresetV1 = JSON.parse(JSON.stringify(DEFAULT_PRESET));
	const p = preset.params;

	const detune = calculateDetune(
		decoded.detuneDirection,
		decoded.detuneFine,
		decoded.detuneOctave,
		decoded.detuneNote,
	);

	p.line1.algo = "cz101";
	p.line1.algo2 = decoded.dco1.secondWaveform ? "cz101" : null;
	p.line1.cz = {
		slotAWaveform: waveformToCzWaveform(decoded.dco1.firstWaveform),
		slotBWaveform: decoded.dco1.secondWaveform
			? waveformToCzWaveform(decoded.dco1.secondWaveform)
			: "saw",
		window: "off",
	};
	p.line1.octave = decoded.octave;
	p.line1.detuneCents = 0;
	p.line1.dcoEnv = convertEnvelope(decoded.dco1Env);
	p.line1.dcwEnv = convertEnvelope(decoded.dcw1);
	p.line1.dcaEnv = convertEnvelope(decoded.dca1);
	p.line1.keyFollow = decoded.dcw1KeyFollow;

	p.line2.algo = "cz101";
	p.line2.algo2 = decoded.dco2.secondWaveform ? "cz101" : null;
	p.line2.cz = {
		slotAWaveform: waveformToCzWaveform(decoded.dco2.firstWaveform),
		slotBWaveform: decoded.dco2.secondWaveform
			? waveformToCzWaveform(decoded.dco2.secondWaveform)
			: "saw",
		window: "off",
	};
	p.line2.octave = decoded.octave;
	p.line2.detuneCents = detune;
	p.line2.dcoEnv = convertEnvelope(decoded.dco2Env);
	p.line2.dcwEnv = convertEnvelope(decoded.dcw2);
	p.line2.dcaEnv = convertEnvelope(decoded.dca2);
	p.line2.keyFollow = decoded.dcw2KeyFollow;

	if (decoded.dco1.modulation === "ring") p.modMode = "ring";
	else if (decoded.dco1.modulation === "noise") p.modMode = "noise";
	else p.modMode = "normal";

	if (decoded.lineSelect === "L1") {
		p.lineSelect = "L1";
		p.line2.octave = 0;
		p.line2.detuneCents = 0;
		p.line2.dcoEnv = DEFAULT_DCO_ENV;
		p.line2.dcwEnv = DEFAULT_DCW_ENV;
		p.line2.dcaEnv = DEFAULT_DCA_ENV;
		p.line2.keyFollow = 0;
		p.line2.algo = DEFAULT_PRESET.params.line2.algo;
		p.line2.algo2 = DEFAULT_PRESET.params.line2.algo2;
	}

	if (decoded.lineSelect === "L2") {
		p.lineSelect = "L2";
		p.line1.octave = 0;
		p.line1.detuneCents = 0;
		p.line1.dcoEnv = DEFAULT_DCO_ENV;
		p.line1.dcwEnv = DEFAULT_DCW_ENV;
		p.line1.dcaEnv = DEFAULT_DCA_ENV;
		p.line1.keyFollow = 0;
		p.line1.algo = DEFAULT_PRESET.params.line1.algo;
		p.line1.algo2 = DEFAULT_PRESET.params.line1.algo2;
	}

	if (decoded.lineSelect === "L1+1'") {
		p.lineSelect = "L1+L1'";
		p.line1.detuneCents = 0;
	}

	if (decoded.lineSelect === "L1+2'") {
		p.lineSelect = "L1+L2'";
	}

	p.vibrato.enabled = true;
	p.vibrato.waveform = decoded.vibratoWave;
	p.vibrato.rate = decoded.vibratoRate;
	p.vibrato.depth = decoded.vibratoDepth;
	p.vibrato.delay = decoded.vibratoDelay;

	p.polyMode = "poly8";
	p.legato = false;
	p.velocityTarget = "amp";

	p.line1.dcwBase = 1.0;
	p.line2.dcwBase = 1.0;
	p.line1.algoBlend = 0;
	p.line2.algoBlend = 0;
	p.intPmAmount = 0;
	p.intPmRatio = 1;
	p.pmPre = true;
	p.line1.window = "off";
	p.line2.window = "off";
	p.volume = 0.8;
	p.line1.dcaBase = 1;
	p.line2.dcaBase = 1;
	p.line1.dcoDepth = 12;
	p.line2.dcoDepth = 12;
	p.line1.dcwComp = 0.0;
	p.line2.dcwComp = 0.0;
	p.chorus.rate = 0;
	p.chorus.depth = 0;
	p.chorus.mix = 0;
	p.delay.time = 0;
	p.delay.feedback = 0;
	p.delay.mix = 0;
	p.reverb.size = 0;
	p.reverb.mix = 0;
	p.portamento.enabled = false;
	p.portamento.mode = "rate";
	p.portamento.rate = 0;
	p.portamento.time = 0.5;
	p.lfo.enabled = false;
	p.lfo.waveform = "sine";
	p.lfo.rate = 5;
	p.lfo.depth = 0;
	p.lfo.target = "pitch";
	p.filter.enabled = false;
	p.filter.type = "lp";
	p.filter.cutoff = 5000;
	p.filter.resonance = 0;
	p.filter.envAmount = 0;

	return preset;
}
