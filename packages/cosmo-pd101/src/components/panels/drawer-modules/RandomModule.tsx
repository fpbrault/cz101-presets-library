import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { resolveTargetFromMetadata } from "@/lib/synth/modTargets";

export default function RandomModule() {
	const { value: randomRate, setValue: setRandomRate } =
		useSynthParam("randomRate");
	return (
		<ModuleFrame
			title="Random"
			color="#c2571a"
			enabled
			showLed={false}
			columns={1}
		>
			<ControlKnob
				value={randomRate}
				onChange={setRandomRate}
				min={0.05}
				max={20}
				defaultValue={2}
				size={52}
				color="#c2571a"
				label="Rate"
				modDestination={resolveTargetFromMetadata("random.rate")}
				valueFormatter={(v) => `${v.toFixed(2)}Hz`}
			/>
		</ModuleFrame>
	);
}
