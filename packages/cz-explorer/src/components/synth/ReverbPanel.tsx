import { ReverbSection } from "@/components/ReverbSection";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

const ReverbPanel: AsidePanelComponent<"reverb"> = Object.assign(
	function ReverbPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("reverbEnabled");
		const { value: size, setValue: setSize } = useSynthParam("reverbSize");
		const { value: mix, setValue: setMix } = useSynthParam("reverbMix");

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={enabled}
				onToggleEnabled={setEnabled}
			>
				<ReverbSection
					size={size}
					setSize={setSize}
					mix={mix}
					setMix={setMix}
				/>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "reverb" as const,
		panelTab: { topLabel: "Reverb", bottomLabel: "FX" },
	},
);

export default ReverbPanel;
