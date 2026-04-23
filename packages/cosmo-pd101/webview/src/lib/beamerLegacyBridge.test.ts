import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	__resetBeamerLegacyBridgeForTests,
	ensureBeamerLegacyBridge,
} from "./beamerLegacyBridge";

function createRuntime() {
	const originalOnInit = vi.fn();
	const originalOnParams = vi.fn();
	const params = new Map([
		[
			"volume",
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
		],
	]);

	return {
		_onInit: originalOnInit,
		_onParams: originalOnParams,
		invoke: vi.fn().mockResolvedValue({
			samples: [],
			sampleRate: 44_100,
			hz: 220,
		}),
		params: {
			info: (id: string) => params.get(id),
			beginEdit: vi.fn(),
			set: vi.fn(),
			endEdit: vi.fn(),
		},
		originalOnInit,
		originalOnParams,
	};
}

beforeEach(() => {
	__resetBeamerLegacyBridgeForTests();
	window.__BEAMER__ = undefined;
	vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	__resetBeamerLegacyBridgeForTests();
	window.__BEAMER__ = undefined;
});

describe("ensureBeamerLegacyBridge", () => {
	it("returns false until the runtime is available", () => {
		expect(ensureBeamerLegacyBridge()).toBe(false);
		expect(window.ipc).toBeUndefined();
	});

	it("replays synced params when the host handler is assigned later", async () => {
		window.__BEAMER__ = createRuntime();

		expect(ensureBeamerLegacyBridge()).toBe(true);

		const handler = vi.fn();
		window.__czOnParams = handler;
		await Promise.resolve();

		expect(handler).toHaveBeenCalledWith(JSON.stringify({ 0: 0.8 }));
	});

	it("installs only once and does not double-wrap param updates", async () => {
		const runtime = createRuntime();
		window.__BEAMER__ = runtime;

		expect(ensureBeamerLegacyBridge()).toBe(true);

		const handler = vi.fn();
		window.__czOnParams = handler;
		await Promise.resolve();
		handler.mockClear();

		expect(ensureBeamerLegacyBridge()).toBe(true);

		runtime._onParams({ 0: [0.25, 0.25, "25%"] });

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(JSON.stringify({ 0: 0.25 }));
		expect(runtime.originalOnParams).toHaveBeenCalledTimes(1);
	});
});
