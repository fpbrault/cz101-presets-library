export type OscilloscopeConfig = {
	cycles: number;
	verticalZoom: number;
	triggerLevel: number; // 0-255 for Uint8Array, -1 to 1 for Float32Array
	triggerMode?: "off" | "rise" | "fall";
	fixedWindowSamples?: number;
	startIndex?: number;
	color?: string;
	gridColor?: string;
};

/**
 * Draw an oscilloscope waveform on a canvas.
 * Shared between plugin scope renderer and visualizer.
 */
export function drawOscilloscope(
	canvas: HTMLCanvasElement,
	samples: Float32Array | Uint8Array,
	config: OscilloscopeConfig,
	pitchHz: number,
	sampleRate: number,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

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

	const color = config.color ?? "#3dff3d";
	const gridColor = config.gridColor ?? "rgba(0, 120, 0, 0.35)";
	const triggerMode = config.triggerMode ?? "rise";
	const isUint8 = samples instanceof Uint8Array;
	// For Uint8Array (0-255), triggerLevel is 0-255. For Float32Array (-1 to 1), convert from 0-255 to -1 to 1.
	const triggerFloat = isUint8
		? config.triggerLevel
		: (config.triggerLevel - 128) / 128;

	// Handle empty samples
	if (samples.length === 0) {
		ctx.fillStyle = "#051005";
		ctx.fillRect(0, 0, drawWidth, drawHeight);
		drawGrid(ctx, drawWidth, drawHeight, gridColor);
		return;
	}

	// Calculate view samples based on pitch and cycles
	const hz = Math.max(1, pitchHz);
	const samplesPerCycle = Math.max(8, Math.round(sampleRate / hz));
	const requestedViewSamples =
		typeof config.fixedWindowSamples === "number"
			? Math.round(config.fixedWindowSamples)
			: Math.round(samplesPerCycle * config.cycles);
	const viewSamples = Math.max(8, Math.min(samples.length - 2, requestedViewSamples));
	if (viewSamples <= 1) {
		ctx.fillStyle = "#051005";
		ctx.fillRect(0, 0, drawWidth, drawHeight);
		drawGrid(ctx, drawWidth, drawHeight, gridColor);
		return;
	}

	// Find trigger point
	let start =
		typeof config.startIndex === "number"
			? Math.max(1, Math.min(samples.length - viewSamples - 1, config.startIndex))
			: Math.max(1, Math.floor((samples.length - viewSamples) / 2));
	if (triggerMode !== "off") {
		const endLimit = samples.length - viewSamples - 1;
		for (let i = 1; i < endLimit; i++) {
			const prev = samples[i - 1];
			const curr = samples[i];
			const riseHit = prev < triggerFloat && curr >= triggerFloat;
			const fallHit = prev > triggerFloat && curr <= triggerFloat;
			if (
				(triggerMode === "rise" && riseHit) ||
				(triggerMode === "fall" && fallHit)
			) {
				start = i;
				break;
			}
		}
	}

	// Calculate mean for centering
	let mean = 0;
	for (let i = 0; i < viewSamples; i++) {
		mean += samples[start + i];
	}
	mean /= viewSamples;

	// Clear and draw grid
	ctx.clearRect(0, 0, drawWidth, drawHeight);
	drawGrid(ctx, drawWidth, drawHeight, gridColor);

	// Draw waveform
	ctx.shadowColor = color;
	ctx.shadowBlur = 8;
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();

	for (let i = 0; i < viewSamples; i++) {
		const x = (i / (viewSamples - 1)) * drawWidth;
		const sampleValue = samples[start + i];
		// Normalize: Uint8Array is 0-255 (center 128), Float32Array is -1 to 1
		const normalized = isUint8
			? (sampleValue - mean) / 128
			: sampleValue - mean;
		const y =
			drawHeight / 2 - normalized * (drawHeight / 2 - 8) * config.verticalZoom;
		if (i === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	}

	ctx.stroke();
	ctx.shadowBlur = 0;
}

function drawGrid(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	color: string,
): void {
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;

	// Horizontal grid lines
	for (let y = 0.25; y < 1; y += 0.25) {
		ctx.beginPath();
		ctx.moveTo(0, height * y);
		ctx.lineTo(width, height * y);
		ctx.stroke();
	}

	// Vertical grid lines
	for (let x = 0.1; x < 1; x += 0.1) {
		ctx.beginPath();
		ctx.moveTo(width * x, 0);
		ctx.lineTo(width * x, height);
		ctx.stroke();
	}

	// Center line (brighter)
	ctx.strokeStyle = color.replace("0.35", "0.6");
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(0, height / 2);
	ctx.lineTo(width, height / 2);
	ctx.stroke();
}
