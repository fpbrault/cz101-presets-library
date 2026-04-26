/**
 * nih-plug IPC bridge.
 *
 * Provides a plugin bridge surface for the webview (window.__czOnParams,
 * window.__czGetEnvelopes, window.__czGetModMatrix, window.__czOnScope,
 * window.ipc.postMessage) but wired to the wry WebView IPC channel that
 * nih-plug / Rust uses.
 *
 * ## Rust → JS (inbound):
 *   - `window.__czOnParams(jsonString)` — pushed by Rust after param changes
 *   - `window.__czIpcResponse({ id, result })` — RPC replies
 *
 * ## JS → Rust (outbound via window.ipc.postMessage):
 *   - Param change:  `{ param_id: string, value: number }`
 *   - RPC invoke:    `{ id: number, method: string, args: unknown[] }`
 */

import type {
	AlgoControlValueV1,
	ModMatrix,
	StepEnvData,
} from "@cosmo/cosmo-pd101";

// ─── Types ───────────────────────────────────────────────────────────────────

type EnvelopeId =
	| "l1_dco"
	| "l1_dcw"
	| "l1_dca"
	| "l2_dco"
	| "l2_dcw"
	| "l2_dca";

type EnvelopeMap = Partial<Record<EnvelopeId, StepEnvData>>;

type AlgoControlsPayload = {
	line: 1 | 2;
	bank?: "a" | "b";
	controls: AlgoControlValueV1[];
};

type IpcRpcResponse = {
	id: number;
	result?: unknown;
	error?: string;
};

type ScopeDataResponse = {
	samples: number[];
	sampleRate: number;
	hz: number;
};

declare global {
	interface Window {
		ipc?: { postMessage: (msg: string) => void };
		__czOnParams?: (json: unknown) => void;
		__czGetEnvelopes?: () => Promise<EnvelopeMap>;
		__czGetModMatrix?: () => Promise<ModMatrix>;
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
		__czIpcResponse?: (response: IpcRpcResponse) => void;
	}
}

// ─── State ───────────────────────────────────────────────────────────────────

let installed = false;
let nextRpcId = 1;
const pendingRpc = new Map<
	number,
	{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>();

let currentParamHandler: ((json: string) => void) | undefined;
let currentScopeHandler:
	| ((samples: number[], sampleRate: number, hz: number) => void)
	| undefined;
let nativeIpcObject: Window["ipc"] | undefined;

type IpcPostMessage = (msg: string) => void;
let _routerPostMessage: IpcPostMessage | null = null;

// ─── RPC helper ──────────────────────────────────────────────────────────────

function invokeRust(method: string, ...args: unknown[]): Promise<unknown> {
	return new Promise((resolve, reject) => {
		if (!_nativePostMessage) {
			reject(new Error("[nihPlugBridge] native IPC not available"));
			return;
		}
		const id = nextRpcId++;
		pendingRpc.set(id, { resolve, reject });
		_nativePostMessage(JSON.stringify({ id, method, args }));
	});
}

// ─── Param property ──────────────────────────────────────────────────────────

function installParamProperty() {
	const descriptor = Object.getOwnPropertyDescriptor(window, "__czOnParams");
	if (descriptor && descriptor.configurable === false) {
		currentParamHandler =
			typeof window.__czOnParams === "function"
				? window.__czOnParams
				: undefined;
		return;
	}
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
		},
	});
}

// ─── RPC response handler ─────────────────────────────────────────────────────

function installIpcResponseHandler() {
	const handler = (response: IpcRpcResponse) => {
		const pending = pendingRpc.get(response.id);
		if (!pending) {
			return;
		}
		pendingRpc.delete(response.id);
		if (response.error !== undefined) {
			pending.reject(new Error(response.error));
		} else {
			pending.resolve(response.result);
		}
	};

	const descriptor = Object.getOwnPropertyDescriptor(window, "__czIpcResponse");
	const isReadonlyDescriptor = Boolean(
		descriptor &&
			descriptor.configurable === false &&
			(("writable" in descriptor && descriptor.writable === false) ||
				(!("writable" in descriptor) && !descriptor.set)),
	);
	if (isReadonlyDescriptor) {
		// Host owns this callback as readonly; do not reassign and avoid crashing.
		return;
	}

	try {
		Object.defineProperty(window, "__czIpcResponse", {
			configurable: true,
			writable: true,
			value: handler,
		});
	} catch {
		// Some hosts expose this symbol as immutable/non-configurable.
	}
}

