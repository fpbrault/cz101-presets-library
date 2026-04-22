import { useEffect, useState } from "react";
import { PerLineWarpBlock } from "@/components/PerLineWarpBlock";
import Card, { joinClasses } from "@/components/ui/Card";
import CzTabButton from "@/components/ui/CzTabButton";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type { Algo, StepEnvData } from "@/lib/synth/bindings/synth";

export type LineSelect = "L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'";

export type EnvOverrideHandlers = {
	onLine1DcoEnvChange?: (next: StepEnvData) => void;
	onLine1DcwEnvChange?: (next: StepEnvData) => void;
	onLine1DcaEnvChange?: (next: StepEnvData) => void;
	onLine2DcoEnvChange?: (next: StepEnvData) => void;
	onLine2DcwEnvChange?: (next: StepEnvData) => void;
	onLine2DcaEnvChange?: (next: StepEnvData) => void;
};

export type PhaseLinesSectionProps = {
	onActiveTabChange?: (v: "line1" | "line2") => void;
	className?: string;
	envOverrideHandlers?: EnvOverrideHandlers;
};

type SidePanelTab =
	| "line1-algos"
	| "line2-algos"
	| "line1-envelopes"
	| "line2-envelopes";

export default function PhaseLinesSection({
	onActiveTabChange,
	className,
	envOverrideHandlers,
}: PhaseLinesSectionProps) {
	const { value: lineSelect } = useSynthParam("lineSelect");
	const { value: warpAAmount, setValue: setWarpAAmount } =
		useSynthParam("warpAAmount");
	const { value: warpBAmount, setValue: setWarpBAmount } =
		useSynthParam("warpBAmount");
	const { value: warpAAlgo, setValue: setWarpAAlgo } =
		useSynthParam("warpAAlgo");
	const { value: warpBAlgo, setValue: setWarpBAlgo } =
		useSynthParam("warpBAlgo");
	const { value: algo2A, setValue: setAlgo2A } = useSynthParam("algo2A");
	const { value: algo2B, setValue: setAlgo2B } = useSynthParam("algo2B");
	const { value: algoBlendA, setValue: setAlgoBlendA } =
		useSynthParam("algoBlendA");
	const { value: algoBlendB, setValue: setAlgoBlendB } =
		useSynthParam("algoBlendB");
	const { value: line1DcwComp, setValue: setLine1DcwComp } =
		useSynthParam("line1DcwComp");
	const { value: line2DcwComp, setValue: setLine2DcwComp } =
		useSynthParam("line2DcwComp");
	const { value: line1Level, setValue: setLine1Level } =
		useSynthParam("line1Level");
	const { value: line2Level, setValue: setLine2Level } =
		useSynthParam("line2Level");
	const { value: line1Octave, setValue: setLine1Octave } =
		useSynthParam("line1Octave");
	const { value: line2Octave, setValue: setLine2Octave } =
		useSynthParam("line2Octave");
	const { value: line1Detune, setValue: setLine1Detune } =
		useSynthParam("line1Detune");
	const { value: line2Detune, setValue: setLine2Detune } =
		useSynthParam("line2Detune");
	const { value: line1DcoDepth, setValue: setLine1DcoDepth } =
		useSynthParam("line1DcoDepth");
	const { value: line2DcoDepth, setValue: setLine2DcoDepth } =
		useSynthParam("line2DcoDepth");
	const { value: line1DcoEnv, setValue: setLine1DcoEnv } =
		useSynthParam("line1DcoEnv");
	const { value: line1DcwEnv, setValue: setLine1DcwEnv } =
		useSynthParam("line1DcwEnv");
	const { value: line1DcaEnv, setValue: setLine1DcaEnv } =
		useSynthParam("line1DcaEnv");
	const { value: line1CzSlotAWaveform, setValue: setLine1CzSlotAWaveform } =
		useSynthParam("line1CzSlotAWaveform");
	const { value: line1CzSlotBWaveform, setValue: setLine1CzSlotBWaveform } =
		useSynthParam("line1CzSlotBWaveform");
	const { value: line1CzWindow, setValue: setLine1CzWindow } =
		useSynthParam("line1CzWindow");
	const { value: line1AlgoControls, setValue: setLine1AlgoControls } =
		useSynthParam("line1AlgoControls");
	const { value: line2DcoEnv, setValue: setLine2DcoEnv } =
		useSynthParam("line2DcoEnv");
	const { value: line2DcwEnv, setValue: setLine2DcwEnv } =
		useSynthParam("line2DcwEnv");
	const { value: line2DcaEnv, setValue: setLine2DcaEnv } =
		useSynthParam("line2DcaEnv");
	const { value: line2CzSlotAWaveform, setValue: setLine2CzSlotAWaveform } =
		useSynthParam("line2CzSlotAWaveform");
	const { value: line2CzSlotBWaveform, setValue: setLine2CzSlotBWaveform } =
		useSynthParam("line2CzSlotBWaveform");
	const { value: line2CzWindow, setValue: setLine2CzWindow } =
		useSynthParam("line2CzWindow");
	const { value: line2AlgoControls, setValue: setLine2AlgoControls } =
		useSynthParam("line2AlgoControls");
	const { value: line1DcwKeyFollow, setValue: setLine1DcwKeyFollow } =
		useSynthParam("line1DcwKeyFollow");
	const { value: line2DcwKeyFollow, setValue: setLine2DcwKeyFollow } =
		useSynthParam("line2DcwKeyFollow");

	const line1 = {
		warpAmount: warpAAmount,
		setWarpAmount: setWarpAAmount,
		algo: warpAAlgo,
		setAlgo: setWarpAAlgo as (value: Algo) => void,
		algo2: algo2A,
		setAlgo2: setAlgo2A as (value: Algo | null) => void,
		algoBlend: algoBlendA,
		setAlgoBlend: setAlgoBlendA,
		dcwComp: line1DcwComp,
		setDcwComp: setLine1DcwComp,
		level: line1Level,
		setLevel: setLine1Level,
		octave: line1Octave,
		setOctave: setLine1Octave,
		fineDetune: line1Detune,
		setFineDetune: setLine1Detune,
		dcoDepth: line1DcoDepth,
		setDcoDepth: setLine1DcoDepth,
		dcoEnv: line1DcoEnv,
		setDcoEnv: envOverrideHandlers?.onLine1DcoEnvChange ?? setLine1DcoEnv,
		dcwEnv: line1DcwEnv,
		setDcwEnv: envOverrideHandlers?.onLine1DcwEnvChange ?? setLine1DcwEnv,
		dcaEnv: line1DcaEnv,
		setDcaEnv: envOverrideHandlers?.onLine1DcaEnvChange ?? setLine1DcaEnv,
		czSlotAWaveform: line1CzSlotAWaveform,
		setCzSlotAWaveform: setLine1CzSlotAWaveform,
		czSlotBWaveform: line1CzSlotBWaveform,
		setCzSlotBWaveform: setLine1CzSlotBWaveform,
		czWindow: line1CzWindow,
		setCzWindow: setLine1CzWindow,
		algoControls: line1AlgoControls,
		setAlgoControls: setLine1AlgoControls,
		keyFollow: line1DcwKeyFollow,
		setKeyFollow: setLine1DcwKeyFollow,
	};

	const line2 = {
		warpAmount: warpBAmount,
		setWarpAmount: setWarpBAmount,
		algo: warpBAlgo,
		setAlgo: setWarpBAlgo as (value: Algo) => void,
		algo2: algo2B,
		setAlgo2: setAlgo2B as (value: Algo | null) => void,
		algoBlend: algoBlendB,
		setAlgoBlend: setAlgoBlendB,
		dcwComp: line2DcwComp,
		setDcwComp: setLine2DcwComp,
		level: line2Level,
		setLevel: setLine2Level,
		octave: line2Octave,
		setOctave: setLine2Octave,
		fineDetune: line2Detune,
		setFineDetune: setLine2Detune,
		dcoDepth: line2DcoDepth,
		setDcoDepth: setLine2DcoDepth,
		dcoEnv: line2DcoEnv,
		setDcoEnv: envOverrideHandlers?.onLine2DcoEnvChange ?? setLine2DcoEnv,
		dcwEnv: line2DcwEnv,
		setDcwEnv: envOverrideHandlers?.onLine2DcwEnvChange ?? setLine2DcwEnv,
		dcaEnv: line2DcaEnv,
		setDcaEnv: envOverrideHandlers?.onLine2DcaEnvChange ?? setLine2DcaEnv,
		czSlotAWaveform: line2CzSlotAWaveform,
		setCzSlotAWaveform: setLine2CzSlotAWaveform,
		czSlotBWaveform: line2CzSlotBWaveform,
		setCzSlotBWaveform: setLine2CzSlotBWaveform,
		czWindow: line2CzWindow,
		setCzWindow: setLine2CzWindow,
		algoControls: line2AlgoControls,
		setAlgoControls: setLine2AlgoControls,
		keyFollow: line2DcwKeyFollow,
		setKeyFollow: setLine2DcwKeyFollow,
	};

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
	const leftTabGroups: Array<{
		label: "L1" | "L2";
		color: "red" | "blue";
		tabs: Array<{
			id: SidePanelTab;
			bottomLabel: string;
		}>;
	}> = [
		{
			label: "L1",
			color: "red",
			tabs: [
				{ id: "line1-algos", bottomLabel: "WAVE FORM" },
				{ id: "line1-envelopes", bottomLabel: "ENV" },
			],
		},
		{
			label: "L2",
			color: "blue",
			tabs: [
				{ id: "line2-algos", bottomLabel: "WAVE FORM" },
				{ id: "line2-envelopes", bottomLabel: "ENV" },
			],
		},
	];

	return (
		<Card variant="panel-slanted" padding="none" className={panelClassName}>
			<div className="cz-collapse-header cz-section-slanted-title py-0 shrink-0 justify-center">
				Phase Lines
			</div>
			<div className="bg-cz-panel p-2 flex-1 min-h-0 min-w-0 flex overflow-hidden">
				<div className="flex-1 min-h-0 min-w-0 flex gap-2 items-stretch">
					<div className="w-16 shrink-0 self-stretch flex flex-col gap-5 justify-center">
						{leftTabGroups.map((group) => (
							<div
								key={group.label}
								className="flex flex-col gap-4 bg-cz-inset/80 rounded-lg p-1.5 py-3"
							>
								<div className="text-center text-[0.6rem] font-bold tracking-[0.12em] text-cz-cream">
									{group.label}
								</div>
								{group.tabs.map((tab) => (
									<CzTabButton
										key={tab.id}
										active={activeTab === tab.id}
										onClick={() => setActiveTab(tab.id)}
										topLabel=""
										bottomLabel={tab.bottomLabel}
										color={group.color}
										showLed
									/>
								))}
							</div>
						))}
					</div>

					<PerLineWarpBlock
						key={activeLineLabel}
						label={activeLineLabel}
						color="#9cb937"
						lineIndex={activeLine === "line1" ? 1 : 2}
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
						czSlotAWaveform={activeLineConfig.czSlotAWaveform}
						setCzSlotAWaveform={activeLineConfig.setCzSlotAWaveform}
						czSlotBWaveform={activeLineConfig.czSlotBWaveform}
						setCzSlotBWaveform={activeLineConfig.setCzSlotBWaveform}
						czWindow={activeLineConfig.czWindow}
						setCzWindow={activeLineConfig.setCzWindow}
						algoControls={activeLineConfig.algoControls}
						setAlgoControls={activeLineConfig.setAlgoControls}
						keyFollow={activeLineConfig.keyFollow}
						setKeyFollow={activeLineConfig.setKeyFollow}
						activeSection={activeSection}
					/>
				</div>
			</div>
		</Card>
	);
}
