/**
 * mockPluginBridge.test.ts — Unit tests for the mock bridge core logic.
 *
 * Runs in happy-dom (no real browser needed) because we exercise the bridge
 * data structures directly without rendering React.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	installMockPluginBridge,
	type MockBridgeMessage,
} from "./mockPluginBridge";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Reset globals that installMockPluginBridge writes to.
	window.__MOCK_BRIDGE__ = undefined;
	window.__BEAMER__ = undefined;
	window.ipc = undefined as unknown as typeof window.ipc;
	window.__czOnParams = undefined;
	installMockPluginBridge();
});

afterEach(() => {
	window.__MOCK_BRIDGE__?.reset();
});

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

describe("installMockPluginBridge", () => {
	it("installs window.__BEAMER__", () => {
		expect(window.__BEAMER__).toBeDefined();
	});

	it("installs window.__MOCK_BRIDGE__", () => {
		expect(window.__MOCK_BRIDGE__).toBeDefined();
	});

	it("window.__BEAMER__.ready is a resolved promise", async () => {
		await expect(window.__BEAMER__?.ready).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// params.set — outbound recording
// ---------------------------------------------------------------------------

describe("params.set", () => {
	it("records a param:set message with correct shape", () => {
		window.__BEAMER__?.params.set("volume", 0.5);

		const msgs = window.__MOCK_BRIDGE__?.getMessages() ?? [];
		expect(msgs).toHaveLength(1);
		expect(msgs[0]).toMatchObject({
			type: "param:set",
			stringId: "volume",
			value: 0.5,
		});
	});

	it("updates virtual param state", () => {
		window.__BEAMER__?.params.set("volume", 0.7);
		const state = window.__MOCK_BRIDGE__?.getState() ?? {};
		expect(state["volume"]).toBeCloseTo(0.7, 5);
	});

	it("records param:begin and param:end events", () => {
		window.__BEAMER__?.params.beginEdit("volume");
		window.__BEAMER__?.params.set("volume", 0.3);
		window.__BEAMER__?.params.endEdit("volume");

		const types = (window.__MOCK_BRIDGE__?.getMessages() ?? []).map(
			(m) => m.type,
		);
		expect(types).toEqual(["param:begin", "param:set", "param:end"]);
	});

	it("is a no-op for unknown stringIds", () => {
		window.__BEAMER__?.params.set("unknown_param", 0.5);
		expect(window.__MOCK_BRIDGE__?.getMessages()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// params.info — read-back
// ---------------------------------------------------------------------------

describe("params.info", () => {
	it("returns correct info for a known param", () => {
		const info = window.__BEAMER__?.params.info("volume");
		expect(info).toBeDefined();
		expect(info?.min).toBe(0);
		expect(info?.max).toBe(1);
	});

	it("returns undefined for an unknown param", () => {
		const info = window.__BEAMER__?.params.info("not_a_real_param");
		expect(info).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// invoke
// ---------------------------------------------------------------------------

describe("invoke", () => {
	it("records an invoke message", async () => {
		await window.__BEAMER__?.invoke("getEnvelopes");
		const msgs = window.__MOCK_BRIDGE__?.getMessages() ?? [];
		expect(
			msgs.some((m) => m.type === "invoke" && m.method === "getEnvelopes"),
		).toBe(true);
	});

	it("resolves getEnvelopes immediately", async () => {
		const result = await window.__BEAMER__?.invoke("getEnvelopes");
		expect(result).toEqual({});
	});

	it("resolves getScopeData with empty samples", async () => {
		const result = (await window.__BEAMER__?.invoke("getScopeData")) as {
			samples: number[];
		};
		expect(result.samples).toHaveLength(0);
	});

	it("allows test to resolve custom invocations via resolveNextInvoke", async () => {
		const promise = window.__BEAMER__?.invoke("customMethod");
		window.__MOCK_BRIDGE__?.resolveNextInvoke({ ok: true });
		const result = await promise;
		expect(result).toEqual({ ok: true });
	});

	it("allows test to reject custom invocations via rejectNextInvoke", async () => {
		const promise = window.__BEAMER__?.invoke("failingMethod");
		window.__MOCK_BRIDGE__?.rejectNextInvoke("something went wrong");
		await expect(promise).rejects.toBe("something went wrong");
	});
});

// ---------------------------------------------------------------------------
// pushParamUpdate (inbound: host → UI simulation)
// ---------------------------------------------------------------------------

describe("pushParamUpdate", () => {
	it("calls window.__czOnParams with serialised JSON when handler is set", () => {
		const handler = vi.fn();
		window.__czOnParams = handler;

		window.__MOCK_BRIDGE__?.pushParamUpdate("volume", 0.6);

		expect(handler).toHaveBeenCalledWith(JSON.stringify({ volume: 0.6 }));
	});

	it("does not throw when __czOnParams is not set", () => {
		window.__czOnParams = undefined;
		expect(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.5)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// setParameter alias command
// ---------------------------------------------------------------------------

describe("setParameter alias", () => {
	it("falls back to pushParamUpdate when window.ipc is absent", () => {
		const handler = vi.fn();
		window.__czOnParams = handler;
		window.ipc = undefined as unknown as typeof window.ipc;

		window.__MOCK_BRIDGE__?.setParameter("volume", 0.4);

		expect(handler).toHaveBeenCalledWith(JSON.stringify({ volume: 0.4 }));
	});

	it("routes through window.ipc.postMessage when installed", () => {
		const spy = vi.fn();
		window.ipc = { postMessage: spy };

		window.__MOCK_BRIDGE__?.setParameter("volume", 0.9);

		expect(spy).toHaveBeenCalledWith(
			JSON.stringify({ param_id: "volume", value: 0.9 }),
		);
	});
});

// ---------------------------------------------------------------------------
// onMessage subscription
// ---------------------------------------------------------------------------

describe("onMessage", () => {
	it("calls the listener on each recorded message", () => {
		const received: MockBridgeMessage[] = [];
		const bridge = window.__MOCK_BRIDGE__;
		if (!bridge) throw new Error("bridge not installed in beforeEach");
		const unsub = bridge.onMessage((m) => received.push(m));

		window.__BEAMER__?.params.set("volume", 0.2);
		expect(received).toHaveLength(1);
		expect(received[0].type).toBe("param:set");

		unsub();
		window.__BEAMER__?.params.set("volume", 0.3);
		// Listener was unsubscribed; still only one message.
		expect(received).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// clearMessages / reset
// ---------------------------------------------------------------------------

describe("clearMessages and reset", () => {
	it("clearMessages empties the log", () => {
		window.__BEAMER__?.params.set("volume", 0.5);
		expect(window.__MOCK_BRIDGE__?.getMessages()).toHaveLength(1);

		window.__MOCK_BRIDGE__?.clearMessages();
		expect(window.__MOCK_BRIDGE__?.getMessages()).toHaveLength(0);
	});

	it("getLastMessage returns undefined after clear", () => {
		window.__BEAMER__?.params.set("volume", 0.5);
		window.__MOCK_BRIDGE__?.clearMessages();
		expect(window.__MOCK_BRIDGE__?.getLastMessage()).toBeUndefined();
	});

	it("reset clears messages and stops listeners", () => {
		const received: MockBridgeMessage[] = [];
		const bridge = window.__MOCK_BRIDGE__;
		if (!bridge) throw new Error("bridge not installed in beforeEach");
		bridge.onMessage((m) => received.push(m));
		window.__BEAMER__?.params.set("volume", 0.5);
		expect(received).toHaveLength(1);

		window.__MOCK_BRIDGE__?.reset();
		expect(window.__MOCK_BRIDGE__?.getMessages()).toHaveLength(0);
		// After reset, listener is removed.
		window.__BEAMER__?.params.set("volume", 0.6);
		expect(received).toHaveLength(1);
	});
});
