import { memo, useEffect, useState } from "react";
import AlgoIconGrid from "./AlgoIconGrid";
import type { PdAlgo, StepEnvData } from "./pdAlgorithms";
import { PD_ALGOS } from "./pdAlgorithms";
import { SingleCycleDisplay } from "./SingleCycleDisplay";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";
import Card from "./ui/Card";
import CzButton from "./ui/CzButton";
import CzVerticalSlider from "./ui/CzVerticalSlider";

interface PerLineWarpBlockProps {
	label: string;
	waveform: Float32Array | number[];
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
}

type EnvTab = "dco" | "dcw" | "dca";

export const PerLineWarpBlock = memo(function PerLineWarpBlock({
	label,
	waveform,
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
}: PerLineWarpBlockProps) {
	const [activeEnvTab, setActiveEnvTab] = useState<EnvTab>("dcw");

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

	return (
		<div className="min-w-0">
			<div>
				<div className="grid gap-4 grid-cols-[220px_minmax(0,1fr)]">
					<div className="space-y-4">
						<SingleCycleDisplay
							data={waveform}
							color={color}
							label="Single Cycle"
							width={176}
							height={64}
						/>

						<Card variant="subtle" className="p-3">
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

						<Card variant="subtle" className="p-3">
							<div className="flex justify-between">
								<div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cz-cream">
									Algo B
								</div>
								<span className="text-[10px] uppercase tracking-[0.2em] text-cz-light-blue font-bold">
									{PD_ALGOS.find((b) => b.value === algo2)?.label}
								</span>
							</div>
							<div className="space-y-3">
								<div className="space-y-1">
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
										className="range range-xs w-full"
										style={{ accentColor: "#9cb937" }}
									/>
								</div>
								<AlgoIconGrid
									value={(algo2 ?? PD_ALGOS[0].value) as PdAlgo}
									onChange={(value) => setAlgo2(value)}
									size={30}
									disabled={algoBlend === 0}
								/>
							</div>
						</Card>
					</div>

					<div className="space-y-4">
						{/* Sliders + Envelope Matrix side by side */}
						<div className="flex flex-wrap gap-4">
							{/* Parameters card */}
							<Card variant="subtle" className="p-3 shrink-0 h-fit">
								<div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-cz-cream">
									Parameters
								</div>
								<div className="flex gap-5">
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
											<div
												key={label}
												className="flex flex-col items-center gap-1.5"
											>
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

							{/* Envelope Matrix card */}
							<Card variant="subtle" className="p-3 flex-1 min-w-0">
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
					</div>
				</div>
			</div>
		</div>
	);
});

export default PerLineWarpBlock;
