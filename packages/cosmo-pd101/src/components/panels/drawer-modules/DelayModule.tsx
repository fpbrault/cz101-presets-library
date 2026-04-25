import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function DelayModule() {
	const { value: delayEnabled, setValue: setDelayEnabled } =
		useSynthParam("delayEnabled");
	const { value: delayTime, setValue: setDelayTime } =
		useSynthParam("delayTime");
	const { value: delayFeedback, setValue: setDelayFeedback } =
		useSynthParam("delayFeedback");
	const { value: delayMix, setValue: setDelayMix } = useSynthParam("delayMix");
	return (
		<ModuleFrame
			title="Delay"
			color="#fbbf24"
			meta="Digital"
			enabled={delayEnabled}
			onToggle={() => setDelayEnabled(!delayEnabled)}
		>
			<div className="grid grid-cols-3 gap-2">
				<ControlKnob
					value={delayTime}
					onChange={setDelayTime}
					min={0.01}
					max={1}
					defaultValue={0.3}
					size={96}
					color="#fbbf24"
					label="Time"
					valueFormatter={(value) => `${Math.round(value * 1000)}ms`}
				/>
				<ControlKnob
					value={delayFeedback}
					onChange={setDelayFeedback}
					min={0}
					max={0.9}
					defaultValue={0.3}
					size={96}
					color="#fbbf24"
					label="Fdbk"
					valueFormatter={(value) => `${Math.round(value * 100)}%`}
				/>
				<ControlKnob
					value={delayMix}
					onChange={setDelayMix}
					min={0}
					max={1}
					defaultValue={0.25}
					size={96}
					color="#fbbf24"
					label="Mix"
					valueFormatter={(value) => `${Math.round(value * 100)}%`}
				/>
			</div>
		</ModuleFrame>
	);
}
