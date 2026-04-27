import ControlKnob from "@/components/controls/ControlKnob";
import CompactButton from "@/components/primitives/CompactButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function VibratoModule() {
	const { value: vibratoEnabled, setValue: setVibratoEnabled } =
		useSynthParam("vibratoEnabled");
	const { value: vibratoWave, setValue: setVibratoWave } =
		useSynthParam("vibratoWave");
	const { value: vibratoRate, setValue: setVibratoRate } =
		useSynthParam("vibratoRate");
	const { value: vibratoDepth, setValue: setVibratoDepth } =
		useSynthParam("vibratoDepth");
	const { value: vibratoDelay, setValue: setVibratoDelay } =
		useSynthParam("vibratoDelay");

	return (
		<ModuleFrame
			title="Vibrato"
			color="#307948"
			enabled={vibratoEnabled}
			columns={3}
			onToggle={() => setVibratoEnabled(!vibratoEnabled)}
		>
			<div className="grid grid-cols-4 gap-1 w-full col-span-3">
				{(["sine", "tri", "sq", "saw"] as const).map((w, i) => (
					<CompactButton
						key={w}
						active={vibratoWave === i + 1}
						onClick={() => setVibratoWave(i + 1)}
						tooltip={`Select ${w} vibrato waveform.`}
					>
						{w}
					</CompactButton>
				))}
			</div>
			<ControlKnob
				value={vibratoRate}
				onChange={setVibratoRate}
				min={0}
				max={99}
				defaultValue={65}
				size={52}
				color="#307948"
				label="Rate"
				tooltip="Sets vibrato speed."
				valueFormatter={(v) => `${Math.round(v)}`}
			/>
			<ControlKnob
				value={vibratoDepth}
				onChange={setVibratoDepth}
				min={0}
				max={99}
				defaultValue={20}
				size={52}
				color="#307948"
				label="Depth"
				tooltip="Sets vibrato pitch modulation depth."
				valueFormatter={(v) => `${Math.round(v)}`}
			/>
			<ControlKnob
				value={vibratoDelay}
				onChange={setVibratoDelay}
				min={0}
				max={5000}
				defaultValue={0}
				size={52}
				color="#307948"
				label="Delay"
				tooltip="Delays vibrato onset after note start."
				valueFormatter={(v) => `${Math.round(v)}ms`}
			/>
		</ModuleFrame>
	);
}
