/**
 * Mock Plugin Bridge — E2E / Unit Test Harness
 *
 * Installs a synthetic window.__BEAMER__ runtime that mirrors the real Beamer
 * message contract, intercepts outbound bridge traffic, and exposes
 * window.__MOCK_BRIDGE__ for Playwright / Vitest assertions.
 *
 * Import and call installMockPluginBridge() BEFORE rendering React.
 * Never imported in production builds (guarded by VITE_TEST_HARNESS=1 in main.tsx).
 *
 * TODO: Remove this guard once CI-stable and promoted to a permanent fixture.
 */

// ---------------------------------------------------------------------------
// Shared types (structural copies of the private types in beamerLegacyBridge)
// ---------------------------------------------------------------------------

interface BeamerParamInfo {
	id: number;
	stringId: string;
	name: string;
	min: number;
	max: number;
	defaultValue: number;
	value: number; // normalized 0–1
	plainValue: number;
	displayText: string;
	format: string;
	units: string;
	steps: number;
}

type BeamerParamUpdate = Record<string, [number, number, string]>;

// ---------------------------------------------------------------------------
// Public types exposed on window.__MOCK_BRIDGE__
// ---------------------------------------------------------------------------

export interface MockBridgeMessage {
	type: "param:set" | "param:begin" | "param:end" | "invoke" | "event";
	[key: string]: unknown;
}

export interface MockBridgeHandle {
	/** All recorded outbound messages (UI → host). */
	getMessages(): MockBridgeMessage[];
	/** Last recorded outbound message or undefined when empty. */
	getLastMessage(): MockBridgeMessage | undefined;
	/** Remove all recorded messages. */
	clearMessages(): void;

	/**
	 * Push an inbound param update (simulates Rust → UI) via the legacy
	 * numeric param ID path (window.__czOnParams).
	 */
	pushParamUpdate(legacyId: number, value: number): void;

	/**
	 * Push an inbound param update through the Beamer runtime _onParams path.
	 * @param update  Map of numeric-or-string param ID → [normalized, plain, displayText]
	 */
	pushBeamerParamUpdate(update: BeamerParamUpdate): void;

	/**
	 * Alias for test ergonomics: sends a legacy-format message through
	 * window.ipc (if installed) or falls back to pushParamUpdate.
	 * Tests the full alias → installLegacyIpc → runtime.params.set chain.
	 */
	setParameter(parameterId: number, value: number): void;

	/** Return a snapshot of the virtual DSP param state (normalized 0–1 by Beamer numeric ID). */
	getState(): Record<number, number>;

	/** Subscribe to outbound message events. Returns an unsubscribe function. */
	onMessage(cb: (msg: MockBridgeMessage) => void): () => void;

	/** Simulate a successful invoke result for the next pending unresolved invoke. */
	resolveNextInvoke(result: unknown): void;

	/** Simulate a failed invoke for the next pending unresolved invoke. */
	rejectNextInvoke(error: string): void;

	/** Reset recorded messages and pending listeners. Does NOT reinstall the runtime. */
	reset(): void;
}

declare global {
	interface Window {
		__MOCK_BRIDGE__?: MockBridgeHandle;
	}
}

// ---------------------------------------------------------------------------
// Default parameter set
// Provides the params used by the E2E spec and a representative global set.
// Other params return undefined from info(), which beamerLegacyBridge skips.
// ---------------------------------------------------------------------------

