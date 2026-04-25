import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { PhaserSection } from "./PhaserSection";

const PhaserPanel: AsidePanelComponent<"phaser"> = Object.assign(
	function PhaserPanel() {
		const { value: enabled, setValue: setEnabled } =
			useSynthParam("phaserEnabled");
		const { value: rate, setValue: setRate } = useSynthParam("phaserRate");
		const { value: depth, setValue: setDepth } = useSynthParam("phaserDepth");
		const { value: feedback, setValue: setFeedback } =
			useSynthParam("phaserFeedback");
		const { value: mix, setValue: setMix } = useSynthParam("phaserMix");

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={enabled}
				onToggleEnabled={setEnabled}
			>
				<PhaserSection
					rate={rate}
					setRate={setRate}
					depth={depth}
					setDepth={setDepth}
					feedback={feedback}
					setFeedback={setFeedback}
					mix={mix}
					setMix={setMix}
				/>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "phaser" as const,
		panelTab: { topLabel: "Phaser", bottomLabel: "FX" },
	},
);

export default PhaserPanel;
