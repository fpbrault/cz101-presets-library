import { act, cleanup, render } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { __resetBeamerLegacyBridgeForTests } from "./lib/beamerLegacyBridge";

vi.mock("./PluginPage", () => ({
	default: ({ headerExtra }: { headerExtra?: React.ReactNode }) => (
		<div data-testid="plugin-page">{headerExtra}</div>
	),
}));

vi.mock("./update/checkPluginUpdate", () => ({
	checkForPluginUpdate: vi.fn().mockResolvedValue(null),
}));

function createRuntime() {
	return {
		_onInit: vi.fn(),
		_onParams: vi.fn(),
		invoke: vi.fn().mockResolvedValue({
			samples: [],
			sampleRate: 44_100,
			hz: 220,
		}),
		params: {
			info: () => undefined,
			beginEdit: vi.fn(),
			set: vi.fn(),
			endEdit: vi.fn(),
		},
	};
}

beforeEach(() => {
	vi.useFakeTimers();
	__resetBeamerLegacyBridgeForTests();
	window.__BEAMER__ = undefined;
	vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	__resetBeamerLegacyBridgeForTests();
	window.__BEAMER__ = undefined;
});

describe("App bridge polling", () => {
	it("installs the bridge after the runtime appears later", async () => {
		render(<App />);
		expect(window.ipc).toBeUndefined();

		window.__BEAMER__ = createRuntime();
		act(() => {
			vi.advanceTimersByTime(60);
		});
		await Promise.resolve();

		expect(window.ipc).toBeDefined();
	});
});
