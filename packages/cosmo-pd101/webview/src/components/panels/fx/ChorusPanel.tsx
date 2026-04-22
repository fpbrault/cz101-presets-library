import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { ChorusSection } from "./ChorusSection";

const ChorusPanel: AsidePanelComponent<"chorus"> = Object.assign(
	function ChorusPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("chorusEnabled");
		const { value: rate, setValue: setRate } = useSynthParam("chorusRate");
		const { value: depth, setValue: setDepth } = useSynthParam("chorusDepth");
		const { value: mix, setValue: setMix } = useSynthParam("chorusMix");

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={enabled}
				onToggleEnabled={setEnabled}
			>
				<ChorusSection
					rate={rate}
					setRate={setRate}
					depth={depth}
					setDepth={setDepth}
					mix={mix}
					setMix={setMix}
				/>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "chorus" as const,
		panelTab: { topLabel: "Chorus", bottomLabel: "FX" },
	},
);

export default ChorusPanel;
