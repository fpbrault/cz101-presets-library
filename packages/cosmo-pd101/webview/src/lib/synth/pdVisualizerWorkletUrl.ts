function withBasePath(path: string): string {
	const base = import.meta.env.BASE_URL || "/";
	const normalizedBase = base.endsWith("/") ? base : `${base}/`;
	return `${normalizedBase}${path.replace(/^\/+/, "")}`;
}

export const pdVisualizerWorkletUrl = withBasePath("czSynthWorklet.js");
export const synthWasmUrl = withBasePath(
	"cosmo-synth-engine-wasm/cosmo_synth_engine_bg.wasm",
);
export const synthBindingsUrl = withBasePath(
	"cosmo-synth-engine-wasm/cosmo_synth_engine.js",
);
