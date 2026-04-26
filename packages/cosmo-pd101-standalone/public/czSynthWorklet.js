/**
 * czSynthWorklet.js — AudioWorklet processor backed by the Rust WASM DSP engine.
 *
 * Loading strategy (two-phase):
 *
 * Phase 1 — before WASM is ready:
 *   The worklet boots immediately.  It queues incoming messages and renders
 *   silence until the WASM module arrives.
 *
 * Phase 2 — WASM initialised:
 *   Main thread sends { type: "init", wasmBytes: ArrayBuffer, bindingsJs: string }.
 *   The worklet calls initSync(), creates CzSynthProcessor, drains the queue
 *   and replies { type: "ready" }.
 *
 * After that the message API is identical to the old pdVisualizerProcessor.js:
 *   { type: "setParams",  params: SynthParams }
 *   { type: "noteOn",     note, frequency?, velocity? }
 *   { type: "noteOff",   note }
 *   { type: "sustain",   on }
 */

// ---------------------------------------------------------------------------
// Default SynthParams (mirrors the JS worklet defaults for the initial state)
// ---------------------------------------------------------------------------
const DEFAULT_STEP_ENV = {
	steps: [
		{ level: 99, rate: 99 },
		{ level: 0, rate: 50 },
	],
	sustainStep: 0,
	loopStart: -1,
	loopEnd: -1,
	endStep: 1,
};

const DEFAULT_LINE = {
	waveform: 1,
	waveform2: 1,
	algo2: null,
	algoBlend: 0,
	window: "off",
	dcaBase: 1.0,
	dcwBase: 0,
	modulation: 0,
	warpAlgo: "cz101",
	detuneCents: 0,
	octave: 0,
	dcoEnv: DEFAULT_STEP_ENV,
	dcwEnv: DEFAULT_STEP_ENV,
	dcaEnv: DEFAULT_STEP_ENV,
	keyFollow: 0,
};

const DEFAULT_PARAMS = {
	lineSelect: "L1+L2",
	modMode: "normal",
	octave: 0,
	line1: { ...DEFAULT_LINE },
	line2: { ...DEFAULT_LINE },
	intPmAmount: 0,
	intPmRatio: 1,
	extPmAmount: 0,
	pmPre: true,
	frequency: 220,
	volume: 0.4,
	polyMode: "poly8",
	legato: false,
	velocityTarget: "amp",
	chorus: { rate: 0.8, depth: 0.003, mix: 0 },
	delay: { time: 0.3, feedback: 0.35, mix: 0 },
	reverb: { size: 0.5, mix: 0 },
	vibrato: { enabled: false, waveform: 1, rate: 30, depth: 30, delay: 0 },
	portamento: { enabled: false, mode: "rate", rate: 50, time: 0.5 },
	lfo: { enabled: false, waveform: "sine", rate: 5, depth: 0 },
	filter: {
		enabled: false,
		type: "lp",
		cutoff: 5000,
		resonance: 0,
		envAmount: 0,
	},
	pitchBendRange: 2,
	modWheelVibratoDepth: 0,
};

// ---------------------------------------------------------------------------
// Worklet processor
// ---------------------------------------------------------------------------

class CzSynthWorkletProcessor extends AudioWorkletProcessor {
	constructor() {
		super();

		/** @type {import('./cz_synth').CzSynthProcessor | null} */
		this._synth = null;
		// structuredClone is not available in AudioWorklet scope — use JSON round-trip
		this._params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
		this._queue = []; // messages received before WASM is ready
		this._runtimeTelemetryDivider = 4;
		this._runtimeTelemetryCounter = 0;

		this.port.onmessage = (e) => this._handleMessage(e.data);
	}

	// ── Message dispatch ──────────────────────────────────────────────────

	_handleMessage(d) {
		if (!d) return;

		if (d.type === "init") {
			this._initWasm(d.wasmBytes, d.bindingsJs);
			return;
		}

		if (!this._synth) {
			// WASM not yet ready — queue the message
			this._queue.push(d);
			return;
		}

		this._dispatch(d);
	}

