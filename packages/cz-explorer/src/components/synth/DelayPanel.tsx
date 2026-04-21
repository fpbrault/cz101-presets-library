import { DelaySection } from "@/components/DelaySection";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

const DelayPanel: AsidePanelComponent<"delay"> = Object.assign(
	function DelayPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("delayEnabled");
		const { value: time, setValue: setTime } = useSynthParam("delayTime");
		const { value: feedback, setValue: setFeedback } =
			useSynthParam("delayFeedback");
		const { value: mix, setValue: setMix } = useSynthParam("delayMix");

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
