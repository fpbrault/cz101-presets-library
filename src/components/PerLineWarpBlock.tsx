import { memo, useEffect, useState } from "react";
import AlgoIconGrid from "./AlgoIconGrid";
import ControlKnob from "./ControlKnob";
import type { PdAlgo, StepEnvData } from "./pdAlgorithms";
import { PD_ALGOS } from "./pdAlgorithms";
import { SingleCycleDisplay } from "./SingleCycleDisplay";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";

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
			envColor: "#f59e0b",
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
			envColor: "#34d399",
		},
	};

	const activeEnv = envMap[activeEnvTab];

	return (
		<section className="min-w-0 overflow-hidden rounded-[1.6rem] border border-base-300/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),rgba(255,255,255,0)_42%),linear-gradient(180deg,rgba(26,27,40,0.98),rgba(18,19,30,0.98))] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.28)]">
			<div className="mb-4 flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="text-[10px] uppercase tracking-[0.32em] text-base-content/45">
						Phase Line
					</div>
					<h2 className="text-lg font-semibold text-base-content">{label}</h2>
				</div>
				<div className="rounded-full border border-base-300/70 bg-base-300/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-base-content/60">
					CZ Tone Stack
				</div>
			</div>

			<div className="mb-4 flex flex-wrap gap-2">
				<button
					type="button"
					className="btn btn-xs btn-outline"
					onClick={onCopyAlgos}
				>
					Clone Algo to {copyTargetLabel}
				</button>
				<button
					type="button"
					className="btn btn-xs btn-outline"
					onClick={onCopyEnvelopes}
				>
					Clone DCA/DCW/DCO to {copyTargetLabel}
				</button>
				<button
					type="button"
					className="btn btn-xs btn-primary"
					onClick={onCopyFull}
				>
					Clone Full Line to {copyTargetLabel}
				</button>
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

					<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3">
						<div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-base-content/55">
							Algo A
						</div>
						<AlgoIconGrid value={algo} onChange={setAlgo} size={36} />
					</div>

					<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3">
						<div className="mb-2 flex items-center justify-between">
							<div className="text-[10px] uppercase tracking-[0.24em] text-base-content/55">
								Algo B
							</div>
							<button
								type="button"
								className={`btn btn-xs ${algo2Enabled ? "btn-primary" : "btn-outline"}`}
								onClick={() => {
									if (algo2Enabled) {
										setAlgo2(null);
										setAlgo2Enabled(false);
										return;
									}
									setAlgo2(PD_ALGOS[0].value as PdAlgo);
									setAlgo2Enabled(true);
								}}
							>
								{algo2Enabled ? "Active" : "Off"}
							</button>
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
										color="#ff71ce"
										label="Blend"
										valueFormatter={(value) => `${Math.round(value * 100)}%`}
									/>
								</div>
							</div>
						) : (
							<div className="rounded-xl border border-dashed border-base-300/60 px-3 py-4 text-center text-xs text-base-content/45">
								Stack a second algorithm for denser CZ-style motion.
							</div>
						)}
					</div>
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
							color="#7dd3fc"
							label="DCW Vol Comp"
							valueFormatter={(value) => `${Math.round(value * 100)}%`}
						/>
						<ControlKnob
							value={level}
							onChange={setLevel}
							min={0}
							max={1}
							color="#c084fc"
							label="Level"
							valueFormatter={(value) => `${Math.round(value * 100)}%`}
						/>
						<ControlKnob
							value={octave}
							onChange={(value) => setOctave(Math.round(value))}
							min={-2}
							max={2}
							color="#67e8f9"
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
							color="#fef08a"
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
							color="#fdba74"
							label="DCO Range"
							valueFormatter={(value) => `${Math.round(value)} st`}
						/>
					</div>

					<div className="rounded-2xl border border-base-300/70 bg-base-300/20 p-3">
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
							<div className="text-[10px] uppercase tracking-[0.24em] text-base-content/55">
								Envelope Matrix
							</div>
							<div className="join">
								{(["dco", "dcw", "dca"] as EnvTab[]).map((tab) => (
									<button
										key={tab}
										type="button"
										className={`btn btn-xs join-item ${activeEnvTab === tab ? "btn-primary" : "btn-outline"}`}
										onClick={() => setActiveEnvTab(tab)}
									>
										{tab.toUpperCase()}
									</button>
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
							<span className="text-[10px] text-base-content/55">
								Key Follow:
							</span>
							<input
								type="range"
								min={0}
								max={9}
								value={keyFollow}
								onChange={(e) => setKeyFollow(Number(e.target.value))}
								className="range range-xs range-primary"
							/>
							<span className="text-xs text-base-content/60 w-4">
								{keyFollow}
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
});

export default PerLineWarpBlock;
