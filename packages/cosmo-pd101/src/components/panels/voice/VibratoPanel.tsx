import ControlKnob from "@/components/controls/ControlKnob";
import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

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
							tooltip={`Select ${w} vibrato waveform.`}
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
						tooltip="Sets vibrato speed."
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
						tooltip="Sets vibrato pitch modulation amount."
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
						tooltip="Delays vibrato onset after a note is triggered."
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
