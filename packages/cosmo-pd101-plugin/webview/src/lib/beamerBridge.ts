import type {
	AlgoControlValueV1,
	ModMatrix,
	StepEnvData,
} from "@cosmo/cosmo-pd101";

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
	bank?: "a" | "b";
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
	emit?: (event: string, data?: unknown) => void;
	params: {
		info: (id: string) => BeamerParamInfo | undefined;
		all: () => BeamerParamInfo[];
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
		__czGetModMatrix?: () => Promise<ModMatrix>;
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
	}
}

let installed = false;
let latestParams: Record<string, number> = {};
let currentParamHandler: ((json: string) => void) | undefined;
let currentScopeHandler:
	| ((samples: number[], sampleRate: number, hz: number) => void)
	| undefined;
// Beamer may send numeric-string keys in _onParams; cache the id→stringId mapping.
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

function emitParams(payload: Record<string, number>) {
	const changedPayload: Record<string, number> = {};
	for (const [id, value] of Object.entries(payload)) {
		if (latestParams[id] === value) {
			continue;
		}
		changedPayload[id] = value;
	}

	if (Object.keys(changedPayload).length === 0) {
		return;
	}

	latestParams = { ...latestParams, ...changedPayload };
	currentParamHandler?.(JSON.stringify(changedPayload));
}

function installParamProperty() {
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
				Object.keys(latestParams).length > 0
			) {
				queueMicrotask(() => handler(JSON.stringify(latestParams)));
			}
		},
	});
}

function installScopeProperty(onActiveChange: (active: boolean) => void) {
	const descriptor = Object.getOwnPropertyDescriptor(window, "__czOnScope");
	if (descriptor?.get || descriptor?.set) {
		currentScopeHandler =
			typeof window.__czOnScope === "function" ? window.__czOnScope : undefined;
		onActiveChange(currentScopeHandler !== undefined);
		return;
	}

	currentScopeHandler =
		typeof window.__czOnScope === "function" ? window.__czOnScope : undefined;

	Object.defineProperty(window, "__czOnScope", {
		configurable: true,
		get() {
			return currentScopeHandler;
		},
		set(handler: Window["__czOnScope"]) {
			currentScopeHandler = typeof handler === "function" ? handler : undefined;
			onActiveChange(currentScopeHandler !== undefined);
		},
	});

	onActiveChange(currentScopeHandler !== undefined);
}

function onInit(params: BeamerParamInfo[]) {
	const payload: Record<string, number> = {};
	for (const info of params) {
		runtimeStringIdsByNumericId[info.id] = info.stringId;
		payload[info.stringId] = info.plainValue;
	}
	emitParams(payload);
}

function onParams(update: BeamerParamUpdate) {
	const payload: Record<string, number> = {};
	for (const [rawId, [, plainValue]] of Object.entries(update)) {
		const numericId = Number(rawId);
		const stringId = Number.isNaN(numericId)
			? rawId
			: (runtimeStringIdsByNumericId[numericId] ?? rawId);
		payload[stringId] = plainValue;
	}
	if (Object.keys(payload).length > 0) {
		emitParams(payload);
	}
}

function installBridgeIpc(runtime: BeamerRuntime) {
	window.ipc = {
		postMessage(message: string) {
			const payload = JSON.parse(message) as
				| { param_id: string; value: number }
				| { envelope_id: EnvelopeId; data: StepEnvData }
				| { algo_controls: AlgoControlsPayload }
				| { mod_matrix: ModMatrix };

			if ("param_id" in payload) {
				const info = runtime.params.info(payload.param_id);
				if (!info) {
					return;
				}
				const normalized = toNormalized(payload.value, info);
				runtime.params.beginEdit(payload.param_id);
				runtime.params.set(payload.param_id, normalized);
				runtime.params.endEdit(payload.param_id);
				return;
			}

			if ("algo_controls" in payload) {
				void runtime
					.invoke(
						"setAlgoControls",
						payload.algo_controls.line,
						payload.algo_controls.bank ?? "a",
						payload.algo_controls.controls,
					)
					.catch((error) => {
						console.error("[beamerBridge] Failed to send algo controls", error);
					});
				return;
			}

			if ("mod_matrix" in payload) {
				void runtime
					.invoke("setModMatrix", payload.mod_matrix)
					.catch((error) => {
						console.error("[beamerBridge] Failed to send mod matrix", error);
					});
				return;
			}

			void runtime
				.invoke("setEnvelope", payload.envelope_id, payload.data)
				.catch((error) => {
					console.error("[beamerBridge] Failed to send envelope", error);
				});
		},
	};

	window.__czGetEnvelopes = async () => {
		const response = await runtime.invoke("getEnvelopes");
		return (response ?? {}) as EnvelopeMap;
	};

	window.__czGetModMatrix = async () => {
		const response = await runtime.invoke("getModMatrix");
		return (response ?? { routes: [] }) as ModMatrix;
	};
}

function syncExistingParams(runtime: BeamerRuntime) {
	const allParams =
		runtime.params && typeof runtime.params.all === "function"
			? runtime.params.all.bind(runtime.params)
			: null;

	if (!allParams) {
		return;
	}

	const payload: Record<string, number> = {};
	for (const info of allParams()) {
		runtimeStringIdsByNumericId[info.id] = info.stringId;
		payload[info.stringId] = info.plainValue;
	}
	if (Object.keys(payload).length > 0) {
		emitParams(payload);
	}
}

export function ensureBeamerBridge(): boolean {
	if (installed) {
		return true;
	}

	const runtime = window.__BEAMER__;
	if (!runtime) {
		return false;
	}

	installed = true;
	installParamProperty();

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

	installBridgeIpc(runtime);
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
	let pollInFlight = false;
	let destroyed = false;

	const scheduleNextFrame = () => {
		if (destroyed || rafId !== 0 || !currentScopeHandler) {
			return;
		}
		rafId = requestAnimationFrame(tick);
	};

	const stopPolling = () => {
		if (rafId !== 0) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
		lastScheduled = 0;
	};

	const tick = async (now: number) => {
		rafId = 0;
		if (destroyed || !currentScopeHandler) {
			return;
		}
		if (now - lastScheduled < INTERVAL_MS || pollInFlight) {
			scheduleNextFrame();
			return;
		}
		lastScheduled = now;
		pollInFlight = true;

		try {
			const raw = (await runtime.invoke("getScopeData")) as ScopeDataResponse;
			if (raw && raw.samples.length > 0 && currentScopeHandler) {
				// Rust sends i8 integers (–127..127); rescale to float32 [-1, 1].
				const floats = raw.samples.map((s) => s * SCALE);
				currentScopeHandler(floats, raw.sampleRate, raw.hz);
			}
		} catch {
			// Ignore — plugin may not be producing audio yet.
		} finally {
			pollInFlight = false;
			scheduleNextFrame();
		}
	};

	installScopeProperty((active) => {
		if (active) {
			scheduleNextFrame();
			return;
		}
		stopPolling();
	});

	// Clean up on page unload so the interval doesn't dangle.
	window.addEventListener("pagehide", () => {
		destroyed = true;
		stopPolling();
	});
}
