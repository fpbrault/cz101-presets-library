import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	type PdAlgo,
	type StepEnvData,
} from "@/components/pdAlgorithms";
import type { DecodedPatch, EnvelopeStep } from "@/lib/midi/czSysexDecoder";
import {
	DEFAULT_PRESET,
	type SynthPresetData,
} from "@/lib/synth/presetStorage";

type StepEnvStep = { level: number; rate: number };

function waveformToPdAlgo(
	waveform: DecodedPatch["dco1"]["firstWaveform"],
): PdAlgo {
	return waveform;
}

function applyLineSettings(
	preset: SynthPresetData,
	line: 1 | 2,
	decoded: {
		octave: number;
		detune: number;
		dco: DecodedPatch["dco1"];
		dcoEnv: DecodedPatch["dco1Env"];
		dcwEnv: DecodedPatch["dcw1"];
		dcaEnv: DecodedPatch["dca1"];
		dcwKeyFollow: number;
		dcaKeyFollow: number;
	},
): void {
	if (line === 1) {
		preset.line1Octave = decoded.octave;
		preset.line1Detune = decoded.detune;
		preset.line1DcoEnv = convertEnvelope(decoded.dcoEnv, DEFAULT_DCO_ENV);
		preset.line1DcwEnv = convertEnvelope(decoded.dcwEnv, DEFAULT_DCW_ENV);
		preset.line1DcaEnv = convertEnvelope(decoded.dcaEnv, DEFAULT_DCA_ENV);
		preset.line1DcwKeyFollow = decoded.dcwKeyFollow;
		preset.line1DcaKeyFollow = decoded.dcaKeyFollow;
		preset.warpAAlgo = waveformToPdAlgo(decoded.dco.firstWaveform);
		preset.algo2A = decoded.dco.secondWaveform
			? waveformToPdAlgo(decoded.dco.secondWaveform)
			: null;
		// Set global modMode from line1 modulation (line1 is primary)
		if (decoded.dco.modulation === "ring") preset.modMode = "ring";
		else if (decoded.dco.modulation === "noise") preset.modMode = "noise";
		else preset.modMode = "normal";
		return;
	}

	preset.line2Octave = decoded.octave;
	preset.line2Detune = decoded.detune;
	preset.line2DcoEnv = convertEnvelope(decoded.dcoEnv, DEFAULT_DCO_ENV);
	preset.line2DcwEnv = convertEnvelope(decoded.dcwEnv, DEFAULT_DCW_ENV);
	preset.line2DcaEnv = convertEnvelope(decoded.dcaEnv, DEFAULT_DCA_ENV);
	preset.line2DcwKeyFollow = decoded.dcwKeyFollow;
	preset.line2DcaKeyFollow = decoded.dcaKeyFollow;
	preset.warpBAlgo = waveformToPdAlgo(decoded.dco.firstWaveform);
	preset.algo2B = decoded.dco.secondWaveform
		? waveformToPdAlgo(decoded.dco.secondWaveform)
		: null;
	// Line 2 modulation: only override modMode if line 1 left it as "normal"
	if (preset.modMode === "normal") {
		if (decoded.dco.modulation === "ring") preset.modMode = "ring";
		else if (decoded.dco.modulation === "noise") preset.modMode = "noise";
	}
}