function routeOutgoingMessage(message: string) {
	let payload: unknown;
	try {
		payload = JSON.parse(message) as unknown;
	} catch {
		_nativePostMessage(message);
		return;
	}

	if (typeof payload !== "object" || payload === null) {
		_nativePostMessage(message);
		return;
	}

	if ("method" in payload) {
		// RPC envelopes are already in Rust-native format.
		_nativePostMessage(message);
		return;
	}

	const msg = payload as Record<string, unknown>;

	if ("param_id" in msg) {
		// Direct param change — send raw; Rust reads { param_id, value }.
		_nativePostMessage(message);
		return;
	}

	if ("algo_controls" in msg) {
		const ac = msg.algo_controls as AlgoControlsPayload;
		void invokeRust(
			"setAlgoControls",
			ac.line,
			ac.bank ?? "a",
			ac.controls,
		).catch((error) => {
			console.error("[nihPlugBridge] setAlgoControls error", error);
		});
		return;
	}

	if ("mod_matrix" in msg) {
		void invokeRust("setModMatrix", msg.mod_matrix).catch((error) => {
			console.error("[nihPlugBridge] setModMatrix error", error);
		});
		return;
	}

	if ("envelope_id" in msg) {
		void invokeRust("setEnvelope", msg.envelope_id, msg.data).catch((error) => {
			console.error("[nihPlugBridge] setEnvelope error", error);
		});
		return;
	}

	_nativePostMessage(message);
}

// ─── window.ipc router ────────────────────────────────────────────────────────

/**
 * Install the `window.ipc.postMessage` handler that routes outbound messages
 * from the synth UI components to the Rust backend.
 *
 * The UI sends:
 *   - `{ param_id, value }` — plain param value change
 *   - `{ envelope_id, data }` — envelope update (RPC)
 *   - `{ algo_controls }` — algo controls update (RPC)
 *   - `{ mod_matrix }` — mod matrix update (RPC)
 */
function installIpcRouter() {
	_routerPostMessage = routeOutgoingMessage;

	window.__czGetEnvelopes = async () => {
		const response = await invokeRust("getEnvelopes");
		return (response ?? {}) as EnvelopeMap;
	};

	window.__czGetModMatrix = async () => {
		const response = await invokeRust("getModMatrix");
		return (response ?? { routes: [] }) as ModMatrix;
	};
}

// ─── Native IPC passthrough ───────────────────────────────────────────────────

// wry's native IPC endpoint: the original window.ipc before we override it.
// We capture it once before installing our router.
let _nativePostMessage: (msg: string) => void = (msg) => {
	console.warn("[nihPlugBridge] native IPC not available yet, dropped:", msg);
};

// ─── Scope polling ────────────────────────────────────────────────────────────

function installScopeProperty(onActiveChange: (active: boolean) => void) {
	const descriptor = Object.getOwnPropertyDescriptor(window, "__czOnScope");
	if (descriptor && descriptor.configurable === false) {
		currentScopeHandler =
			typeof window.__czOnScope === "function" ? window.__czOnScope : undefined;
		onActiveChange(currentScopeHandler !== undefined);
		return;
	}
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

function installScopePolling() {
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
			const raw = (await invokeRust("getScopeData")) as ScopeDataResponse;
			if (raw?.samples.length > 0 && currentScopeHandler) {
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
		} else {
			stopPolling();
		}
	});

	window.addEventListener("pagehide", () => {
		destroyed = true;
		stopPolling();
	});
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Installs the nih-plug IPC bridge.  Call this from `usePluginParamBridge`;
 * it is safe to call multiple times — subsequent calls are no-ops.
 *
 * Returns `true` if the native `window.ipc` endpoint is present (i.e. we're
 * running inside the plugin WebView), `false` otherwise (e.g. in the browser
 * dev harness).
 */
export function ensureNihPlugBridge(): boolean {
	if (installed) {
		return true;
	}

	if (!window.ipc) {
		return false;
	}

	// Capture the native IPC endpoint before we patch postMessage routing.
	nativeIpcObject = window.ipc;
	_nativePostMessage = window.ipc.postMessage.bind(window.ipc);

	installed = true;

	installParamProperty();
	installIpcResponseHandler();
	installIpcRouter();
	installScopePolling();

	// Fallback: if host prevented method patching, route via a getter/setter
	// shim on window.ipc that preserves the native object identity.
	if (nativeIpcObject?.postMessage !== routeOutgoingMessage) {
		const descriptor = Object.getOwnPropertyDescriptor(window, "ipc");
		if (!descriptor || descriptor.configurable) {
			try {
				Object.defineProperty(window, "ipc", {
					configurable: true,
					get() {
						if (!nativeIpcObject) {
							return undefined;
						}
						return {
							postMessage(message: string) {
								if (_routerPostMessage) {
									_routerPostMessage(message);
									return;
								}
								nativeIpcObject?.postMessage(message);
							},
						};
					},
					set(value) {
						nativeIpcObject = value;
						_nativePostMessage = value
							? value.postMessage.bind(value)
							: (msg: string) => {
									console.warn(
										"[nihPlugBridge] native IPC unavailable after reassignment, dropped:",
										msg,
									);
								};
					},
				});
			} catch {
				// Some hosts lock down window.ipc; keep native endpoint untouched.
			}
		}
	}

	return true;
}
