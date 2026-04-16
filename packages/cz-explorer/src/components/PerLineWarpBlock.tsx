import { memo, useEffect, useState } from "react";
import AlgoIconGrid from "./AlgoIconGrid";
import type { PdAlgo, StepEnvData } from "./pdAlgorithms";
import { PD_ALGOS } from "./pdAlgorithms";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";
import Card from "./ui/Card";
import CzButton from "./ui/CzButton";
import CzVerticalSlider from "./ui/CzVerticalSlider";

interface PerLineWarpBlockProps {
	label: string;
	color: string;
	algo: PdAlgo;
	setAlgo: (a: PdAlgo) => void;
	algo2: PdAlgo | null;
	setAlgo2: (a: PdAlgo | null) => void;
	algoBlend: number;
	setAlgoBlend: (v: number) => void;
	warpAmount: number;
	setWarpAmount: (v: number) => void;
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
	setDcoEnv: (e: StepEnvData) => void;
	dcwEnv: StepEnvData;
	setDcwEnv: (e: StepEnvData) => void;
	dcaEnv: StepEnvData;
	setDcaEnv: (e: StepEnvData) => void;
	keyFollow: number;
	setKeyFollow: (v: number) => void;
	showSectionTabs?: boolean;
	activeSection?: SectionTab;
	onActiveSectionChange?: (section: SectionTab) => void;
}

type EnvTab = "dco" | "dcw" | "dca";
type SectionTab = "algos" | "envelopes";