function convertEnvelope(
	env: { steps: EnvelopeStep[]; endStep: number },
	_defaultEnv: StepEnvData,
): StepEnvData {
	const czSteps = env.steps.slice(0, env.endStep);
	const steps: StepEnvStep[] = czSteps.map((step) => ({
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
): SynthPresetData {
	const preset: SynthPresetData = { ...DEFAULT_PRESET };

	const detune1 = calculateDetune(
		decoded.detuneDirection,
		decoded.detuneFine,
		decoded.detuneOctave,
		decoded.detuneNote,
	);
	const detune2 = detune1;

	applyLineSettings(preset, 1, {
		octave: decoded.octave,
		detune: 0,
		dco: decoded.dco1,
		dcoEnv: decoded.dco1Env,
		dcwEnv: decoded.dcw1,
		dcaEnv: decoded.dca1,
		dcwKeyFollow: decoded.dcw1KeyFollow,
		dcaKeyFollow: decoded.dca1KeyFollow,
	});
	applyLineSettings(preset, 2, {
		octave: decoded.octave,
		detune: detune2,
		dco: decoded.dco2,
		dcoEnv: decoded.dco2Env,
		dcwEnv: decoded.dcw2,
		dcaEnv: decoded.dca2,
		dcwKeyFollow: decoded.dcw2KeyFollow,
		dcaKeyFollow: decoded.dca2KeyFollow,
	});

	switch (decoded.lineSelect) {
		case "L1":
			preset.lineSelect = "L1";
			preset.line2Octave = 0;
			preset.line2Detune = 0;
			preset.line2DcoEnv = DEFAULT_DCO_ENV;
			preset.line2DcwEnv = DEFAULT_DCW_ENV;
			preset.line2DcaEnv = DEFAULT_DCA_ENV;
			preset.line2DcaKeyFollow = 0;
			preset.line2DcwKeyFollow = 0;
			preset.warpBAlgo = DEFAULT_PRESET.warpBAlgo;
			preset.algo2B = DEFAULT_PRESET.algo2B;
			break;
		case "L2":
			preset.lineSelect = "L2";
			preset.line1Octave = 0;
			preset.line1Detune = 0;
			preset.line1DcoEnv = DEFAULT_DCO_ENV;
			preset.line1DcwEnv = DEFAULT_DCW_ENV;
			preset.line1DcaEnv = DEFAULT_DCA_ENV;
			preset.line1DcaKeyFollow = 0;
			preset.line1DcwKeyFollow = 0;
			preset.warpAAlgo = DEFAULT_PRESET.warpAAlgo;
			preset.algo2A = DEFAULT_PRESET.algo2A;
			break;
		case "L1+1'":
			preset.lineSelect = "L1+L1'";
			preset.line1Detune = 0;
			break;
		case "L1+2'":
			preset.lineSelect = "L1+L2'";
	}

	preset.vibratoEnabled = true;
	preset.vibratoWave = decoded.vibratoWave;
	preset.vibratoRate = decoded.vibratoRate;
	preset.vibratoDepth = decoded.vibratoDepth;
	preset.vibratoDelay = decoded.vibratoDelay;

	preset.polyMode = "poly8";
	preset.legato = false;
	preset.velocityTarget = "amp";

	// Set defaults for parameters not stored in CZ-101 SysEx
	preset.warpAAmount = 0.5;
	preset.warpBAmount = 0.5;
	preset.algoBlendA = 0;
	preset.algoBlendB = 0;
	preset.intPmAmount = 0;
	preset.intPmRatio = 1;
	preset.pmPre = true;
	preset.windowType = "off";
	preset.volume = 0.8;
	preset.line1Level = 1;
	preset.line2Level = 1;
	preset.line1DcoDepth = 12;
	preset.line2DcoDepth = 12;
	preset.line1DcwComp = 0.5;
	preset.line2DcwComp = 0.5;
	preset.chorusRate = 0;
	preset.chorusDepth = 0;
	preset.chorusMix = 0;
	preset.delayTime = 0;
	preset.delayFeedback = 0;
	preset.delayMix = 0;
	preset.reverbSize = 0;
	preset.reverbMix = 0;
	preset.portamentoEnabled = false;
	preset.portamentoMode = "rate";
	preset.portamentoRate = 0;
	preset.portamentoTime = 0.5;
	preset.lfoEnabled = false;
	preset.lfoWaveform = "sine";
	preset.lfoRate = 5;
	preset.lfoDepth = 0;
	preset.lfoTarget = "pitch";
	preset.filterEnabled = false;
	preset.filterType = "lp";
	preset.filterCutoff = 5000;
	preset.filterResonance = 0;
	preset.filterEnvAmount = 0;

	return preset;
}
