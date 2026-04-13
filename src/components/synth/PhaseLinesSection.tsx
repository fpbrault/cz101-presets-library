import { type RefObject, useState } from "react";
import { PerLineWarpBlock } from "@/components/PerLineWarpBlock";
import type { PdAlgo, StepEnvData } from "@/components/pdAlgorithms";
import Card from "@/components/ui/Card";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import CzButton from "@/components/ui/CzButton";

type LineSelect = "L1" | "L2" | "L1+L2" | "L1+L1'" | "L1+L2'";
type ModMode = "normal" | "ring" | "noise";

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
	setLineSelect: (v: LineSelect) => void;
	modMode: ModMode;
	setModMode: (v: ModMode) => void;
	line1: LineConfig;
	line2: LineConfig;
	onCopyLine1ToLine2: (mode: "algos" | "envelopes" | "full") => void;
	onCopyLine2ToLine1: (mode: "algos" | "envelopes" | "full") => void;
	combinedCanvasRef: RefObject<HTMLCanvasElement | null>;
	phaseCanvasRef: RefObject<HTMLCanvasElement | null>;
};

export default function PhaseLinesSection({
	lineSelect,
	setLineSelect,
	modMode,
	setModMode,
	line1,
	line2,
	onCopyLine1ToLine2,
	onCopyLine2ToLine1,
	combinedCanvasRef,
	phaseCanvasRef,
}: PhaseLinesSectionProps) {
	const showLineA = lineSelect !== "L2";
	const [activeTab, setActiveTab] = useState<"line1" | "line2">("line1");

	const handleCopyAlgos = () =>
		activeTab === "line1"
			? onCopyLine1ToLine2("algos")
			: onCopyLine2ToLine1("algos");
	const handleCopyEnvelopes = () =>
		activeTab === "line1"
			? onCopyLine1ToLine2("envelopes")
			: onCopyLine2ToLine1("envelopes");
	const handleCopyFull = () =>
		activeTab === "line1"
			? onCopyLine1ToLine2("full")
			: onCopyLine2ToLine1("full");

	const copyTargetLabel = activeTab === "line1" ? "Line 2" : "Line 1";

	return (
		<CollapsibleCard title="Phase Lines" variant="panel-slanted" open>
			{/* Line Select + Modulation */}
			<div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-cz-border pb-3">
				<div className="shrink-0">
					<div className="mb-1 cz-light-blue">Line Select</div>
					<div className="flex gap-1">
						{(["L1", "L1+L2", "L2", "L1+L1'", "L1+L2'"] as const).map((ls) => (
							<CzButton
								key={ls}
								active={lineSelect === ls}
								onClick={() => setLineSelect(ls)}
							>
								{ls}
							</CzButton>
						))}
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
								onClick={() => setModMode(mode)}
								className="flex-1"
							>
								{label}
							</CzButton>
						))}
					</div>
				</div>
				<div className="shrink-0">
					<div className="mb-1 cz-light-blue">Clone</div>
					<div className="flex gap-1">
						<CzButton led={false} onClick={handleCopyAlgos}>
							Algo
						</CzButton>
						<CzButton led={false} onClick={handleCopyEnvelopes}>
							Env
						</CzButton>
						<CzButton led={false} onClick={handleCopyFull}>
							All
						</CzButton>
					</div>
				</div>

				{/* Mix A/B + Phase Map */}
				<div className="ml-auto grid grid-cols-2 gap-3">
					<Card variant="inset" className="border-cz-border p-2">
						<div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-cz-cream-dim">
							Mix A/B
						</div>
						<canvas
							ref={combinedCanvasRef as RefObject<HTMLCanvasElement>}
							width={220}
							height={70}
							className="h-17.5 w-full rounded-lg"
						/>
					</Card>
					<Card variant="inset" className="border-cz-border p-2">
						<div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-cz-cream-dim">
							Phase Map
						</div>
						<canvas
							ref={phaseCanvasRef as RefObject<HTMLCanvasElement>}
							width={220}
							height={70}
							className="h-17.5 w-full rounded-lg"
						/>
					</Card>
				</div>
			</div>

			{/* Phase Line Tabs */}
			<div className="tabs tabs-lift">
				<input
					type="radio"
					name="phase_line_tabs"
					className="tab bg-cz-surface"
					aria-label="Line 1"
					defaultChecked={true}
					onChange={() => setActiveTab("line1")}
				/>
				<div className="tab-content bg-cz-surface p-4">
					<PerLineWarpBlock
						label="Line 1"
						waveform={line1.waveform}
						color="#3dff3d"
						algo={line1.algo}
						setAlgo={line1.setAlgo}
						algo2={line1.algo2}
						setAlgo2={line1.setAlgo2}
						algoBlend={line1.algoBlend}
						setAlgoBlend={line1.setAlgoBlend}
						warpAmount={line1.warpAmount}
						setWarpAmount={line1.setWarpAmount}
						dcwComp={line1.dcwComp}
						setDcwComp={line1.setDcwComp}
						level={line1.level}
						setLevel={line1.setLevel}
						octave={line1.octave}
						setOctave={line1.setOctave}
						fineDetune={line1.fineDetune}
						setFineDetune={line1.setFineDetune}
						dcoDepth={line1.dcoDepth}
						setDcoDepth={line1.setDcoDepth}
						dcoEnv={line1.dcoEnv}
						setDcoEnv={line1.setDcoEnv}
						dcwEnv={line1.dcwEnv}
						setDcwEnv={line1.setDcwEnv}
						dcaEnv={line1.dcaEnv}
						setDcaEnv={line1.setDcaEnv}
						keyFollow={line1.keyFollow}
						setKeyFollow={line1.setKeyFollow}
					/>
				</div>

				<input
					type="radio"
					name="phase_line_tabs"
					className="tab"
					aria-label="Line 2"
					defaultChecked={!showLineA}
					onChange={() => setActiveTab("line2")}
				/>
				<div className="tab-content bg-cz-panel border-cz-border p-4">
					<PerLineWarpBlock
						label="Line 2"
						waveform={line2.waveform}
						color="#9cb937"
						algo={line2.algo}
						setAlgo={line2.setAlgo}
						algo2={line2.algo2}
						setAlgo2={line2.setAlgo2}
						algoBlend={line2.algoBlend}
						setAlgoBlend={line2.setAlgoBlend}
						warpAmount={line2.warpAmount}
						setWarpAmount={line2.setWarpAmount}
						dcwComp={line2.dcwComp}
						setDcwComp={line2.setDcwComp}
						level={line2.level}
						setLevel={line2.setLevel}
						octave={line2.octave}
						setOctave={line2.setOctave}
						fineDetune={line2.fineDetune}
						setFineDetune={line2.setFineDetune}
						dcoDepth={line2.dcoDepth}
						setDcoDepth={line2.setDcoDepth}
						dcoEnv={line2.dcoEnv}
						setDcoEnv={line2.setDcoEnv}
						dcwEnv={line2.dcwEnv}
						setDcwEnv={line2.setDcwEnv}
						dcaEnv={line2.dcaEnv}
						setDcaEnv={line2.setDcaEnv}
						keyFollow={line2.keyFollow}
						setKeyFollow={line2.setKeyFollow}
					/>
				</div>
			</div>
		</CollapsibleCard>
	);
}
