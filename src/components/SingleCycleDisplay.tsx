import { memo, useEffect, useRef } from "react";

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
		<div className="flex flex-col items-center">
			<span className="text-xs text-base-content/60 mb-1">{label}</span>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				className="rounded bg-base-200 shadow"
			/>
		</div>
	);
});
