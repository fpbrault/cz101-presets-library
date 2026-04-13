import { memo, useEffect, useState } from "react";
import AlgoIconGrid from "./AlgoIconGrid";
import ControlKnob from "./ControlKnob";
import type { PdAlgo, StepEnvData } from "./pdAlgorithms";
import { PD_ALGOS } from "./pdAlgorithms";
import { SingleCycleDisplay } from "./SingleCycleDisplay";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";
import Card from "./ui/Card";
import CzButton from "./ui/CzButton";

interface PerLineWarpBlockProps {
	label: string;
	waveform: Float32Array | number[];
	color: string;
	copyTargetLabel: string;
	onCopyAlgos: () => void;
	onCopyEnvelopes: () => void;
	onCopyFull: () => void;
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
	copyTargetLabel,
	onCopyAlgos,
	onCopyEnvelopes,
	onCopyFull,
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
	const [algo2Enabled, setAlgo2Enabled] = useState(algo2 != null);
	const [activeEnvTab, setActiveEnvTab] = useState<EnvTab>("dcw");

	useEffect(() => {
		setAlgo2Enabled(algo2 != null);
	}, [algo2]);

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
				<div className="mb-4 flex flex-wrap gap-2">
					<CzButton onClick={onCopyAlgos}>
						Clone Algo → {copyTargetLabel}
					</CzButton>
					<CzButton onClick={onCopyEnvelopes}>
						Clone Envs → {copyTargetLabel}
					</CzButton>
					<CzButton onClick={onCopyFull} active>
						Clone Full → {copyTargetLabel}
					</CzButton>
				</div>

				<div className="grid gap-4 min-[1500px]:grid-cols-[220px_minmax(0,1fr)]">
					<div className="space-y-4">
						<SingleCycleDisplay
							data={waveform}
							color={color}
							label="Single Cycle"
							width={176}
							height={64}
						/>

						<Card variant="subtle" className="p-3">
							<div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cz-cream-dim">
								Algo A
							</div>
							<AlgoIconGrid value={algo} onChange={setAlgo} size={36} />
						</Card>

						<Card variant="subtle" className="p-3">
							<div className="mb-2 flex items-center justify-between">
								<div className="text-[10px] uppercase tracking-[0.24em] text-cz-cream-dim">
									Algo B
								</div>
								<CzButton
									active={algo2Enabled}
									onClick={() => {
										if (algo2Enabled) {
											setAlgo2(null);
											setAlgo2Enabled(false);
											return;
										}
										setAlgo2(PD_ALGOS[0].value as PdAlgo);
										setAlgo2Enabled(true);
									}}
									className="[&_button]:bg-cz-inset [&_button]:border-cz-border"
								>
									{algo2Enabled ? "Active" : "Off"}
								</CzButton>
							</div>
							{algo2Enabled ? (
								<div className="space-y-3">
									<AlgoIconGrid
										value={(algo2 ?? PD_ALGOS[0].value) as PdAlgo}
										onChange={(value) => setAlgo2(value)}
										size={30}
									/>
									<div className="flex justify-center">
										<ControlKnob
											value={algoBlend}
											onChange={setAlgoBlend}
											min={0}
											max={1}
											size={50}
											color="#9cb937"
											label="Blend"
											valueFormatter={(value) => `${Math.round(value * 100)}%`}
										/>
									</div>
								</div>
							) : (
								<div className="rounded border border-dashed border-cz-border px-3 py-4 text-center text-xs text-cz-cream-dim">
									Stack a second algorithm for denser CZ-style motion.
								</div>
							)}
						</Card>
					</div>

					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
							<ControlKnob
								value={warpAmount}
								onChange={setWarpAmount}
								min={0}
								max={1}
								color={color}
								label="DCW Amt"
								valueFormatter={(value) => value.toFixed(2)}
							/>
							<ControlKnob
								value={dcwComp}
								onChange={setDcwComp}
								min={0}
								max={1}
								color="#7f9de4"
								label="DCW Vol Comp"
								valueFormatter={(value) => `${Math.round(value * 100)}%`}
							/>
							<ControlKnob
								value={level}
								onChange={setLevel}
								min={0}
								max={1}
								color="#9cb937"
								label="Level"
								valueFormatter={(value) => `${Math.round(value * 100)}%`}
							/>
							<ControlKnob
								value={octave}
								onChange={(value) => setOctave(Math.round(value))}
								min={-2}
								max={2}
								color="#7f9de4"
								label="Oct"
								valueFormatter={(value) =>
									`${value >= 0 ? "+" : ""}${Math.round(value)}`
								}
							/>
							<ControlKnob
								value={fineDetune}
								onChange={(value) => setFineDetune(Math.round(value))}
								min={-50}
								max={50}
								color="#9cb937"
								label="Fine"
								valueFormatter={(value) =>
									`${value >= 0 ? "+" : ""}${Math.round(value)}`
								}
							/>
							<ControlKnob
								value={dcoDepth}
								onChange={(value) => setDcoDepth(Math.round(value))}
								min={0}
								max={24}
								color="#9cb937"
								label="DCO Range"
								valueFormatter={(value) => `${Math.round(value)} st`}
							/>
						</div>

						<Card variant="subtle" className="p-3">
							<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
								<div className="text-[10px] uppercase tracking-[0.24em] text-cz-cream-dim">
									Envelope Matrix
								</div>
								<div className="flex gap-1">
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
							</div>
							<StepEnvelopeEditor
								title={activeEnv.title}
								env={activeEnv.env}
								onChange={activeEnv.setEnv}
								color={activeEnv.envColor}
							/>
							<div className="mt-2 flex items-center gap-2">
								<span className="text-[10px] text-cz-cream-dim uppercase tracking-[0.2em]">
									Key Follow:
								</span>
								<input
									type="range"
									min={0}
									max={9}
									value={keyFollow}
									onChange={(e) => setKeyFollow(Number(e.target.value))}
									className="range range-xs"
									style={{ accentColor: "var(--color-cz-orange)" }}
								/>
								<span className="text-xs text-cz-cream w-4">{keyFollow}</span>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
});

export default PerLineWarpBlock;
