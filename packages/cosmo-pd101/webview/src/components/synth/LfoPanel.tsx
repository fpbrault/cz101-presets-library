import { useMemo } from "react";
import ControlKnob from "@/components/ControlKnob";
import CzButton from "@/components/ui/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

const LfoPanel: AsidePanelComponent<"lfo"> = Object.assign(
	function LfoPanel() {
		const { value: lfoEnabled, setValue: setLfoEnabled } =
			useSynthParam("lfoEnabled");
		const { value: lfoWaveform, setValue: setLfoWaveform } =
			useSynthParam("lfoWaveform");
		const { value: lfoRate, setValue: setLfoRate } = useSynthParam("lfoRate");
		const { value: lfoDepth, setValue: setLfoDepth } =
			useSynthParam("lfoDepth");
		const { value: lfoOffset, setValue: setLfoOffset } =
			useSynthParam("lfoOffset");
		const { value: lfoTarget, setValue: setLfoTarget } =
			useSynthParam("lfoTarget");
		const lfoDisplayPath = useMemo(() => {
			const width = 220;
			const height = 92;
			const amplitude = 14 + lfoDepth * 24;
			const cycles = 1 + lfoRate / 10;
			const points: string[] = [];

			for (let i = 0; i <= 48; i++) {
				const t = i / 48;
				const phase = (t * cycles) % 1;
				let value = 0;

				if (lfoWaveform === "sine") value = Math.sin(t * cycles * Math.PI * 2);
				else if (lfoWaveform === "triangle")
					value = 1 - 4 * Math.abs(phase - 0.5);
				else if (lfoWaveform === "square") value = phase < 0.5 ? 1 : -1;
				else value = 1 - phase * 2;

				const x = t * width;
				const y = height / 2 - value * amplitude;
				points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
			}

			return points.join(" ");
		}, [lfoDepth, lfoRate, lfoWaveform]);

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={lfoEnabled}
				onToggleEnabled={setLfoEnabled}
				visualTitle="LFO Visual"
				visualMeta={lfoTarget}
				visual={
					<svg
						viewBox="0 0 220 92"
						className="h-24 w-full rounded-lg border border-cz-border bg-cz-panel"
					>
						<title>LFO waveform display</title>
						{[0.2, 0.4, 0.6, 0.8].map((stop) => (
							<line
								key={stop}
								x1={220 * stop}
								y1="0"
								x2={220 * stop}
								y2="92"
								stroke="rgba(232,119,34,0.08)"
							/>
						))}
						<line
							x1="0"
							y1="46"
							x2="220"
							y2="46"
							stroke="rgba(122,112,96,0.28)"
						/>
						<polyline
							fill="none"
							stroke="#e87722"
							strokeWidth="3"
							strokeLinejoin="round"
							strokeLinecap="round"
							points={lfoDisplayPath}
						/>
					</svg>
				}
			>
				<div className="flex flex-wrap gap-1 mb-2">
					{(["sine", "triangle", "square", "saw"] as const).map((w) => (
						<CzButton
							key={w}
							active={lfoWaveform === w}
							onClick={() => setLfoWaveform(w)}
						>
							{w}
						</CzButton>
					))}
				</div>
				<div className="flex justify-center gap-2">
					<ControlKnob
						value={lfoRate}
						onChange={setLfoRate}
						min={0}
						max={20}
						size={44}
						color="#7f9de4"
						label="Rate"
						valueFormatter={(v) => `${v.toFixed(1)}Hz`}
						modDestination="lfoRate"
					/>
					<ControlKnob
						value={lfoDepth}
						onChange={setLfoDepth}
						min={0}
						max={1}
						size={44}
						color="#7f9de4"
						label="Depth"
						valueFormatter={(v) => `${Math.round(v * 100)}%`}
						modDestination="lfoDepth"
					/>
					<ControlKnob
						value={lfoOffset}
						onChange={setLfoOffset}
						min={-1}
						max={1}
						size={44}
						color="#7f9de4"
						label="Offset"
						valueFormatter={(v) => `${Math.round(v * 100)}%`}
					/>
					<ControlKnob
						value={lfoOffset}
						onChange={setLfoOffset}
						min={-1}
						max={1}
						size={44}
						color="#7f9de4"
						label="Offset"
						valueFormatter={(v) => `${Math.round(v * 100)}%`}
					/>
				</div>
				<div className="mt-2">
					<div className="mb-2 cz-light-blue">Target</div>
					<div className="flex flex-wrap gap-1">
						{(["pitch", "dcw", "dca", "filter"] as const).map((t) => (
							<CzButton
								key={t}
								active={lfoTarget === t}
								onClick={() => setLfoTarget(t)}
							>
								{t}
							</CzButton>
						))}
					</div>
				</div>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "lfo" as const,
		panelTab: { topLabel: "LFO", bottomLabel: "" },
	},
);

export default LfoPanel;