export const PerLineWarpBlock = memo(function PerLineWarpBlock({
	label,
	color,
	algo,
	setAlgo,
	algo2,
	setAlgo2,
	algoBlend,
	setAlgoBlend,
	warpAmount,
	setWarpAmount,
	dcwComp,
	setDcwComp,
	level,
	setLevel,
	octave,
	setOctave,
	fineDetune,
	setFineDetune,
	dcoDepth,
	setDcoDepth,
	dcoEnv,
	setDcoEnv,
	dcwEnv,
	setDcwEnv,
	dcaEnv,
	setDcaEnv,
	keyFollow,
	setKeyFollow,
	showSectionTabs = true,
	activeSection: activeSectionProp,
	onActiveSectionChange,
}: PerLineWarpBlockProps) {
	const [activeEnvTab, setActiveEnvTab] = useState<EnvTab>("dcw");
	const [internalActiveSection, setInternalActiveSection] =
		useState<SectionTab>("algos");
	const activeSection = activeSectionProp ?? internalActiveSection;
	const setActiveSection = onActiveSectionChange ?? setInternalActiveSection;

	// Auto-set algo2 to first algo when blend is raised from 0 with nothing selected
	useEffect(() => {
		if (algoBlend > 0 && algo2 == null) {
			setAlgo2(PD_ALGOS[0].value as PdAlgo);
		}
	}, [algoBlend, algo2, setAlgo2]);

	const envMap: Record<
		EnvTab,
		{
			title: string;
			env: StepEnvData;
			setEnv: (env: StepEnvData) => void;
			envColor: string;
		}
	> = {
		dco: {
			title: `${label} DCO`,
			env: dcoEnv,
			setEnv: setDcoEnv,
			envColor: "#9cb937",
		},
		dcw: {
			title: `${label} DCW`,
			env: dcwEnv,
			setEnv: setDcwEnv,
			envColor: color,
		},
		dca: {
			title: `${label} DCA`,
			env: dcaEnv,
			setEnv: setDcaEnv,
			envColor: "#3dff3d",
		},
	};

	const activeEnv = envMap[activeEnvTab];

	const sectionTabClass = (tab: SectionTab) =>
		`flex-1 flex items-center justify-center rounded-lg border uppercase tracking-[0.2em] text-[11px] font-semibold transition-colors ${
			activeSection === tab
				? "w-full px-1 py-3 text-cz-gold border-cz-gold bg-cz-card/40"
				: "w-full px-1 py-3 text-cz-light-blue border-cz-border bg-cz-panel hover:border-cz-gold/60"
		}`;

	return (
		<div className="min-w-0 min-h-0 flex-1 flex flex-col">
			<div className="flex flex-1 min-h-0 gap-2 items-stretch">
				{showSectionTabs && (
					<div className="w-12 shrink-0 self-stretch flex flex-col gap-2">
						<button
							type="button"
							className={sectionTabClass("algos")}
							onClick={() => setActiveSection("algos")}
							aria-pressed={activeSection === "algos"}
						>
							<span className="[writing-mode:vertical-rl] [text-orientation:mixed]">
								ALGORITHMS + PARAMETERS
							</span>
						</button>
						<button
							type="button"
							className={sectionTabClass("envelopes")}
							onClick={() => setActiveSection("envelopes")}
							aria-pressed={activeSection === "envelopes"}
						>
							<span className="[writing-mode:vertical-rl] [text-orientation:mixed]">
								ENVELOPES
							</span>
						</button>
					</div>
				)}

				<div className="min-h-0 min-w-0 h-full flex-1 flex flex-col overflow-hidden rounded-lg border border-cz-gold bg-cz-card/30">
					{activeSection === "algos" ? (
						<div className="flex-1 min-h-0 overflow-y-auto p-3">
							<div className="grid min-h-full content-start gap-4 md:grid-cols-2 md:grid-rows-[auto_minmax(0,1fr)]">
								<Card variant="subtle" className="p-3 col-span-1">
									<div className="flex justify-between">
										<div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cz-cream">
											Algo A
										</div>
										<span className="text-[10px] uppercase tracking-[0.2em] text-cz-light-blue font-bold">
											{PD_ALGOS.find((a) => a.value === algo)?.label}
										</span>
									</div>
									<AlgoIconGrid value={algo} onChange={setAlgo} size={36} />
								</Card>
								<Card variant="subtle" className="p-3 col-span-1">
									<div className="flex justify-between">
										<div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cz-cream">
											Algo B
										</div>
										<span className="text-[10px] uppercase tracking-[0.2em] text-cz-light-blue font-bold">
											{PD_ALGOS.find((b) => b.value === algo2)?.label}
										</span>
									</div>
									<AlgoIconGrid
										value={algo2 ?? PD_ALGOS[0].value}
										onChange={setAlgo2}
										size={36}
										disabled={algoBlend === 0}
									/>
									<div className="space-y-3 mt-2">
										<div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-cz-cream">
											<span>Blend</span>
											<span>{Math.round(algoBlend * 100)}%</span>
										</div>
										<input
											type="range"
											min={0}
											max={100}
											value={Math.round(algoBlend * 100)}
											onChange={(e) => setAlgoBlend(Number(e.target.value) / 100)}
											className="range range-xs w-full gh"
											style={{ accentColor: "#9cb937" }}
										/>
									</div>
								</Card>

								<Card variant="subtle" className="p-3 md:col-span-2 h-full">
									<div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-cz-cream">
										Parameters
									</div>
									<div className="flex flex-wrap gap-5">
										{[
											{
												label: "DCW Amt",
												value: warpAmount,
												min: 0,
												max: 1,
												step: 0.01,
												color: color,
												fmt: (v: number) => v.toFixed(2),
												onChange: setWarpAmount,
											},
											{
												label: "DCW Comp",
												value: dcwComp,
												min: 0,
												max: 1,
												step: 0.01,
												color: "#7f9de4",
												fmt: (v: number) => `${Math.round(v * 100)}%`,
												onChange: setDcwComp,
											},
											{
												label: "Level",
												value: level,
												min: 0,
												max: 1,
												step: 0.01,
												color: "#9cb937",
												fmt: (v: number) => `${Math.round(v * 100)}%`,
												onChange: setLevel,
											},
											{
												label: "Oct",
												value: octave,
												min: -2,
												max: 2,
												step: 1,
												color: "#7f9de4",
												fmt: (v: number) =>
													`${v >= 0 ? "+" : ""}${Math.round(v)}`,
												onChange: (v: number) => setOctave(Math.round(v)),
											},
											{
												label: "Fine",
												value: fineDetune,
												min: -50,
												max: 50,
												step: 1,
												color: "#9cb937",
												fmt: (v: number) =>
													`${v >= 0 ? "+" : ""}${Math.round(v)}`,
												onChange: (v: number) => setFineDetune(Math.round(v)),
											},
											{
												label: "DCO Rng",
												value: dcoDepth,
												min: 0,
												max: 24,
												step: 1,
												color: "#9cb937",
												fmt: (v: number) => `${Math.round(v)} st`,
												onChange: (v: number) => setDcoDepth(Math.round(v)),
											},
										].map(
											({
												label,
												value,
												min,
												max,
												step,
												color: c,
												fmt,
												onChange,
											}) => (
												<div key={label} className="flex flex-col items-center gap-1.5">
													<span className="text-[9px] uppercase tracking-[0.18em] text-cz-cream whitespace-nowrap">
														{fmt(value)}
													</span>
													<CzVerticalSlider
														value={value}
														min={min}
														max={max}
														step={step}
														color={c}
														onChange={onChange}
														trackHeight={96}
													/>
													<span className="text-[9px] uppercase tracking-[0.18em] text-cz-cream whitespace-nowrap">
														{label}
													</span>
												</div>
											),
										)}
									</div>
								</Card>
							</div>
						</div>
					) : (
						<div className="flex-1 min-h-0 overflow-y-auto p-3">
							<Card variant="subtle" className="p-3 min-w-0">
								<div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cz-cream">
									Envelope Matrix
								</div>
								<div className="mb-2 flex gap-1">
									{(["dco", "dcw", "dca"] as EnvTab[]).map((tab) => (
										<CzButton
											key={tab}
											active={activeEnvTab === tab}
											onClick={() => setActiveEnvTab(tab)}
											className="[&_button]:bg-cz-inset [&_button]:border-cz-border"
										>
											{tab.toUpperCase()}
										</CzButton>
									))}
								</div>
								<StepEnvelopeEditor
									title={activeEnv.title}
									env={activeEnv.env}
									onChange={activeEnv.setEnv}
									color={activeEnv.envColor}
									compact
								/>
								<div className="mt-2 flex items-center gap-2">
									<span className="text-[10px] text-cz-cream uppercase tracking-[0.2em]">
										Key Follow:
									</span>
									<input
										type="range"
										min={0}
										max={9}
										value={keyFollow}
										onChange={(e) => setKeyFollow(Number(e.target.value))}
										className="range range-xs"
										style={{ accentColor: "var(--color-cz-gold)" }}
									/>
									<span className="text-xs text-cz-cream w-4">{keyFollow}</span>
								</div>
							</Card>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

export default PerLineWarpBlock;
