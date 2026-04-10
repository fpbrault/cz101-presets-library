import { memo } from "react";
import { AdsrControls } from "./AdsrControls";
import AlgoIconGrid from "./AlgoIconGrid";
import type { Adsr, PdAlgo } from "./pdAlgorithms";
import { SingleCycleDisplay } from "./SingleCycleDisplay";

interface PerLineWarpBlockProps {
	label: string;
	waveform: Float32Array | number[];
	color: string;
	algo: PdAlgo;
	setAlgo: (a: PdAlgo) => void;
	warpAmount: number;
	setWarpAmount: (v: number) => void;
	level: number;
	setLevel: (v: number) => void;
	octave: number;
	setOctave: (v: number) => void;
	fineDetune: number;
	setFineDetune: (v: number) => void;
	warpEnv: Adsr;
	setWarpEnv: (e: Adsr) => void;
	levelEnv: Adsr;
	setLevelEnv: (e: Adsr) => void;
}

export const PerLineWarpBlock = memo(function PerLineWarpBlock({
	label,
	waveform,
	color,
	algo,
	setAlgo,
	warpAmount,
	setWarpAmount,
	level,
	setLevel,
	octave,
	setOctave,
	fineDetune,
	setFineDetune,
	warpEnv,
	setWarpEnv,
	levelEnv,
	setLevelEnv,
}: PerLineWarpBlockProps) {
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
				<span className="text-xs">Warp Algo</span>
				<AlgoIconGrid value={algo} onChange={setAlgo} size={64} />
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
			<div className="grid grid-cols-2 gap-2 w-full">
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
			</div>
			<div className="w-full space-y-2">
				<AdsrControls title="Level Env" env={levelEnv} onChange={setLevelEnv} />
				<AdsrControls title="Warp Env" env={warpEnv} onChange={setWarpEnv} />
			</div>
		</div>
	);
});

export default PerLineWarpBlock;