/** Legacy numeric ID → BeamerParamInfo lookup used to build the mock runtime. */
const DEFAULT_PARAMS: BeamerParamInfo[] = [
	// Global
	{
		id: 0,
		stringId: "volume",
		name: "Volume",
		min: 0,
		max: 1,
		defaultValue: 0.8,
		value: 0.8,
		plainValue: 0.8,
		displayText: "80%",
		format: "{:.0f}%",
		units: "",
		steps: 0,
	},
	// Line 1/2 DCW base (warp amount)
	{
		id: 102,
		stringId: "l1_dcw_base",
		name: "L1 DCW Base",
		min: 0,
		max: 1,
		defaultValue: 0.5,
		value: 0.5,
		plainValue: 0.5,
		displayText: "0.50",
		format: "{:.2f}",
		units: "",
		steps: 0,
	},
	{
		id: 101,
		stringId: "l1_warp_algo",
		name: "L1 Warp Algo",
		min: 0,
		max: 12,
		defaultValue: 0,
		value: 0,
		plainValue: 0,
		displayText: "CZ101",
		format: "{:.0f}",
		units: "",
		steps: 0,
	},
	{
		id: 202,
		stringId: "l2_dcw_base",
		name: "L2 DCW Base",
		min: 0,
		max: 1,
		defaultValue: 0.5,
		value: 0.5,
		plainValue: 0.5,
		displayText: "0.50",
		format: "{:.2f}",
		units: "",
		steps: 0,
	},
	// Chorus
	{
		id: 400,
		stringId: "cho_mix",
		name: "Chorus Mix",
		min: 0,
		max: 1,
		defaultValue: 0.5,
		value: 0.5,
		plainValue: 0.5,
		displayText: "50%",
		format: "{:.0f}%",
		units: "",
		steps: 0,
	},
	{
		id: 401,
		stringId: "cho_rate",
		name: "Chorus Rate",
		min: 0.1,
		max: 5,
		defaultValue: 1,
		value: (1 - 0.1) / (5 - 0.1),
		plainValue: 1,
		displayText: "1.0",
		format: "{:.1f}",
		units: "Hz",
		steps: 0,
	},
	{
		id: 402,
		stringId: "cho_depth",
		name: "Chorus Depth",
		min: 0,
		max: 3,
		defaultValue: 0.5,
		value: 0.5 / 3,
		plainValue: 0.5,
		displayText: "17%",
		format: "{:.0f}%",
		units: "",
		steps: 0,
	},
	// Filter (needed for panel-enabled state)
	{
		id: 800,
		stringId: "fil_enabled",
		name: "Filter Enabled",
		min: 0,
		max: 1,
		defaultValue: 0,
		value: 0,
		plainValue: 0,
		displayText: "Off",
		format: "{}",
		units: "",
		steps: 2,
	},
	{
		id: 801,
		stringId: "fil_cutoff",
		name: "Filter Cutoff",
		min: 20,
		max: 20000,
		defaultValue: 2000,
		value: (2000 - 20) / (20000 - 20),
		plainValue: 2000,
		displayText: "2000",
		format: "{:.0f}",
		units: "Hz",
		steps: 0,
	},
];

// ---------------------------------------------------------------------------
// installMockPluginBridge
// ---------------------------------------------------------------------------

