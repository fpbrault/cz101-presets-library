import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function ReverbModule() {
	const { value: reverbEnabled, setValue: setReverbEnabled } =
		useSynthParam("reverbEnabled");
	const { value: reverbSpace, setValue: setReverbSpace } =
		useSynthParam("reverbSpace");
	const { value: reverbPredelay, setValue: setReverbPredelay } =
		useSynthParam("reverbPredelay");
	const { value: reverbDistance, setValue: setReverbDistance } =
		useSynthParam("reverbDistance");
	const { value: reverbCharacter, setValue: setReverbCharacter } =
		useSynthParam("reverbCharacter");
	const { value: reverbMix, setValue: setReverbMix } =
		useSynthParam("reverbMix");
	return (
		<ModuleFrame
			title="Reverb"
			color="#f97316"
			columns={3}
			meta="FDN"
			enabled={reverbEnabled}
			onToggle={() => setReverbEnabled(!reverbEnabled)}
		>
			<ControlKnob
				value={reverbSpace}
				onChange={setReverbSpace}
				min={0}
				max={1}
				defaultValue={0.5}
				size={48}
				color="#f97316"
				label="Space"
				tooltip="Sets the virtual room size for reverb reflections."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={reverbPredelay}
				onChange={setReverbPredelay}
				min={0}
				max={0.1}
				defaultValue={0}
				size={48}
				color="#f97316"
				label="Pre-Dly"
				tooltip="Adds delay before the reverb tail starts."
				valueFormatter={(value) => `${Math.round(value * 1000)}ms`}
			/>
			<ControlKnob
				value={reverbDistance}
				onChange={setReverbDistance}
				min={0}
				max={1}
				defaultValue={0.3}
				size={48}
				color="#f97316"
				label="Dist"
				tooltip="Moves source position deeper into the reverb space."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={reverbCharacter}
				onChange={setReverbCharacter}
				min={0}
				max={1}
				defaultValue={0.65}
				size={48}
				color="#f97316"
				label="Character"
				tooltip="Shapes reverb tone from dark to bright."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={reverbMix}
				onChange={setReverbMix}
				min={0}
				max={1}
				defaultValue={0.3}
				size={48}
				color="#f97316"
				label="Mix"
				tooltip="Blends dry signal with reverb output."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
