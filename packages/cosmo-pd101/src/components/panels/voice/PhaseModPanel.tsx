import ControlKnob from "@/components/controls/ControlKnob";
import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

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
						tooltip="Sets internal phase modulation depth."
						valueFormatter={(value) => value.toFixed(2)}
						modDestination="intPmAmount"
					/>
					<ControlKnob
						value={intPmRatio}
						onChange={setIntPmRatio}
						min={0.5}
						max={4}
						size={52}
						color="#9cb937"
						label="Ratio"
						tooltip="Sets modulator-to-carrier frequency ratio."
						valueFormatter={(value) => value.toFixed(1)}
					/>
				</div>
				<CzButton
					active={pmPre}
					onClick={() => setPmPre(!pmPre)}
					tooltip="Apply phase modulation before warp shaping."
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
