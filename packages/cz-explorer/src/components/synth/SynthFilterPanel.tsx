import { useMemo } from "react";
import ControlKnob from "@/components/ControlKnob";
import CzButton from "@/components/ui/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

const SynthFilterPanel: AsidePanelComponent<"filter"> = Object.assign(
	function SynthFilterPanel() {
		const { value: filterEnabled, setValue: setFilterEnabled } =
			useSynthParam("filterEnabled");
		const { value: filterType, setValue: setFilterType } =
			useSynthParam("filterType");
		const { value: filterCutoff, setValue: setFilterCutoff } =
			useSynthParam("filterCutoff");
		const { value: filterResonance, setValue: setFilterResonance } =
			useSynthParam("filterResonance");
		const { value: filterEnvAmount, setValue: setFilterEnvAmount } =
			useSynthParam("filterEnvAmount");
		const filterDisplay = useMemo(() => {
			const width = 220;
			const height = 92;
			const cutoffNorm =
				(Math.log10(filterCutoff) - Math.log10(20)) /
				(Math.log10(20000) - Math.log10(20));
			const cutoffX = 18 + cutoffNorm * (width - 36);
			const peakY = 22 - filterResonance * 18 - filterEnvAmount * 10;
			const topY = 24;
			const bottomY = height - 14;

			if (filterType === "hp") {
				return {
					path: `M 0 ${bottomY} L ${Math.max(0, cutoffX - 22)} ${bottomY} L ${cutoffX} ${peakY} L ${width} ${topY}`,
					fill: `M 0 ${height} L 0 ${bottomY} L ${Math.max(0, cutoffX - 22)} ${bottomY} L ${cutoffX} ${peakY} L ${width} ${topY} L ${width} ${height} Z`,
				};
			}

			if (filterType === "bp") {
				return {
					path: `M 0 ${bottomY} L ${Math.max(0, cutoffX - 34)} ${bottomY} L ${Math.max(0, cutoffX - 8)} ${peakY} L ${Math.min(width, cutoffX + 8)} ${peakY} L ${Math.min(width, cutoffX + 34)} ${bottomY} L ${width} ${bottomY}`,
					fill: `M 0 ${height} L 0 ${bottomY} L ${Math.max(0, cutoffX - 34)} ${bottomY} L ${Math.max(0, cutoffX - 8)} ${peakY} L ${Math.min(width, cutoffX + 8)} ${peakY} L ${Math.min(width, cutoffX + 34)} ${bottomY} L ${width} ${bottomY} L ${width} ${height} Z`,
				};
			}

			return {
				path: `M 0 ${topY} L ${Math.max(0, cutoffX - 22)} ${topY} L ${cutoffX} ${peakY} L ${width} ${bottomY}`,
				fill: `M 0 ${height} L 0 ${topY} L ${Math.max(0, cutoffX - 22)} ${topY} L ${cutoffX} ${peakY} L ${width} ${bottomY} L ${width} ${height} Z`,
			};
		}, [filterCutoff, filterEnvAmount, filterResonance, filterType]);

		return (
			<SynthPanelContainer
				showEnableToggle
				enabled={filterEnabled}
				onToggleEnabled={setFilterEnabled}
				visualTitle="Response"
				visualMeta={filterType.toUpperCase()}
				visual={
					<svg
						viewBox="0 0 220 92"
						className="h-24 w-full rounded-lg border border-cz-border bg-cz-panel"
					>
						<title>Filter response display</title>
						{[0.2, 0.4, 0.6, 0.8].map((stop) => (
							<line
								key={stop}
								x1={220 * stop}
								y1="0"
								x2={220 * stop}
								y2="92"
								stroke="rgba(61,255,61,0.12)"
							/>
						))}
						<line
							x1="0"
							y1="78"
							x2="220"
							y2="78"
							stroke="rgba(122,112,96,0.28)"
						/>
						<path d={filterDisplay.fill} fill="rgba(61,255,61,0.16)" />
						<path
							d={filterDisplay.path}
							fill="none"
							stroke="#3dff3d"
							strokeWidth="3"
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
					</svg>
				}
			>
				<div className="flex w-full gap-1 mb-2">
					{(["lp", "hp", "bp"] as const).map((t) => (
						<CzButton
							key={t}
							active={filterType === t}
							onClick={() => setFilterType(t)}
							className="flex-1"
						>
							{t.toUpperCase()}
						</CzButton>
					))}
				</div>
				<div className="flex justify-center gap-2">
					<ControlKnob
						value={filterCutoff}
						onChange={setFilterCutoff}
						min={20}
						max={20000}
						size={44}
						color="#3dff3d"
						label="Cutoff"
						valueFormatter={(v) => `${Math.round(v)}Hz`}
					/>
					<ControlKnob
						value={filterResonance}
						onChange={setFilterResonance}
						min={0}
						max={1}
						size={44}
						color="#3dff3d"
						label="Res"
						valueFormatter={(v) => `${Math.round(v * 100)}%`}
					/>
					<ControlKnob
						value={filterEnvAmount}
						onChange={setFilterEnvAmount}
						min={-1}
						max={1}
						size={44}
						color="#3dff3d"
						label="Env"
						valueFormatter={(v) => `${Math.round(v * 100)}%`}
					/>
				</div>
			</SynthPanelContainer>
		);
	},
	{
		panelId: "filter" as const,
		panelTab: { topLabel: "Filter", bottomLabel: "" },
	},
);

export default SynthFilterPanel;
