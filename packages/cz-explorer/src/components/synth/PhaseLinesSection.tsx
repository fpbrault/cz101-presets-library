import { useEffect, useState } from "react";
import { PerLineWarpBlock } from "@/components/PerLineWarpBlock";
import type { PdAlgo, StepEnvData } from "@/components/pdAlgorithms";
import Card, { joinClasses } from "@/components/ui/Card";
import CzTabButton from "@/components/ui/CzTabButton";

type LineSelect = "L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'";

type LineConfig = {
	warpAmount: number;
	setWarpAmount: (v: number) => void;
	algo: PdAlgo;
	setAlgo: (v: PdAlgo) => void;
	algo2: PdAlgo | null;
	setAlgo2: (v: PdAlgo | null) => void;
	algoBlend: number;
	setAlgoBlend: (v: number) => void;
	dcwComp: number;
	setDcwComp: (v: number) => void;
	level: number;
	setLevel: (v: number) => void;
	octave: number;
	setOctave: (v: number) => void;
	fineDetune: number;
	setFineDetune: (v: number) => void;
	dcoDepth: number;
	setDcoDepth: (v: number) => void;
	dcoEnv: StepEnvData;
	setDcoEnv: (v: StepEnvData) => void;
	dcwEnv: StepEnvData;
	setDcwEnv: (v: StepEnvData) => void;
	dcaEnv: StepEnvData;
	setDcaEnv: (v: StepEnvData) => void;
	keyFollow: number;
	setKeyFollow: (v: number) => void;
	waveform: Float32Array | number[];
};

type PhaseLinesSectionProps = {
	lineSelect: LineSelect;
	onActiveTabChange?: (v: "line1" | "line2") => void;
	className?: string;
	line1: LineConfig;
	line2: LineConfig;
};

type SidePanelTab = "line1-algos" | "line2-algos" | "line1-envelopes" | "line2-envelopes";

export default function PhaseLinesSection({
	lineSelect,
	onActiveTabChange,
	className,
	line1,
	line2,
}: PhaseLinesSectionProps) {
	const showLineA = lineSelect !== "L2";
	const [activeTab, setActiveTab] = useState<SidePanelTab>(
		showLineA ? "line1-algos" : "line2-algos",
	);

	const activeLine: "line1" | "line2" = activeTab.startsWith("line1")
		? "line1"
		: "line2";
	const activeSection: "algos" | "envelopes" = activeTab.endsWith("algos")
		? "algos"
		: "envelopes";
	const activeLineConfig = activeLine === "line1" ? line1 : line2;
	const activeLineLabel = activeLine === "line1" ? "Line 1" : "Line 2";

	useEffect(() => {
		onActiveTabChange?.(activeLine);
	}, [activeLine, onActiveTabChange]);

	const panelClassName = joinClasses("h-full min-h-0 flex flex-col", className);
	const leftTabs: Array<{ id: SidePanelTab; topLabel: string; bottomLabel: string }> = [
		{ id: "line1-algos", topLabel: "L1", bottomLabel: "PARAM" },
		{ id: "line2-algos", topLabel: "L2", bottomLabel: "PARAM" },
		{ id: "line1-envelopes", topLabel: "L1", bottomLabel: "ENV" },
		{ id: "line2-envelopes", topLabel: "L2", bottomLabel: "ENV" },
	];

	return (
		<Card variant="panel-slanted" padding="none" className={panelClassName}>
			<div className="cz-collapse-header cz-section-slanted-title py-0 shrink-0 justify-center">
				Phase Lines
			</div>
			<div className="border-l-2 border-r-2 border-cz-cream mt-2 mb-1 bg-cz-panel p-2 flex-1 min-h-0 min-w-0 flex overflow-hidden">
				<div className="flex-1 min-h-0 min-w-0 flex gap-2 items-stretch">
					<div className="w-14 shrink-0 self-stretch flex flex-col gap-2 justify-around">
						{leftTabs.map((tab) => (
							<CzTabButton
								key={tab.id}
								active={activeTab === tab.id}
								onClick={() => setActiveTab(tab.id)}
								topLabel={tab.topLabel}
								bottomLabel={tab.bottomLabel}
								color="black"
								styleVariant="cz"
								showLed
							/>
						))}
					</div>

				<PerLineWarpBlock
					key={activeLineLabel}
					label={activeLineLabel}
					color="#9cb937"
					algo={activeLineConfig.algo}
					setAlgo={activeLineConfig.setAlgo}
					algo2={activeLineConfig.algo2}
					setAlgo2={activeLineConfig.setAlgo2}
					algoBlend={activeLineConfig.algoBlend}
					setAlgoBlend={activeLineConfig.setAlgoBlend}
					warpAmount={activeLineConfig.warpAmount}
					setWarpAmount={activeLineConfig.setWarpAmount}
					dcwComp={activeLineConfig.dcwComp}
					setDcwComp={activeLineConfig.setDcwComp}
					level={activeLineConfig.level}
					setLevel={activeLineConfig.setLevel}
					octave={activeLineConfig.octave}
					setOctave={activeLineConfig.setOctave}
					fineDetune={activeLineConfig.fineDetune}
					setFineDetune={activeLineConfig.setFineDetune}
					dcoDepth={activeLineConfig.dcoDepth}
					setDcoDepth={activeLineConfig.setDcoDepth}
					dcoEnv={activeLineConfig.dcoEnv}
					setDcoEnv={activeLineConfig.setDcoEnv}
					dcwEnv={activeLineConfig.dcwEnv}
					setDcwEnv={activeLineConfig.setDcwEnv}
					dcaEnv={activeLineConfig.dcaEnv}
					setDcaEnv={activeLineConfig.setDcaEnv}
					keyFollow={activeLineConfig.keyFollow}
					setKeyFollow={activeLineConfig.setKeyFollow}
					showSectionTabs={false}
					activeSection={activeSection}
				/>
				</div>
			</div>
		</Card>
	);
}
