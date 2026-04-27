import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function PhaserModule() {
	const { value: phaserEnabled, setValue: setPhaserEnabled } =
		useSynthParam("phaserEnabled");
	const { value: phaserRate, setValue: setPhaserRate } =
		useSynthParam("phaserRate");
	const { value: phaserDepth, setValue: setPhaserDepth } =
		useSynthParam("phaserDepth");
	const { value: phaserFeedback, setValue: setPhaserFeedback } =
		useSynthParam("phaserFeedback");
	const { value: phaserMix, setValue: setPhaserMix } =
		useSynthParam("phaserMix");

	return (
		<ModuleFrame
			title="Phaser"
			color="#a78bfa"
			meta="4-Stage"
			enabled={phaserEnabled}
			onToggle={() => setPhaserEnabled(!phaserEnabled)}
		>
			<ControlKnob
				value={phaserRate}
				onChange={setPhaserRate}
				min={0.1}
				max={10}
				defaultValue={0.5}
				size={52}
				color="#a78bfa"
				label="Rate"
				tooltip="Sets phaser sweep speed."
				valueFormatter={(value) => `${value.toFixed(1)}Hz`}
			/>
			<ControlKnob
				value={phaserDepth}
				onChange={setPhaserDepth}
				min={0}
				max={1}
				defaultValue={1.0}
				size={52}
				color="#a78bfa"
				label="Depth"
				tooltip="Sets depth of the phaser notch sweep."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={phaserFeedback}
				onChange={setPhaserFeedback}
				min={-0.9}
				max={0.9}
				defaultValue={0.5}
				size={52}
				color="#a78bfa"
				label="Fdbk"
				tooltip="Feeds phased signal back for stronger notches."
				valueFormatter={(value) =>
					value >= 0
						? `+${Math.round(value * 100)}%`
						: `${Math.round(value * 100)}%`
				}
			/>
			<ControlKnob
				value={phaserMix}
				onChange={setPhaserMix}
				min={0}
				max={1}
				defaultValue={0.5}
				size={52}
				color="#a78bfa"
				label="Mix"
				tooltip="Blends dry signal with phaser output."
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
