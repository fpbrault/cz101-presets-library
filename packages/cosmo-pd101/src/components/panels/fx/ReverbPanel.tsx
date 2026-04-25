import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { ReverbSection } from "./ReverbSection";

const ReverbPanel: AsidePanelComponent<"reverb"> = Object.assign(
	function ReverbPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("reverbEnabled");
		const { value: space, setValue: setSpace } = useSynthParam("reverbSpace");
		const { value: mix, setValue: setMix } = useSynthParam("reverbMix");
		const { value: predelay, setValue: setPredelay } =
			useSynthParam("reverbPredelay");
		const { value: brightness, setValue: setBrightness } =
			useSynthParam("reverbBrightness");
		const { value: distance, setValue: setDistance } =
			useSynthParam("reverbDistance");
		const { value: character, setValue: setCharacter } =
			useSynthParam("reverbCharacter");

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={enabled}
				onToggleEnabled={setEnabled}
			>
				<ReverbSection
					space={space}
					setSpace={setSpace}
					mix={mix}
					setMix={setMix}
					predelay={predelay}
					setPredelay={setPredelay}
					brightness={brightness}
					setBrightness={setBrightness}
					distance={distance}
					setDistance={setDistance}
					character={character}
					setCharacter={setCharacter}
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
