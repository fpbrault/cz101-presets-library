import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function RandomModule() {
	const { value: randomRate, setValue: setRandomRate } =
		useSynthParam("randomRate");
	return (
		<ModuleFrame title="Random" color="#c2571a" enabled showLed={false}>
			<div className="flex flex-col gap-2 w-full">
				<ControlKnob
					value={randomRate}
					onChange={setRandomRate}
					min={0.05}
					max={20}
					defaultValue={2}
					size={50}
					color="#c2571a"
					label="Rate"
					valueFormatter={(v) => `${v.toFixed(2)}Hz`}
				/>
			</div>
		</ModuleFrame>
	);
}
