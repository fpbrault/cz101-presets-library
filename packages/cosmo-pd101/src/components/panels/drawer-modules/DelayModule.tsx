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
	const { value: delayTapeMode, setValue: setDelayTapeMode } =
		useSynthParam("delayTapeMode");
	const { value: delayWarmth, setValue: setDelayWarmth } =
		useSynthParam("delayWarmth");
	const delayModeLabel = delayTapeMode ? "Tape Echo" : "Digital";
	return (
		<ModuleFrame
			title="Delay"
			color="#fbbf24"
			meta={delayModeLabel}
			columns={delayTapeMode ? 4 : 3}
			enabled={delayEnabled}
			onToggle={() => setDelayEnabled(!delayEnabled)}
		>
			<button
				type="button"
				onClick={() => setDelayTapeMode(!delayTapeMode)}
				className={`rounded px-2 py-0.5 text-[0.6rem] font-medium tracking-wider border transition-colors w-fit justify-self-center grow col-span-${delayTapeMode ? 4 : 3} ${
					delayTapeMode
						? "border-amber-500/60 bg-amber-500/20 text-amber-300"
						: "border-cz-border bg-cz-body text-cz-cream/60 hover:text-cz-cream/90"
				}`}
			>
				{delayTapeMode ? "● TAPE" : "○ TAPE"}
			</button>
			<ControlKnob
				value={delayTime}
				onChange={setDelayTime}
				min={0.01}
				max={1}
				defaultValue={0.3}
				size={52}
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
				size={52}
				color="#fbbf24"
				label="Fdbk"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			{delayTapeMode && (
				<ControlKnob
					value={delayWarmth}
					onChange={setDelayWarmth}
					min={0}
					max={1}
					defaultValue={0.5}
					size={52}
					color="#f59e0b"
					label="Warmth"
					valueFormatter={(value) => `${Math.round(value * 100)}%`}
				/>
			)}
			<ControlKnob
				value={delayMix}
				onChange={setDelayMix}
				min={0}
				max={1}
				defaultValue={0.25}
				size={52}
				color="#fbbf24"
				label="Mix"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
