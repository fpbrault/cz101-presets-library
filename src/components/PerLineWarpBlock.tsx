import { memo, useState } from "react";
import AlgoIconGrid from "./AlgoIconGrid";
import type { PdAlgo, StepEnvData } from "./pdAlgorithms";
import { PD_ALGOS } from "./pdAlgorithms";
import { SingleCycleDisplay } from "./SingleCycleDisplay";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";

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
}

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
}: PerLineWarpBlockProps) {
	const [algo2Enabled, setAlgo2Enabled] = useState(false);

	return (
		<div className="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm flex flex-col items-center gap-3 w-full">
			<span className="font-semibold uppercase text-xs text-base-content/50 mb-1">
				{label}
			</span>
			<SingleCycleDisplay
				data={waveform}
				color={color}
				label={label}
				width={140}
				height={70}
			/>
			<div className="w-full flex flex-col items-center gap-1">
				<span className="text-xs">Warp Algo 1</span>
				<AlgoIconGrid value={algo} onChange={setAlgo} size={64} />
			</div>
			<div className="w-full flex flex-col items-center gap-1">
				<button
					type="button"
					className={`btn btn-xs ${algo2Enabled ? "btn-primary" : "btn-outline"}`}
					onClick={() => {
						if (algo2Enabled) {
							setAlgo2(null);
							setAlgo2Enabled(false);
						} else {
							setAlgo2(PD_ALGOS[0].value as PdAlgo);
							setAlgo2Enabled(true);
						}
					}}
				>
					Algo 2 {algo2Enabled ? "On" : "Off"}
				</button>
				{algo2Enabled && (
					<>
						<AlgoIconGrid
							value={algo2 as PdAlgo}
							onChange={setAlgo2}
							size={64}
						/>
						<label className="w-full text-xs flex flex-col gap-1">
							<span>Blend {Math.round(algoBlend * 100)}%</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={algoBlend}
								onChange={(e) => setAlgoBlend(Number(e.target.value))}
								className="range range-xs range-accent"
							/>
						</label>
					</>
				)}
			</div>
			<label className="w-full text-xs flex flex-col gap-1">
				<span>Warp Amount {warpAmount.toFixed(2)}</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={warpAmount}
					onChange={(e) => setWarpAmount(Number(e.target.value))}
					className="range range-xs range-primary"
				/>
			</label>
			<label className="w-full text-xs flex flex-col gap-1">
				<span>DCW Comp {(dcwComp * 100).toFixed(0)}%</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={dcwComp}
					onChange={(e) => setDcwComp(Number(e.target.value))}
					className="range range-xs range-primary"
				/>
			</label>
			<label className="w-full text-xs flex flex-col gap-1">
				<span>Level {level.toFixed(2)}</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={level}
					onChange={(e) => setLevel(Number(e.target.value))}
					className="range range-xs range-secondary"
				/>
			</label>
			<div className="grid grid-cols-3 gap-2 w-full">
				<label className="w-full text-xs flex flex-col gap-1">
					<span>
						Octave {octave >= 0 ? "+" : ""}
						{octave}
					</span>
					<input
						type="range"
						min={-2}
						max={2}
						step={1}
						value={octave}
						onChange={(e) => setOctave(Number(e.target.value))}
						className="range range-xs range-info"
					/>
				</label>
				<label className="w-full text-xs flex flex-col gap-1">
					<span>
						Fine {fineDetune >= 0 ? "+" : ""}
						{fineDetune}
					</span>
					<input
						type="range"
						min={-50}
						max={50}
						step={1}
						value={fineDetune}
						onChange={(e) => setFineDetune(Number(e.target.value))}
						className="range range-xs range-warning"
					/>
				</label>
				<label className="w-full text-xs flex flex-col gap-1">
					<span>Pitch {dcoDepth.toFixed(0)}st</span>
					<input
						type="range"
						min={0}
						max={24}
						step={1}
						value={dcoDepth}
						onChange={(e) => setDcoDepth(Number(e.target.value))}
						className="range range-xs range-accent"
					/>
				</label>
			</div>
			<div className="flex flex-col gap-2 w-full">
				<StepEnvelopeEditor
					title={`${label} DCO`}
					env={dcoEnv}
					onChange={setDcoEnv}
					color="#f59e0b"
				/>
				<StepEnvelopeEditor
					title={`${label} DCW`}
					env={dcwEnv}
					onChange={setDcwEnv}
					color={color}
				/>
				<StepEnvelopeEditor
					title={`${label} DCA`}
					env={dcaEnv}
					onChange={setDcaEnv}
					color="#10b981"
				/>
			</div>
		</div>
	);
});

export default PerLineWarpBlock;
