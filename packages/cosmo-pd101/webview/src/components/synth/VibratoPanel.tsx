import ControlKnob from "@/components/ControlKnob";
import CzButton from "@/components/ui/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

const VibratoPanel: AsidePanelComponent<"vibrato"> = Object.assign(
	function VibratoPanel() {
		const { value: vibratoEnabled, setValue: setVibratoEnabled } =
			useSynthParam("vibratoEnabled");
		const { value: vibratoWave, setValue: setVibratoWave } =
			useSynthParam("vibratoWave");
		const { value: vibratoRate, setValue: setVibratoRate } =
			useSynthParam("vibratoRate");
		const { value: vibratoDepth, setValue: setVibratoDepth } =
			useSynthParam("vibratoDepth");
		const { value: vibratoDelay, setValue: setVibratoDelay } =
			useSynthParam("vibratoDelay");
		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={vibratoEnabled}
				onToggleEnabled={setVibratoEnabled}
			>
				<div className="flex justify-center gap-2">
					{(["sine", "tri", "sq", "saw"] as const).map((w, i) => (
						<CzButton
							key={w}
							active={vibratoWave === i + 1}
							onClick={() => setVibratoWave(i + 1)}
						>
							{w}
						</CzButton>
					))}
				</div>
				<div className="flex justify-center gap-2 mt-2">
					<ControlKnob
						value={vibratoRate}
						onChange={setVibratoRate}
						min={0}
						max={99}
						size={44}
						color="#7f9de4"
						label="Rate"
						valueFormatter={(v) => `${Math.round(v)}`}
					/>
					<ControlKnob
						value={vibratoDepth}
						onChange={setVibratoDepth}
						min={0}
						max={99}
						size={44}
						color="#7f9de4"
						label="Depth"
						valueFormatter={(v) => `${Math.round(v)}`}
						modDestination="vibratoDepth"
					/>
					<ControlKnob
						value={vibratoDelay}
						onChange={setVibratoDelay}
						min={0}
						max={5000}
						size={44}
						color="#7f9de4"
						label="Delay"
						valueFormatter={(v) => `${Math.round(v)}ms`}
					/>
				</div>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "vibrato" as const,
		panelTab: { topLabel: "Vibrato", bottomLabel: "" },
	},
);

export default VibratoPanel;