	_dispatch(d) {
		const synth = this._synth;
		switch (d.type) {
			case "setParams": {
				const p = d.params;
				this._mergeParams(p);
				synth.setParams(JSON.stringify(this._params));
				break;
			}
			case "noteOn":
				synth.noteOn(d.note, d.frequency ?? 0, d.velocity ?? 1);
				break;
			case "noteOff":
				synth.noteOff(d.note);
				break;
			case "sustain":
				synth.setSustain(d.on);
				break;
			case "pitchBend":
				synth.setPitchBend(d.value);
				break;
			case "modWheel":
				synth.setModWheel(d.value);
				break;
			case "aftertouch":
				synth.setAftertouch(d.value);
				break;
		}
	}

	// ── Deep-merge helper (mirrors the JS worklet Object.assign logic) ────

	_mergeParams(p) {
		const target = this._params;
		// Shallow-merge top-level scalars
		Object.assign(target, p);

		// Re-assign structured sub-objects so they replace correctly
		if (p.chorus) Object.assign(target.chorus, p.chorus);
		if (p.delay) Object.assign(target.delay, p.delay);
		if (p.reverb) Object.assign(target.reverb, p.reverb);
		if (p.vibrato) Object.assign(target.vibrato, p.vibrato);
		if (p.portamento) Object.assign(target.portamento, p.portamento);
		if (p.lfo) Object.assign(target.lfo, p.lfo);
		if (p.filter) Object.assign(target.filter, p.filter);

		if (p.line1) {
			Object.assign(target.line1, p.line1);
			if (p.line1.dcoEnv) target.line1.dcoEnv = p.line1.dcoEnv;
			if (p.line1.dcwEnv) target.line1.dcwEnv = p.line1.dcwEnv;
			if (p.line1.dcaEnv) target.line1.dcaEnv = p.line1.dcaEnv;
		}
		if (p.line2) {
			Object.assign(target.line2, p.line2);
			if (p.line2.dcoEnv) target.line2.dcoEnv = p.line2.dcoEnv;
			if (p.line2.dcwEnv) target.line2.dcwEnv = p.line2.dcwEnv;
			if (p.line2.dcaEnv) target.line2.dcaEnv = p.line2.dcaEnv;
		}
	}

	// ── WASM bootstrap ────────────────────────────────────────────────────

