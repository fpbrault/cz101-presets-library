import ControlKnob from "@/components/ControlKnob";
import CzButton from "@/components/ui/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

const PhaseModPanel: AsidePanelComponent<"phaseMod"> = Object.assign(
	function PhaseModPanel() {
		const { value: phaseModEnabled, setValue: setPhaseModEnabled } =
			useSynthParam("phaseModEnabled");
		const { value: intPmAmount, setValue: setIntPmAmount } =
			useSynthParam("intPmAmount");
		const { value: intPmRatio, setValue: setIntPmRatio } =
			useSynthParam("intPmRatio");
		const { value: pmPre, setValue: setPmPre } = useSynthParam("pmPre");
		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={phaseModEnabled}
				onToggleEnabled={setPhaseModEnabled}
			>
				<div className="flex justify-center gap-4">
					<ControlKnob
						value={intPmAmount}
						onChange={setIntPmAmount}
						min={0}
						max={0.3}
						size={52}
						color="#7f9de4"
						label="Amount"
						valueFormatter={(value) => value.toFixed(2)}
					/>
					<ControlKnob
						value={intPmRatio}
						onChange={setIntPmRatio}
						min={0.5}
						max={4}
						size={52}
						color="#9cb937"
						label="Ratio"
						valueFormatter={(value) => value.toFixed(1)}
					/>
				</div>
				<CzButton
					active={pmPre}
					onClick={() => setPmPre(!pmPre)}
					className="mt-3 [&_button]:bg-cz-inset [&_button]:border-cz-border"
				>
					Pre-warp PM
				</CzButton>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "phaseMod" as const,
		panelTab: { topLabel: "Phase", bottomLabel: "Mod" },
	},
);

export default PhaseModPanel;
