const N = 1024;

export function drawSingleScope(
	canvas: HTMLCanvasElement,
	series: Float32Array,
	color: string,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#e5e7eb";
	ctx.beginPath();
	ctx.moveTo(0, canvas.height / 2);
	ctx.lineTo(canvas.width, canvas.height / 2);
	ctx.stroke();

	ctx.strokeStyle = color;
	ctx.beginPath();
	for (let i = 0; i < N; ++i) {
		const x = (i / (N - 1)) * canvas.width;
		const y = canvas.height / 2 - series[i] * (canvas.height / 2 - 8);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
}

export function drawScope(
	canvas: HTMLCanvasElement,
	seriesA: Float32Array,
	seriesB: Float32Array,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#e5e7eb";
	ctx.beginPath();
	ctx.moveTo(0, canvas.height / 2);
	ctx.lineTo(canvas.width, canvas.height / 2);
	ctx.stroke();

	ctx.strokeStyle = "#2563eb";
	ctx.beginPath();
	for (let i = 0; i < N; ++i) {
		const x = (i / (N - 1)) * canvas.width;
		const y = canvas.height / 2 - seriesA[i] * (canvas.height / 2 - 8);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();

	ctx.strokeStyle = "#ec4899";
	ctx.beginPath();
	for (let i = 0; i < N; ++i) {
		const x = (i / (N - 1)) * canvas.width;
		const y = canvas.height / 2 - seriesB[i] * (canvas.height / 2 - 8);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
}

export function drawPhaseMap(
	canvas: HTMLCanvasElement,
	phase: Float32Array,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#e5e7eb";
	ctx.strokeRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#0ea5e9";
	ctx.beginPath();
	for (let i = 0; i < N; ++i) {
		const x = (i / (N - 1)) * canvas.width;
		const y = canvas.height - phase[i] * canvas.height;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
}