	_initWasm(wasmBytes, bindingsJs) {
		try {
			// AudioWorklet scope lacks TextDecoder/TextEncoder — polyfill before eval.
			// These are used by the wasm-bindgen generated bindings for string encoding.
			if (typeof TextDecoder === "undefined") {
				globalThis.TextDecoder = class TextDecoder {
					constructor(encoding = "utf-8", options = {}) {
						this.encoding = encoding;
						this.fatal = options.fatal ?? false;
						this.ignoreBOM = options.ignoreBOM ?? false;
					}
					decode(input) {
						// wasm-bindgen calls decode() with no args as a warm-up — return ""
						if (input === undefined || input === null) return "";
						// Minimal UTF-8 decoder sufficient for wasm-bindgen's usage
						const bytes =
							input instanceof Uint8Array
								? input
								: new Uint8Array(
										ArrayBuffer.isView(input) ? input.buffer : input,
									);
						let out = "";
						let i = 0;
						while (i < bytes.length) {
							const b = bytes[i];
							if (b < 0x80) {
								out += String.fromCharCode(b);
								i++;
							} else if ((b & 0xe0) === 0xc0) {
								out += String.fromCharCode(
									((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f),
								);
								i += 2;
							} else if ((b & 0xf0) === 0xe0) {
								out += String.fromCharCode(
									((b & 0x0f) << 12) |
										((bytes[i + 1] & 0x3f) << 6) |
										(bytes[i + 2] & 0x3f),
								);
								i += 3;
							} else {
								const cp =
									((b & 0x07) << 18) |
									((bytes[i + 1] & 0x3f) << 12) |
									((bytes[i + 2] & 0x3f) << 6) |
									(bytes[i + 3] & 0x3f);
								const c = cp - 0x10000;
								out += String.fromCharCode(
									0xd800 + (c >> 10),
									0xdc00 + (c & 0x3ff),
								);
								i += 4;
							}
						}
						return out;
					}
				};
			}
			if (typeof TextEncoder === "undefined") {
				globalThis.TextEncoder = class TextEncoder {
					get encoding() {
						return "utf-8";
					}
					encode(str) {
						const buf = [];
						for (let i = 0; i < str.length; i++) {
							let cp = str.charCodeAt(i);
							if (cp >= 0xd800 && cp <= 0xdbff) {
								cp =
									0x10000 +
									((cp - 0xd800) << 10) +
									(str.charCodeAt(++i) - 0xdc00);
							}
							if (cp < 0x80) {
								buf.push(cp);
							} else if (cp < 0x800) {
								buf.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
							} else if (cp < 0x10000) {
								buf.push(
									0xe0 | (cp >> 12),
									0x80 | ((cp >> 6) & 0x3f),
									0x80 | (cp & 0x3f),
								);
							} else {
								buf.push(
									0xf0 | (cp >> 18),
									0x80 | ((cp >> 12) & 0x3f),
									0x80 | ((cp >> 6) & 0x3f),
									0x80 | (cp & 0x3f),
								);
							}
						}
						const out = new Uint8Array(buf.length);
						out.set(buf);
						return out;
					}
				};
			}

			// The bindings JS is the content of cosmo_synth_engine.js (no-modules build).
			// The IIFE assigns to a local variable — not globalThis — so we
			// rewrite the prefix to force assignment onto globalThis instead.
			// Handles both old format (`let wasm_bindgen =`) and new format
			// (`const _wasm_bindgen =`) produced by different wasm-bindgen versions.
			// biome-ignore lint/security/noGlobalEval: required for WASM no-modules init in AudioWorklet
			globalThis.wasm_bindgen = globalThis.eval(
				bindingsJs.replace(/^\s*(?:let|const|var)\s+_?wasm_bindgen\s*=/, ""),
			);

			// initSync accepts a compiled WebAssembly.Module or raw bytes.
			const wasmModule = new WebAssembly.Module(wasmBytes);
			globalThis.wasm_bindgen.initSync({ module: wasmModule });

			this._synth = new globalThis.wasm_bindgen.CzSynthProcessor(sampleRate);

			// Drain queued messages
			for (const d of this._queue) this._dispatch(d);
			this._queue.length = 0;

			this.port.postMessage({ type: "ready" });
		} catch (err) {
			console.error("[czSynthWorklet] WASM init failed:", err);
			this.port.postMessage({ type: "error", message: String(err) });
		}
	}

	_emitRuntimeModSources() {
		if (!this._synth) return;

		try {
			const sources = JSON.parse(this._synth.getRuntimeModSources());
			this.port.postMessage({
				type: "runtimeModSources",
				sources,
			});
		} catch (err) {
			console.error(
				"[czSynthWorklet] Failed to read runtime mod sources:",
				err,
			);
		}
	}

	// ── Audio render loop ─────────────────────────────────────────────────

	process(_inputs, outputs, _params) {
		const ch0 = outputs?.[0]?.[0];
		if (!ch0) return true;

		if (!this._synth) {
			// Silence while WASM loads
			ch0.fill(0);
			if (outputs[0].length > 1) outputs[0][1].fill(0);
			return true;
		}

		// Fill the left channel buffer directly
		this._synth.process(ch0);
		this._runtimeTelemetryCounter += 1;
		if (this._runtimeTelemetryCounter >= this._runtimeTelemetryDivider) {
			this._runtimeTelemetryCounter = 0;
			this._emitRuntimeModSources();
		}

		// Copy to right channel if present
		if (outputs[0].length > 1) {
			outputs[0][1].set(ch0);
		}

		return true;
	}
}

registerProcessor("cosmo-processor", CzSynthWorkletProcessor);