export function installMockPluginBridge(): void {
	const messages: MockBridgeMessage[] = [];
	const messageListeners: Array<(msg: MockBridgeMessage) => void> = [];
	let pendingInvokeResolve: ((result: unknown) => void) | null = null;
	let pendingInvokeReject: ((error: string) => void) | null = null;

	// Virtual param state: Beamer numeric ID → normalized value
	const virtualParamState: Record<number, number> = {};
	const paramsByStringId: Record<string, BeamerParamInfo> = {};
	const paramsById: Record<number, BeamerParamInfo> = {};

	for (const p of DEFAULT_PARAMS) {
		const entry = { ...p };
		paramsByStringId[p.stringId] = entry;
		paramsById[p.id] = entry;
		virtualParamState[p.id] = p.value;
	}

	function recordMessage(msg: MockBridgeMessage): void {
		messages.push(msg);
		for (const listener of messageListeners) {
			try {
				listener(msg);
			} catch {
				// listeners must not break the bridge
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Synthetic window.__BEAMER__ runtime
	// Structurally matches the BeamerRuntime type consumed by beamerLegacyBridge.
	// ---------------------------------------------------------------------------

	window.__BEAMER__ = {
		// Promise already resolved — no host _onInit needed in test mode.
		ready: Promise.resolve(),

		params: {
			get: (stringId: string) => paramsByStringId[stringId]?.value ?? 0,

			getPlain: (stringId: string) =>
				paramsByStringId[stringId]?.plainValue ?? 0,

			getDisplayText: (stringId: string) =>
				paramsByStringId[stringId]?.displayText ?? "",

			set: (stringId: string, normalizedValue: number) => {
				const p = paramsByStringId[stringId];
				if (!p) return;
				p.value = normalizedValue;
				p.plainValue = p.min + normalizedValue * (p.max - p.min);
				virtualParamState[p.id] = normalizedValue;
				recordMessage({
					type: "param:set",
					id: p.id,
					stringId,
					value: normalizedValue,
				});
			},

			beginEdit: (stringId: string) => {
				const p = paramsByStringId[stringId];
				if (p) recordMessage({ type: "param:begin", id: p.id, stringId });
			},

			endEdit: (stringId: string) => {
				const p = paramsByStringId[stringId];
				if (p) recordMessage({ type: "param:end", id: p.id, stringId });
			},

			// Unused by beamerLegacyBridge but part of the full runtime shape.
			on: (_stringId: string, _cb: (v: number) => void) => () => {},

			all: () => Object.values(paramsByStringId),

			info: (stringId: string) => paramsByStringId[stringId],
		},

		invoke: (method: string, ...args: unknown[]) => {
			recordMessage({ type: "invoke", method, args });

			return new Promise<unknown>((resolve, reject) => {
				// Automatically handle well-known side-effect-free invocations.
				if (method === "getEnvelopes") {
					resolve({});
					return;
				}
				if (method === "setEnvelope") {
					resolve(null);
					return;
				}
				if (method === "setAlgoControls") {
					resolve(null);
					return;
				}
				if (method === "getAlgoControls") {
					resolve({ line1: [], line2: [] });
					return;
				}
				if (method === "getScopeData") {
					// Return empty scope data so the polling loop doesn't error.
					resolve({ samples: [], sampleRate: 44100, hz: 220 });
					return;
				}

				// Unknown invocations queue so tests can drive the response.
				pendingInvokeResolve = resolve;
				pendingInvokeReject = reject;
			});
		},

		// Event system (used by custom plugins, not required for PD-101 tests).
		on: (_name: string, _cb: (data: unknown) => void) => () => {},
		emit: (_name: string, _data: unknown) => {},

		// These are replaced by ensureBeamerLegacyBridge() — stubs are fine.
		_onInit: (_params: BeamerParamInfo[]) => {},
		_onParams: (_update: BeamerParamUpdate) => {},
	} as unknown as NonNullable<Window["__BEAMER__"]>;

	// ---------------------------------------------------------------------------
	// Public test handle — window.__MOCK_BRIDGE__
	// ---------------------------------------------------------------------------

	const handle: MockBridgeHandle = {
		getMessages: () => [...messages],

		getLastMessage: () => messages[messages.length - 1],

		clearMessages: () => {
			messages.length = 0;
		},

		pushParamUpdate(legacyId: number, value: number): void {
			if (window.__czOnParams) {
				window.__czOnParams(JSON.stringify({ [legacyId]: value }));
			}
		},

		pushBeamerParamUpdate(update: BeamerParamUpdate): void {
			// Directly invoke the _onParams handler installed by beamerLegacyBridge.
			window.__BEAMER__?._onParams(update);
		},

		setParameter(parameterId: number, value: number): void {
			if (window.ipc) {
				// Full alias → installLegacyIpc → runtime.params path.
				window.ipc.postMessage(
					JSON.stringify({ parameter_id: parameterId, value }),
				);
			} else {
				// Bridge not yet installed — fall back to direct push.
				this.pushParamUpdate(parameterId, value);
			}
		},

		getState: () => ({ ...virtualParamState }),

		onMessage(cb: (msg: MockBridgeMessage) => void): () => void {
			messageListeners.push(cb);
			return () => {
				const idx = messageListeners.indexOf(cb);
				if (idx >= 0) messageListeners.splice(idx, 1);
			};
		},

		resolveNextInvoke(result: unknown): void {
			pendingInvokeResolve?.(result);
			pendingInvokeResolve = null;
		},

		rejectNextInvoke(error: string): void {
			pendingInvokeReject?.(error);
			pendingInvokeReject = null;
		},

		reset(): void {
			messages.length = 0;
			messageListeners.length = 0;
			pendingInvokeResolve = null;
			pendingInvokeReject = null;
		},
	};

	window.__MOCK_BRIDGE__ = handle;
}
