import type {
	AlgoControlValueV1,
	StepEnvData,
} from "@/lib/synth/bindings/synth";

type BeamerParamInfo = {
	id: number;
	stringId: string;
	name: string;
	min: number;
	max: number;
	defaultValue: number;
	value: number;
	plainValue: number;
	displayText: string;
	format: string;
	units: string;
	steps: number;
};

type BeamerParamUpdate = Record<string, [number, number, string]>;

type EnvelopeMap = Partial<Record<EnvelopeId, StepEnvData>>;

type AlgoControlsPayload = {
	line: 1 | 2;
	controls: AlgoControlValueV1[];
};

type EnvelopeId =
	| "l1_dco"
	| "l1_dcw"
	| "l1_dca"
	| "l2_dco"
	| "l2_dcw"
	| "l2_dca";

type BeamerRuntime = {
	_onInit: (params: BeamerParamInfo[]) => void;
	_onParams: (updates: BeamerParamUpdate) => void;
	invoke: (method: string, ...args: unknown[]) => Promise<unknown>;
	params: {
		info: (id: string) => BeamerParamInfo | undefined;
		beginEdit: (id: string) => void;
		set: (id: string, normalized: number) => void;
		endEdit: (id: string) => void;
	};
};

declare global {
	interface Window {
		__BEAMER__?: BeamerRuntime;
		ipc?: { postMessage: (msg: string) => void };
		__czOnParams?: (json: string) => void;
		__czGetEnvelopes?: () => Promise<EnvelopeMap>;
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
	}
}

const LEGACY_PARAM_IDS: Record<number, string> = {
	0: "volume",
	1: "octave",
	2: "line_select",
	3: "mod_mode",
	4: "poly_mode",
	5: "legato",
	6: "vel_target",
	7: "int_pm_amount",
	8: "int_pm_ratio",
	10: "pm_pre",
	100: "l1_waveform",
	101: "l1_warp_algo",
	102: "l1_dcw_base",
	103: "l1_dca_base",
	104: "l1_dco_depth",
	105: "l1_octave",
	106: "l1_detune",
	107: "l1_dcw_comp",
	108: "l1_key_follow",
	110: "l1_algo_blend",
	111: "l1_warp_algo2",
	200: "l2_waveform",
	201: "l2_warp_algo",
	202: "l2_dcw_base",
	203: "l2_dca_base",
	204: "l2_dco_depth",
	205: "l2_octave",
	206: "l2_detune",
	207: "l2_dcw_comp",
	208: "l2_key_follow",
	210: "l2_algo_blend",
	211: "l2_warp_algo2",
	300: "vib_enabled",
	301: "vib_waveform",
	302: "vib_rate",
	303: "vib_depth",
	304: "vib_delay",
	400: "cho_mix",
	401: "cho_rate",
	402: "cho_depth",
	500: "del_mix",
	501: "del_time",
	502: "del_feedback",
	600: "rev_mix",
	601: "rev_size",
	700: "lfo_enabled",
	701: "lfo_waveform",
	702: "lfo_rate",
	703: "lfo_depth",
	704: "lfo_target",
	800: "fil_enabled",
	801: "fil_cutoff",
	802: "fil_resonance",
	803: "fil_env_amount",
	804: "fil_type",
	900: "port_enabled",
	901: "port_mode",
	902: "port_time",
};

const legacyIdsByStringId = Object.fromEntries(
	Object.entries(LEGACY_PARAM_IDS).map(([legacyId, stringId]) => [
		stringId,
		Number(legacyId),
	]),
) as Record<string, number>;

type ParamTransform = {
	legacyToRuntime?: (legacyValue: number) => number;
	runtimeToLegacy?: (runtimeValue: number) => number;
};

const PARAM_TRANSFORMS: Partial<Record<string, ParamTransform>> = {};

let installed = false;
let latestLegacyParams: Record<number, number> = {};
let currentParamHandler: ((json: string) => void) | undefined;
const runtimeStringIdsByNumericId: Record<number, string> = {};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function toNormalized(plainValue: number, info: BeamerParamInfo): number {
	if (info.max === info.min) {
		return info.defaultValue;
	}

	return clamp((plainValue - info.min) / (info.max - info.min), 0, 1);
}

function toLegacyPlainValue(stringId: string, runtimeValue: number): number {
	return (
		PARAM_TRANSFORMS[stringId]?.runtimeToLegacy?.(runtimeValue) ?? runtimeValue
	);
}

function toRuntimePlainValue(stringId: string, legacyValue: number): number {
	return (
		PARAM_TRANSFORMS[stringId]?.legacyToRuntime?.(legacyValue) ?? legacyValue
	);
}

function emitLegacyParams(payload: Record<number, number>) {
	latestLegacyParams = { ...latestLegacyParams, ...payload };
	currentParamHandler?.(JSON.stringify(payload));
}

function installLegacyParamProperty() {
	const descriptor = Object.getOwnPropertyDescriptor(window, "__czOnParams");
	if (descriptor?.get || descriptor?.set) {
		return;
	}

	Object.defineProperty(window, "__czOnParams", {
		configurable: true,
		get() {
			return currentParamHandler;
		},
		set(handler: ((json: string) => void) | undefined) {
			currentParamHandler = handler;
			if (
				typeof handler === "function" &&
				Object.keys(latestLegacyParams).length > 0
			) {
				queueMicrotask(() => handler(JSON.stringify(latestLegacyParams)));
			}
		},
	});
}

