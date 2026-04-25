import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { ReverbSection } from "./ReverbSection";

const ReverbPanel: AsidePanelComponent<"reverb"> = Object.assign(
	function ReverbPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("reverbEnabled");
		const { value: size, setValue: setSize } = useSynthParam("reverbSize");
		const { value: mix, setValue: setMix } = useSynthParam("reverbMix");
		const { value: damping, setValue: setDamping } =
			useSynthParam("reverbDamping");
		const { value: preDelay, setValue: setPreDelay } =
			useSynthParam("reverbPreDelay");

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
					damping={damping}
					setDamping={setDamping}
					preDelay={preDelay}
					setPreDelay={setPreDelay}
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
