import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function ModEnveloppeModule() {
	const { value: modEnvAttack, setValue: setModEnvAttack } =
		useSynthParam("modEnvAttack");
	const { value: modEnvDecay, setValue: setModEnvDecay } =
		useSynthParam("modEnvDecay");
	const { value: modEnvSustain, setValue: setModEnvSustain } =
		useSynthParam("modEnvSustain");
	const { value: modEnvRelease, setValue: setModEnvRelease } =
		useSynthParam("modEnvRelease");

	return (
		<ModuleFrame title="Mod Env" color="#c24587" enabled showLed={false}>
			<ControlKnob
				value={modEnvAttack}
				onChange={setModEnvAttack}
				min={0}
				max={10}
				defaultValue={0.01}
				size={52}
				color="#c24587"
				label="Atk"
				valueFormatter={(v) => `${v.toFixed(2)}s`}
			/>
			<ControlKnob
				value={modEnvDecay}
				onChange={setModEnvDecay}
				min={0}
				max={10}
				defaultValue={0.1}
				size={52}
				color="#c24587"
				label="Dec"
				valueFormatter={(v) => `${v.toFixed(2)}s`}
			/>
			<ControlKnob
				value={modEnvSustain}
				onChange={setModEnvSustain}
				min={0}
				max={1}
				defaultValue={0.5}
				size={52}
				color="#c24587"
				label="Sus"
				valueFormatter={(v) => `${Math.round(v * 100)}%`}
			/>
			<ControlKnob
				value={modEnvRelease}
				onChange={setModEnvRelease}
				min={0}
				max={10}
				defaultValue={0.2}
				size={52}
				color="#c24587"
				label="Rel"
				valueFormatter={(v) => `${v.toFixed(2)}s`}
			/>
		</ModuleFrame>
	);
}
