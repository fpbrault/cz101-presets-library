import ControlKnob from "@/components/controls/ControlKnob";
import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

const PortamentoPanel: AsidePanelComponent<"portamento"> = Object.assign(
	function PortamentoPanel() {
		const { value: portamentoEnabled, setValue: setPortamentoEnabled } =
			useSynthParam("portamentoEnabled");
		const { value: portamentoMode, setValue: setPortamentoMode } =
			useSynthParam("portamentoMode");
		const { value: portamentoRate, setValue: setPortamentoRate } =
			useSynthParam("portamentoRate");
		const { value: portamentoTime, setValue: setPortamentoTime } =
			useSynthParam("portamentoTime");
		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={portamentoEnabled}
				onToggleEnabled={setPortamentoEnabled}
			>
				<div className="flex w-full gap-1 mb-2">
					<CzButton
						active={portamentoMode === "rate"}
						onClick={() => setPortamentoMode("rate")}
						className="flex-1"
					>
						Rate
					</CzButton>
					<CzButton
						active={portamentoMode === "time"}
						onClick={() => setPortamentoMode("time")}
						className="flex-1"
					>
						Time
					</CzButton>
				</div>
				<div className="flex justify-center gap-2">
					{portamentoMode === "rate" ? (
						<ControlKnob
							value={portamentoRate}
							onChange={setPortamentoRate}
							min={0}
							max={99}
							size={52}
							color="#7f9de4"
							label="Rate"
							valueFormatter={(v) => `${Math.round(v)}`}
						/>
					) : (
						<ControlKnob
							value={portamentoTime}
							onChange={setPortamentoTime}
							min={0}
							max={2}
							size={52}
							color="#7f9de4"
							label="Time"
							valueFormatter={(v) => `${v.toFixed(2)}s`}
						/>
					)}
				</div>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "portamento" as const,
		panelTab: { topLabel: "Porta", bottomLabel: "mento" },
	},
);

export default PortamentoPanel;
