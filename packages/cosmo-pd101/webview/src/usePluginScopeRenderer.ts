import { useEffect, useRef } from "react";

type UsePluginScopeRendererParams = {
	oscilloscopeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	scopeCycles: number;
	scopeVerticalZoom: number;
	scopeTriggerLevel: number;
	onScopeHzChange: (hz: number) => void;
};

export function usePluginScopeRenderer({
	oscilloscopeCanvasRef,
	scopeCycles,
	scopeVerticalZoom,
	scopeTriggerLevel,
	onScopeHzChange,
}: UsePluginScopeRendererParams) {
	const scopeDataRef = useRef<{
		samples: Float32Array;
		sampleRate: number;
		hz: number;
	} | null>(null);

	useEffect(() => {
		window.__czOnScope = (samples: number[], sampleRate: number, hz: number) => {
			scopeDataRef.current = {
				samples: new Float32Array(samples),
				sampleRate,
				hz,
			};
			onScopeHzChange(Math.round(hz * 10) / 10);
		};

		return () => {
			window.__czOnScope = undefined;
		};
	}, [onScopeHzChange]);

	useEffect(() => {
		const canvas = oscilloscopeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;

		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const dpr = window.devicePixelRatio || 1;
			const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
			const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
			const pixelWidth = Math.floor(drawWidth * dpr);
			const pixelHeight = Math.floor(drawHeight * dpr);
			if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			const frame = scopeDataRef.current;
			if (!frame || frame.samples.length === 0) {
				ctx.fillStyle = "#051005";
				ctx.fillRect(0, 0, drawWidth, drawHeight);
				ctx.strokeStyle = "rgba(0, 120, 0, 0.35)";
				ctx.lineWidth = 1;
				for (let y = 0.25; y < 1; y += 0.25) {
					ctx.beginPath();
					ctx.moveTo(0, drawHeight * y);
					ctx.lineTo(drawWidth, drawHeight * y);
					ctx.stroke();
				}
				for (let x = 0.1; x < 1; x += 0.1) {
					ctx.beginPath();
					ctx.moveTo(drawWidth * x, 0);
					ctx.lineTo(drawWidth * x, drawHeight);
					ctx.stroke();
				}
				ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(0, drawHeight / 2);
				ctx.lineTo(drawWidth, drawHeight / 2);
				ctx.stroke();
				return;
			}

			const { samples, sampleRate, hz } = frame;
			const samplesPerCycle = Math.max(8, Math.round(sampleRate / Math.max(1, hz)));
			const viewSamples = Math.max(
				32,
				Math.min(samples.length - 2, Math.round(samplesPerCycle * scopeCycles)),
			);

			const triggerFloat = (scopeTriggerLevel - 128) / 128;
			let start = Math.max(1, Math.floor((samples.length - viewSamples) / 2));
			const endLimit = samples.length - viewSamples - 1;
			for (let i = 1; i < endLimit; i++) {
				const prev = samples[i - 1];
				const curr = samples[i];
				if (prev < triggerFloat && curr >= triggerFloat) {
					start = i;
					break;
				}
			}

			let mean = 0;
			for (let i = 0; i < viewSamples; i++) {
				mean += samples[start + i];
			}
			mean /= viewSamples;

			ctx.clearRect(0, 0, drawWidth, drawHeight);
			ctx.strokeStyle = "rgba(0, 120, 0, 0.35)";
			ctx.lineWidth = 1;
			for (let y = 0.25; y < 1; y += 0.25) {
				ctx.beginPath();
				ctx.moveTo(0, drawHeight * y);
				ctx.lineTo(drawWidth, drawHeight * y);
				ctx.stroke();
			}
			for (let x = 0.1; x < 1; x += 0.1) {
				ctx.beginPath();
				ctx.moveTo(drawWidth * x, 0);
				ctx.lineTo(drawWidth * x, drawHeight);
				ctx.stroke();
			}
			ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(0, drawHeight / 2);
			ctx.lineTo(drawWidth, drawHeight / 2);
			ctx.stroke();
			ctx.shadowColor = "#3dff3d";
			ctx.shadowBlur = 8;
			ctx.strokeStyle = "#3dff3d";
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let i = 0; i < viewSamples; i++) {
				const x = (i / (viewSamples - 1)) * drawWidth;
				const centered = samples[start + i] - mean;
				const y =
					drawHeight / 2 - centered * (drawHeight / 2 - 8) * scopeVerticalZoom;
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.stroke();
			ctx.shadowBlur = 0;
		};

		draw();
		return () => window.cancelAnimationFrame(raf);
	}, [scopeCycles, scopeTriggerLevel, scopeVerticalZoom, oscilloscopeCanvasRef]);
}