function onInit(params: BeamerParamInfo[]) {
	const legacyPayload: Record<number, number> = {};

	for (const info of params) {
		runtimeStringIdsByNumericId[info.id] = info.stringId;
		const legacyId = legacyIdsByStringId[info.stringId];
		if (legacyId === undefined) {
			continue;
		}
		legacyPayload[legacyId] = toLegacyPlainValue(
			info.stringId,
			info.plainValue,
		);
	}

	emitLegacyParams(legacyPayload);
}

function onParams(update: BeamerParamUpdate) {
	const legacyPayload: Record<number, number> = {};

	for (const [rawId, [, plainValue]] of Object.entries(update)) {
		const numericId = Number(rawId);
		const stringId = Number.isNaN(numericId)
			? rawId
			: (runtimeStringIdsByNumericId[numericId] ?? rawId);
		const legacyId = legacyIdsByStringId[stringId] ?? numericId;
		if (legacyId === undefined || Number.isNaN(legacyId)) {
			continue;
		}
		legacyPayload[legacyId] = toLegacyPlainValue(stringId, plainValue);
	}

	if (Object.keys(legacyPayload).length > 0) {
		emitLegacyParams(legacyPayload);
	}
}

function installLegacyIpc(runtime: BeamerRuntime) {
	window.ipc = {
		postMessage(message: string) {
			const payload = JSON.parse(message) as
				| { parameter_id: number; value: number }
				| { envelope_id: EnvelopeId; data: StepEnvData }
				| { algo_controls: AlgoControlsPayload };

			if ("parameter_id" in payload) {
				const stringId = LEGACY_PARAM_IDS[payload.parameter_id];
				if (!stringId) {
					return;
				}

				const info = runtime.params.info(stringId);
				if (!info) {
					return;
				}

				const runtimePlainValue = toRuntimePlainValue(stringId, payload.value);
				const normalized = toNormalized(runtimePlainValue, info);
				runtime.params.beginEdit(stringId);
				runtime.params.set(stringId, normalized);
				runtime.params.endEdit(stringId);
				return;
			}

			if ("algo_controls" in payload) {
				void runtime
					.invoke(
						"setAlgoControls",
						payload.algo_controls.line,
						payload.algo_controls.controls,
					)
					.catch((error) => {
						console.error(
							"[beamerLegacyBridge] Failed to send algo controls",
							error,
						);
					});
				return;
			}

			void runtime
				.invoke("setEnvelope", payload.envelope_id, payload.data)
				.catch((error) => {
					console.error("[beamerLegacyBridge] Failed to send envelope", error);
				});
		},
	};

	window.__czGetEnvelopes = async () => {
		const response = await runtime.invoke("getEnvelopes");
		return (response ?? {}) as EnvelopeMap;
	};
}

function syncExistingParams(runtime: BeamerRuntime) {
	const legacyPayload: Record<number, number> = {};

	for (const [legacyId, stringId] of Object.entries(LEGACY_PARAM_IDS)) {
		const info = runtime.params.info(stringId);
		if (!info) {
			continue;
		}

		runtimeStringIdsByNumericId[info.id] = info.stringId;
		legacyPayload[Number(legacyId)] = toLegacyPlainValue(
			stringId,
			info.plainValue,
		);
	}

	if (Object.keys(legacyPayload).length > 0) {
		emitLegacyParams(legacyPayload);
	}
}

export function ensureBeamerLegacyBridge(): boolean {
	if (installed) {
		return true;
	}

	const runtime = window.__BEAMER__;
	if (!runtime) {
		return false;
	}

	installed = true;
	installLegacyParamProperty();

	const originalOnInit = runtime._onInit.bind(runtime);
	runtime._onInit = (params) => {
		originalOnInit(params);
		onInit(params);
	};

	const originalOnParams = runtime._onParams.bind(runtime);
	runtime._onParams = (update) => {
		originalOnParams(update);
		onParams(update);
	};

	installLegacyIpc(runtime);
	syncExistingParams(runtime);
	installScopePolling(runtime);

	return true;
}

// ---------------------------------------------------------------------------
// Scope polling
// ---------------------------------------------------------------------------
// Polls getScopeData from Rust at ~30 fps and forwards to window.__czOnScope.

type ScopeDataResponse = {
	samples: number[];
	sampleRate: number;
	hz: number;
};

function installScopePolling(runtime: BeamerRuntime) {
	const INTERVAL_MS = 33; // ~30 fps
	const SCALE = 1 / 127.0;
	let rafId = 0;
	let lastScheduled = 0;

	const tick = async (now: number) => {
		rafId = requestAnimationFrame(tick);
		if (now - lastScheduled < INTERVAL_MS) return;
		lastScheduled = now;

		try {
			const raw = (await runtime.invoke("getScopeData")) as ScopeDataResponse;
			if (raw && raw.samples.length > 0 && window.__czOnScope) {
				// Rust sends i8 integers (–127..127); rescale to float32 [-1, 1].
				const floats = raw.samples.map((s) => s * SCALE);
				window.__czOnScope(floats, raw.sampleRate, raw.hz);
			}
		} catch {
			// Ignore — plugin may not be producing audio yet.
		}
	};

	rafId = requestAnimationFrame(tick);

	// Clean up on page unload so the interval doesn't dangle.
	window.addEventListener("pagehide", () => {
		cancelAnimationFrame(rafId);
	});
}
