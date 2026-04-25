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
	const { value: reverbSpace, setValue: setReverbSpace } =
		useSynthParam("reverbSpace");
	const { value: reverbPredelay, setValue: setReverbPredelay } =
		useSynthParam("reverbPredelay");
	const { value: reverbBrightness, setValue: setReverbBrightness } =
		useSynthParam("reverbBrightness");
	const { value: reverbDistance, setValue: setReverbDistance } =
		useSynthParam("reverbDistance");
	const { value: reverbCharacter, setValue: setReverbCharacter } =
		useSynthParam("reverbCharacter");
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
				meta="FDN"
				enabled={reverbEnabled}
				onToggle={() => setReverbEnabled(!reverbEnabled)}
				className="col-span-2"
			>
				<div className="grid grid-cols-6 gap-4">
					<ControlKnob
						value={reverbSpace}
						onChange={setReverbSpace}
						min={0}
						max={1}
						defaultValue={0.5}
						size={96}
						color="#f97316"
						label="Space"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<ControlKnob
						value={reverbPredelay}
						onChange={setReverbPredelay}
						min={0}
						max={0.1}
						defaultValue={0}
						size={96}
						color="#f97316"
						label="Pre-Dly"
						valueFormatter={(value) => `${Math.round(value * 1000)}ms`}
					/>
					<ControlKnob
						value={reverbBrightness}
						onChange={setReverbBrightness}
						min={0}
						max={1}
						defaultValue={0.7}
						size={96}
						color="#f97316"
						label="Bright"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<ControlKnob
						value={reverbDistance}
						onChange={setReverbDistance}
						min={0}
						max={1}
						defaultValue={0.3}
						size={96}
						color="#f97316"
						label="Dist"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<ControlKnob
						value={reverbCharacter}
						onChange={setReverbCharacter}
						min={0}
						max={1}
						defaultValue={0.3}
						size={96}
						color="#f97316"
						label="Char"
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

