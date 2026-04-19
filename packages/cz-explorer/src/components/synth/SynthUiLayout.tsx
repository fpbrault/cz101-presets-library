import type { CSSProperties, ReactNode } from "react";
import { SingleCycleDisplay } from "@/components/SingleCycleDisplay";
import AsidePanelSwitcher, {
	type AsidePanelButtonTab,
} from "@/components/synth/AsidePanelSwitcher";
import PhaseLinesSection, {
	type LineConfig,
	type LineSelect,
} from "@/components/synth/PhaseLinesSection";
import type { SynthHeaderProps } from "@/components/synth/SynthHeader";
import SynthLcdDisplay from "@/components/synth/SynthLcdDisplay";
import SynthPageFrame from "@/components/synth/SynthPageFrame";
import CzButton from "@/components/ui/CzButton";

export type DefaultAsidePanelTab =
	| "scope"
	| "global"
	| "phaseMod"
	| "vibrato"
	| "portamento"
	| "lfo"
	| "filter"
	| "chorus"
	| "delay"
	| "reverb";

export const DEFAULT_SYNTH_ASIDE_TABS: AsidePanelButtonTab<DefaultAsidePanelTab>[] =
	[
		{ id: "global", topLabel: "Global", bottomLabel: "" },
		{ id: "portamento", topLabel: "Porta", bottomLabel: "mento" },
		{ id: "phaseMod", topLabel: "Phase", bottomLabel: "Mod" },
		{ id: "vibrato", topLabel: "Vibrato", bottomLabel: "" },
		{ id: "lfo", topLabel: "LFO", bottomLabel: "" },
		{ id: "scope", topLabel: "Scope", bottomLabel: "View" },
		{ id: "filter", topLabel: "Filter", bottomLabel: "" },
		{ id: "chorus", topLabel: "Chorus", bottomLabel: "FX" },
		{ id: "delay", topLabel: "Delay", bottomLabel: "FX" },
		{ id: "reverb", topLabel: "Reverb", bottomLabel: "FX" },
	];

type SynthUiLayoutProps<T extends string> = {
	frameClassName: string;
	frameStyle?: CSSProperties;
	headerProps: SynthHeaderProps;
	headerExtra?: ReactNode;
	lcdPrimaryText: string;
	lcdSecondaryText: string;
	lcdTransientReadout?: {
		label: string;
		value: string;
	} | null;
	asideTabs: AsidePanelButtonTab<T>[];
	activeAsideTab: T;
	onActiveAsideTabChange: (tab: T) => void;
	asidePanels: Record<T, ReactNode>;
	asideTabEnabledState?: Partial<Record<T, boolean>>;
	lineSelect: LineSelect;
	onLineSelectChange: (lineSelect: LineSelect) => void;
	modMode: "normal" | "ring" | "noise";
	onModModeChange: (modMode: "normal" | "ring" | "noise") => void;
	singleCycleData: Float32Array | number[];
	phaseLinesClassName?: string;
	line1: LineConfig;
	line2: LineConfig;
	onActivePhaseLineTabChange: (tab: "line1" | "line2") => void;
};

export default function SynthUiLayout<T extends string>({
	frameClassName,
	frameStyle,
	headerProps,
	headerExtra,
	lcdPrimaryText,
	lcdSecondaryText,
	lcdTransientReadout,
	asideTabs,
	activeAsideTab,
	onActiveAsideTabChange,
	asidePanels,
	asideTabEnabledState,
	lineSelect,
	onLineSelectChange,
	modMode,
	onModModeChange,
	singleCycleData,
	phaseLinesClassName,
	line1,
	line2,
	onActivePhaseLineTabChange,
}: SynthUiLayoutProps<T>) {
	return (
		<SynthPageFrame
			className={frameClassName}
			style={frameStyle}
			headerProps={headerProps}
			headerExtra={headerExtra}
		>
			<div className="px-1 grid flex-1 min-h-0 min-w-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
				<aside className="overflow-y-auto min-h-0 space-y-0 [scrollbar-gutter:stable]">
					<div className="px-4 -mt-1 mx-auto">
						<SynthLcdDisplay
							primaryText={lcdPrimaryText}
							secondaryText={lcdSecondaryText}
							transientReadout={lcdTransientReadout ?? null}
						/>
					</div>

					<AsidePanelSwitcher
						tabs={asideTabs}
						activeTab={activeAsideTab}
						onTabChange={onActiveAsideTabChange}
						tabEnabledState={asideTabEnabledState}
						panels={asidePanels}
					/>
				</aside>

				<main className="flex flex-col gap-4 p-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
					<div className="mb-3 shrink-0 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-cz-cream pb-3">
						<div className="shrink-0">
							<div className="mb-1 cz-light-blue">Line Select</div>
							<div className="grid grid-cols-5 gap-1">
								{(["L1", "L1+L2", "L2", "L1+L1'", "L1+L2'"] as const).map(
									(ls) => (
										<CzButton
											key={ls}
											active={lineSelect === ls}
											onClick={() => onLineSelectChange(ls)}
										>
											{ls}
										</CzButton>
									),
								)}
							</div>
						</div>
						<div className="shrink-0">
							<div className="mb-1 cz-light-blue">Modulation</div>
							<div className="flex gap-1">
								{(
									[
										["normal", "Normal"],
										["ring", "Ring"],
										["noise", "Noise"],
									] as const
								).map(([mode, label]) => (
									<CzButton
										key={mode}
										active={modMode === mode}
										onClick={() => onModModeChange(mode)}
										className="flex-1"
									>
										{label}
									</CzButton>
								))}
							</div>
						</div>

						<SingleCycleDisplay
							data={singleCycleData}
							color="#9cb937"
							label="Single Cycle"
							width={176}
							height={64}
						/>
					</div>

					<PhaseLinesSection
						className={phaseLinesClassName}
						lineSelect={lineSelect}
						onActiveTabChange={onActivePhaseLineTabChange}
						line1={line1}
						line2={line2}
					/>
				</main>
			</div>
		</SynthPageFrame>
	);
}
