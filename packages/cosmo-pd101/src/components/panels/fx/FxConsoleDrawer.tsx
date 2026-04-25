import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

// ---------------------------------------------------------------------------
// FxConsoleDrawer
// ---------------------------------------------------------------------------

export default function FxConsoleDrawer() {
	const { value: chorusEnabled, setValue: setChorusEnabled } =
		useSynthParam("chorusEnabled");
	const { value: chorusRate, setValue: setChorusRate } =
		useSynthParam("chorusRate");
	const { value: chorusDepth, setValue: setChorusDepth } =
		useSynthParam("chorusDepth");
	const { value: chorusMix, setValue: setChorusMix } =
		useSynthParam("chorusMix");
	const { value: delayEnabled, setValue: setDelayEnabled } =
		useSynthParam("delayEnabled");
	const { value: delayTime, setValue: setDelayTime } =
		useSynthParam("delayTime");
	const { value: delayFeedback, setValue: setDelayFeedback } =
		useSynthParam("delayFeedback");
	const { value: delayMix, setValue: setDelayMix } = useSynthParam("delayMix");
	const { value: reverbEnabled, setValue: setReverbEnabled } =
		useSynthParam("reverbEnabled");
	const { value: reverbSize, setValue: setReverbSize } =
		useSynthParam("reverbSize");
	const { value: reverbMix, setValue: setReverbMix } =
		useSynthParam("reverbMix");

	return (
		<div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-2">
			<ModuleFrame
				title="Chorus"
				color="#818cf8"
				meta="Stereo"
				enabled={chorusEnabled}
				onToggle={() => setChorusEnabled(!chorusEnabled)}
			>
				<div className="grid grid-cols-3 gap-2">
					<ControlKnob
						value={chorusRate}
						onChange={setChorusRate}
						min={0.1}
						max={5}
						defaultValue={1.0}
						size={96}
						color="#818cf8"
						label="Rate"
						valueFormatter={(value) => value.toFixed(1)}
					/>
					<ControlKnob
						value={chorusDepth}
						onChange={setChorusDepth}
						min={0}
						max={3}
						defaultValue={1.5}
						size={96}
						color="#818cf8"
						label="Depth"
						valueFormatter={(value) => `${Math.round((value / 3) * 100)}%`}
					/>
					<ControlKnob
						value={chorusMix}
						onChange={setChorusMix}
						min={0}
						max={1}
						defaultValue={0.5}
						size={96}
						color="#818cf8"
						label="Mix"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
				</div>
			</ModuleFrame>

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

			<ModuleFrame
				title="Reverb"
				color="#f97316"
				meta="Hall"
				enabled={reverbEnabled}
				onToggle={() => setReverbEnabled(!reverbEnabled)}
				className="col-span-2"
			>
				<div className="grid grid-cols-2 gap-4">
					<ControlKnob
						value={reverbSize}
						onChange={setReverbSize}
						min={0}
						max={1}
						defaultValue={0.5}
						size={96}
						//some kind of dark orange
						color="#f97316"
						label="Size"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<ControlKnob
						value={reverbMix}
						onChange={setReverbMix}
						min={0}
						max={1}
						defaultValue={0.3}
						size={96}
						color="#f97316"
						label="Mix"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
				</div>
			</ModuleFrame>
		</div>
	);
}
