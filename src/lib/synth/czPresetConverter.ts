import {
	DEFAULT_DCA_ENV,
	DEFAULT_DCO_ENV,
	DEFAULT_DCW_ENV,
	type StepEnvData,
} from "@/components/pdAlgorithms";
import type { DecodedPatch, EnvelopeStep } from "@/lib/midi/czSysexDecoder";
import {
	DEFAULT_PRESET,
	type SynthPresetData,
} from "@/lib/synth/presetStorage";

type StepEnvStep = { level: number; rate: number };

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

	switch (decoded.lineSelect) {
		case "L1":
			preset.lineSelect = "L1";
			preset.line1Octave = decoded.octave;
			preset.line2Octave = 0;
			preset.line1Detune = detune1;
			preset.line2Detune = 0;
			preset.line1RingMod = decoded.dco1.modulation === "ring";
			preset.line1Noise = decoded.dco1.modulation === "noise";
			preset.line2RingMod = false;
			preset.line2Noise = false;
			preset.line1DcoEnv = convertEnvelope(decoded.dco1Env, DEFAULT_DCO_ENV);
			preset.line1DcwEnv = convertEnvelope(decoded.dcw1, DEFAULT_DCW_ENV);
			preset.line1DcaEnv = convertEnvelope(decoded.dca1, DEFAULT_DCA_ENV);
			preset.line1DcaKeyFollow = decoded.dca1KeyFollow;
			preset.line1DcwKeyFollow = decoded.dcw1KeyFollow;
			preset.line2DcoEnv = DEFAULT_DCO_ENV;
			preset.line2DcwEnv = DEFAULT_DCW_ENV;
			preset.line2DcaEnv = DEFAULT_DCA_ENV;
			preset.line2DcaKeyFollow = 0;
			preset.line2DcwKeyFollow = 0;
			break;
		case "L2":
			preset.lineSelect = "L2";
			preset.line1Octave = 0;
			preset.line2Octave = decoded.octave;
			preset.line1Detune = 0;
			preset.line2Detune = detune2;
			preset.line1RingMod = false;
			preset.line1Noise = false;
			preset.line2RingMod = decoded.dco2.modulation === "ring";
			preset.line2Noise = decoded.dco2.modulation === "noise";
			preset.line1DcoEnv = DEFAULT_DCO_ENV;
			preset.line1DcwEnv = DEFAULT_DCW_ENV;
			preset.line1DcaEnv = DEFAULT_DCA_ENV;
			preset.line1DcaKeyFollow = 0;
			preset.line1DcwKeyFollow = 0;
			preset.line2DcoEnv = convertEnvelope(decoded.dco2Env, DEFAULT_DCO_ENV);
			preset.line2DcwEnv = convertEnvelope(decoded.dcw2, DEFAULT_DCW_ENV);
			preset.line2DcaEnv = convertEnvelope(decoded.dca2, DEFAULT_DCA_ENV);
			preset.line2DcaKeyFollow = decoded.dca2KeyFollow;
			preset.line2DcwKeyFollow = decoded.dcw2KeyFollow;
			break;
		case "L1+1'":
			preset.lineSelect = "L1+L1'";
			preset.line1Octave = decoded.octave;
			preset.line2Octave = decoded.octave;
			preset.line1Detune = detune1;
			preset.line2Detune = detune2;
			preset.line1RingMod = decoded.dco1.modulation === "ring";
			preset.line1Noise = decoded.dco1.modulation === "noise";
			preset.line2RingMod = decoded.dco1.modulation === "ring";
			preset.line2Noise = decoded.dco1.modulation === "noise";
			preset.line1DcoEnv = convertEnvelope(decoded.dco1Env, DEFAULT_DCO_ENV);
			preset.line1DcwEnv = convertEnvelope(decoded.dcw1, DEFAULT_DCW_ENV);
			preset.line1DcaEnv = convertEnvelope(decoded.dca1, DEFAULT_DCA_ENV);
			preset.line1DcaKeyFollow = decoded.dca1KeyFollow;
			preset.line1DcwKeyFollow = decoded.dcw1KeyFollow;
			preset.line2DcoEnv = convertEnvelope(decoded.dco1Env, DEFAULT_DCO_ENV);
			preset.line2DcwEnv = convertEnvelope(decoded.dcw1, DEFAULT_DCW_ENV);
			preset.line2DcaEnv = convertEnvelope(decoded.dca1, DEFAULT_DCA_ENV);
			preset.line2DcaKeyFollow = decoded.dca1KeyFollow;
			preset.line2DcwKeyFollow = decoded.dcw1KeyFollow;
			break;
		case "L1+2'":
			preset.lineSelect = "L1+L2'";
			preset.line1Octave = decoded.octave;
			preset.line2Octave = decoded.octave;
			preset.line1Detune = detune1;
			preset.line2Detune = detune2;
			preset.line1RingMod = decoded.dco1.modulation === "ring";
			preset.line1Noise = decoded.dco1.modulation === "noise";
			preset.line2RingMod = decoded.dco2.modulation === "ring";
			preset.line2Noise = decoded.dco2.modulation === "noise";
			preset.line1DcoEnv = convertEnvelope(decoded.dco1Env, DEFAULT_DCO_ENV);
			preset.line1DcwEnv = convertEnvelope(decoded.dcw1, DEFAULT_DCW_ENV);
			preset.line1DcaEnv = convertEnvelope(decoded.dca1, DEFAULT_DCA_ENV);
			preset.line1DcaKeyFollow = decoded.dca1KeyFollow;
			preset.line1DcwKeyFollow = decoded.dcw1KeyFollow;
			preset.line2DcoEnv = convertEnvelope(decoded.dco2Env, DEFAULT_DCO_ENV);
			preset.line2DcwEnv = convertEnvelope(decoded.dcw2, DEFAULT_DCW_ENV);
			preset.line2DcaEnv = convertEnvelope(decoded.dca2, DEFAULT_DCA_ENV);
			preset.line2DcaKeyFollow = decoded.dca2KeyFollow;
			preset.line2DcwKeyFollow = decoded.dcw2KeyFollow;
			break;
	}

	preset.polyMode = "poly8";
	preset.legato = false;
	preset.velocityTarget = "amp";

	return preset;
}
