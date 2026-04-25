import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { DelaySection } from "./DelaySection";

const DelayPanel: AsidePanelComponent<"delay"> = Object.assign(
	function DelayPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("delayEnabled");
		const { value: time, setValue: setTime } = useSynthParam("delayTime");
		const { value: feedback, setValue: setFeedback } =
			useSynthParam("delayFeedback");
		const { value: mix, setValue: setMix } = useSynthParam("delayMix");
		const { value: tapeMode, setValue: setTapeMode } =
			useSynthParam("delayTapeMode");
		const { value: warmth, setValue: setWarmth } =
			useSynthParam("delayWarmth");

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={enabled}
				onToggleEnabled={setEnabled}
			>
				<DelaySection
					time={time}
					setTime={setTime}
					feedback={feedback}
					setFeedback={setFeedback}
					mix={mix}
					setMix={setMix}
					tapeMode={tapeMode}
					setTapeMode={setTapeMode}
					warmth={warmth}
					setWarmth={setWarmth}
				/>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "delay" as const,
		panelTab: { topLabel: "Delay", bottomLabel: "FX" },
	},
);

export default DelayPanel;
