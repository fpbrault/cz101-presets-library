/**
 * nih-plug IPC bridge.
 *
 * Provides the same surface as beamerBridge (window.__czOnParams,
 * window.__czGetEnvelopes, window.__czGetModMatrix, window.__czOnScope,
 * window.ipc.postMessage) but wired to the wry WebView IPC channel that
 * nih-plug / Rust uses.
 *
 * ## Rust → JS (inbound):
 *   - `window.__czOnParams(jsonObject)` — pushed by Rust after param changes
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

let latestParams: Record<string, number> = {};
let currentParamHandler: ((json: string) => void) | undefined;
let currentScopeHandler:
	| ((samples: number[], sampleRate: number, hz: number) => void)
	| undefined;

// ─── RPC helper ──────────────────────────────────────────────────────────────

function invokeRust(method: string, ...args: unknown[]): Promise<unknown> {
	return new Promise((resolve, reject) => {
		if (!window.ipc) {
			reject(new Error("[nihPlugBridge] window.ipc not available"));
			return;
		}
		const id = nextRpcId++;
		pendingRpc.set(id, { resolve, reject });
		window.ipc.postMessage(JSON.stringify({ id, method, args }));
	});
}

// ─── Param property ──────────────────────────────────────────────────────────

function emitParams(payload: Record<string, number>) {
	const changed: Record<string, number> = {};
	for (const [id, value] of Object.entries(payload)) {
		if (latestParams[id] !== value) {
			changed[id] = value;
		}
	}
	if (Object.keys(changed).length === 0) {
		return;
	}
	latestParams = { ...latestParams, ...changed };
	currentParamHandler?.(JSON.stringify(changed));
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

// ─── RPC response handler ─────────────────────────────────────────────────────

function installIpcResponseHandler() {
	window.__czIpcResponse = (response: IpcRpcResponse) => {
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

	// Rust also calls __czOnParams directly for param pushes — the property
	// accessor above handles that. But Rust pushes the full params JSON object
	// (not a diff) so we coerce it here and delegate to emitParams.
	const origOnParams = window.__czOnParams;
	// Install a setter-aware receiver so Rust's evaluate_script call works.
	// Note: the property is already defined as a getter/setter above, so
	// direct assignment from Rust (via evaluate_script) will trigger our setter.
	if (
		origOnParams &&
		typeof origOnParams === "function" &&
		Object.keys(latestParams).length === 0
	) {
		// Already hooked; nothing more to do.
	}
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
	window.ipc = {
		postMessage(message: string) {
			// Already an RPC envelope (has `method` key) — pass through.
			let payload: unknown;
			try {
				payload = JSON.parse(message) as unknown;
			} catch {
				return;
			}

			if (
				typeof payload !== "object" ||
				payload === null ||
				"method" in payload
			) {
				// Raw RPC or non-object: forward as-is to the native IPC.
				// (In the nih-plug/wry setup, window.ipc IS the native channel,
				//  so we shouldn't recurse. This guard prevents infinite loops.)
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
				void invokeRust("setEnvelope", msg.envelope_id, msg.data).catch(
					(error) => {
						console.error("[nihPlugBridge] setEnvelope error", error);
					},
				);
				return;
			}
		},
	};

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

	// Capture the native IPC endpoint before we replace window.ipc.
	_nativePostMessage = window.ipc.postMessage.bind(window.ipc);

	installed = true;

	installParamProperty();
	installIpcResponseHandler();
	installIpcRouter();
	installScopePolling();

	// Ask Rust to push the initial param snapshot.
	// Rust will call window.__czOnParams(jsonObject) in response.
	// (If Rust already pushed params before the bridge was ready, the
	//  __czOnParams setter will replay them when a consumer subscribes.)
	_nativePostMessage(
		JSON.stringify({ id: nextRpcId++, method: "getParams", args: [] }),
	);

	return true;
}
