import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function ChorusModule() {
	const { value: chorusEnabled, setValue: setChorusEnabled } =
		useSynthParam("chorusEnabled");
	const { value: chorusRate, setValue: setChorusRate } =
		useSynthParam("chorusRate");
	const { value: chorusDepth, setValue: setChorusDepth } =
		useSynthParam("chorusDepth");
	const { value: chorusMix, setValue: setChorusMix } =
		useSynthParam("chorusMix");

	return (
		<ModuleFrame
			title="Chorus"
			color="#818cf8"
			columns={3}
			meta="Stereo"
			enabled={chorusEnabled}
			onToggle={() => setChorusEnabled(!chorusEnabled)}
		>
			<ControlKnob
				value={chorusRate}
				onChange={setChorusRate}
				min={0.1}
				max={5}
				defaultValue={1.0}
				size={52}
				color="#818cf8"
				label="Rate"
				tooltip="Sets chorus modulation speed."
				valueFormatter={(value) => value.toFixed(1)}
			/>
			<ControlKnob
				value={chorusDepth}
				onChange={setChorusDepth}
				min={0}
				max={3}
				defaultValue={1.5}
				size={52}
				color="#818cf8"
				label="Depth"
				tooltip="Sets intensity of chorus pitch modulation."
				valueFormatter={(value) => `${Math.round((value / 3) * 100)}%`}
			/>
			<ControlKnob
				value={chorusMix}
				onChange={setChorusMix}
				min={0}
				max={1}
				defaultValue={0.5}
				size={52}
				color="#818cf8"
				label="Mix"
				tooltip="Blends dry signal with chorus effect."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
