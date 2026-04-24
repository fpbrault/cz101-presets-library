import ControlKnob from "@/components/controls/ControlKnob";
import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

const GlobalVoicePanel: AsidePanelComponent<"global"> = Object.assign(
	function GlobalVoicePanel() {
		const { value: volume, setValue: setVolume } = useSynthParam("volume");
		const { value: polyMode, setValue: setPolyMode } =
			useSynthParam("polyMode");
		const { value: velocityTarget, setValue: setVelocityTarget } =
			useSynthParam("velocityTarget");
		const { value: pitchBendRange, setValue: setPitchBendRange } =
			useSynthParam("pitchBendRange");
		const { value: modWheelVibratoDepth, setValue: setModWheelVibratoDepth } =
			useSynthParam("modWheelVibratoDepth");
		return (
			<SynthPanelContainer>
				<div className="mb-3 flex justify-center">
					<ControlKnob
						value={volume}
						onChange={setVolume}
						min={0}
						max={1}
						size={32}
						color="#9cb937"
						label="Volume"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
						modDestination="volume"
					/>
				</div>
				<div className="space-y-2">
					<div className="flex w-full gap-1">
						<CzButton
							active={polyMode === "poly8"}
							onClick={() => setPolyMode("poly8")}
							className="flex-1"
						>
							Poly 8
						</CzButton>
						<CzButton
							active={polyMode === "mono"}
							onClick={() => setPolyMode("mono")}
							className="flex-1"
						>
							Mono
						</CzButton>
					</div>
					<div>
						<div className="mb-2 cz-light-blue">Velocity</div>
						<div className="flex flex-wrap gap-1 justify-center">
							{(["amp", "dcw", "both", "off"] as const).map((target) => (
								<CzButton
									key={target}
									active={velocityTarget === target}
									onClick={() => setVelocityTarget(target)}
								>
									{target === "amp"
										? "Amp"
										: target === "dcw"
											? "DCW"
											: target === "both"
												? "Both"
												: "Off"}
								</CzButton>
							))}
						</div>
					</div>
					<div className="flex justify-around pt-1">
						<ControlKnob
							value={pitchBendRange}
							onChange={setPitchBendRange}
							min={1}
							max={24}
							size={28}
							color="#5bc8d4"
							label="Bend"
							valueFormatter={(v) => `${Math.round(v)} st`}
						/>
						<ControlKnob
							value={modWheelVibratoDepth}
							onChange={setModWheelVibratoDepth}
							min={0}
							max={99}
							size={28}
							color="#5bc8d4"
							label="Mod→Vib"
							valueFormatter={(v) => `${Math.round(v)}`}
						/>
					</div>
				</div>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "global" as const,
		panelTab: { topLabel: "Global", bottomLabel: "" },
	},
);

export default GlobalVoicePanel;
