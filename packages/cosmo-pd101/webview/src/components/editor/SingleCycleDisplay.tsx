import { memo, useEffect, useMemo, useRef } from "react";
import Card from "@/components/primitives/Card";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { computeWaveform } from "@/lib/synth/pdAlgorithms";

interface SingleCycleDisplayProps {
	data: Float32Array | number[];
	color: string;
	label: string;
	width?: number;
	height?: number;
}

export const SingleCycleDisplay = memo(function SingleCycleDisplay({
	data,
	color,
	label,
	width = 160,
	height = 60,
}: SingleCycleDisplayProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !data) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i < data.length; i++) {
			const x = (i / (data.length - 1)) * width;
			const y = height / 2 - data[i] * (height / 2 - 4);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.strokeStyle = "#8884";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, height / 2);
		ctx.lineTo(width, height / 2);
		ctx.stroke();
	}, [data, color, width, height]);

	return (
		<div className="flex flex-col items-center col-span-2">
			<span className="mb-1 text-3xs uppercase tracking-[0.24em] text-base-content/55">
				{label}
			</span>
			<Card
				variant="subtle"
				padding="none"
				className="overflow-hidden shadow-lg"
			>
				<canvas
					ref={canvasRef}
					width={width}
					height={height}
					className="bg-base-300/30"
				/>
			</Card>
		</div>
	);
});

export const SynthSingleCycleDisplay = memo(function SynthSingleCycleDisplay() {
	const { value: warpAAmount } = useSynthParam("warpAAmount");
	const { value: warpBAmount } = useSynthParam("warpBAmount");
	const { value: warpAAlgo } = useSynthParam("warpAAlgo");
	const { value: warpBAlgo } = useSynthParam("warpBAlgo");
	const { value: algo2A } = useSynthParam("algo2A");
	const { value: algo2B } = useSynthParam("algo2B");
	const { value: algoBlendA } = useSynthParam("algoBlendA");
	const { value: algoBlendB } = useSynthParam("algoBlendB");
	const { value: intPmAmount } = useSynthParam("intPmAmount");
	const { value: intPmRatio } = useSynthParam("intPmRatio");
	const { value: pmPre } = useSynthParam("pmPre");
	const { value: windowType } = useSynthParam("windowType");
	const { value: phaseModEnabled } = useSynthParam("phaseModEnabled");
	const effectiveIntPmAmount = phaseModEnabled ? intPmAmount : 0;
	const { value: line1Level } = useSynthParam("line1Level");
	const { value: line2Level } = useSynthParam("line2Level");
	const { value: line1CzSlotAWaveform } = useSynthParam("line1CzSlotAWaveform");
	const { value: line1CzSlotBWaveform } = useSynthParam("line1CzSlotBWaveform");
	const { value: line1CzWindow } = useSynthParam("line1CzWindow");
	const { value: line2CzSlotAWaveform } = useSynthParam("line2CzSlotAWaveform");
	const { value: line2CzSlotBWaveform } = useSynthParam("line2CzSlotBWaveform");
	const { value: line2CzWindow } = useSynthParam("line2CzWindow");

	const waveform = useMemo(
		() =>
			computeWaveform({
				warpAAmount,
				warpBAmount,
				warpAAlgo,
				warpBAlgo,
				algo2A,
				algo2B,
				algoBlendA,
				algoBlendB,
				intPmAmount: effectiveIntPmAmount,
				intPmRatio,
				extPmAmount: 0,
				pmPre,
				windowType,
				line1Level,
				line2Level,
				line1CzSlotAWaveform,
				line1CzSlotBWaveform,
				line1CzWindow,
				line2CzSlotAWaveform,
				line2CzSlotBWaveform,
				line2CzWindow,
			}),
		[
			warpAAmount,
			warpBAmount,
			warpAAlgo,
			warpBAlgo,
			algo2A,
			algo2B,
			algoBlendA,
			algoBlendB,
			effectiveIntPmAmount,
			intPmRatio,
			pmPre,
			windowType,
			line1Level,
			line2Level,
			line1CzSlotAWaveform,
			line1CzSlotBWaveform,
			line1CzWindow,
			line2CzSlotAWaveform,
			line2CzSlotBWaveform,
			line2CzWindow,
		],
	);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const width = 176;
	const height = 64;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);

		// centre line
		ctx.strokeStyle = "#8884";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, height / 2);
		ctx.lineTo(width, height / 2);
		ctx.stroke();

		const drawLine = (data: Float32Array | number[], color: string) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < data.length; i++) {
				const x = (i / (data.length - 1)) * width;
				const y = height / 2 - data[i] * (height / 2 - 4);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		};

		drawLine(waveform.out1, "#ec4899");
		drawLine(waveform.out2, "#2563eb");
	}, [waveform]);

	return (
		<div className="flex flex-col items-center col-span-2">
			<span className="mb-1 text-3xs uppercase tracking-[0.24em] text-base-content/55">
				Single Cycle
			</span>
			<Card
				variant="subtle"
				padding="none"
				className="overflow-hidden shadow-lg"
			>
				<canvas
					ref={canvasRef}
					width={width}
					height={height}
					className="bg-base-300/30"
				/>
			</Card>
		</div>
	);
});
