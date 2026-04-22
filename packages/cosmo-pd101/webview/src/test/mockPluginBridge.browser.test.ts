import { beforeEach, describe, expect, it } from "vitest";
import { installMockPluginBridge } from "./mockPluginBridge";

beforeEach(() => {
	window.__MOCK_BRIDGE__ = undefined;
	window.__BEAMER__ = undefined;
	window.ipc = undefined as unknown as typeof window.ipc;
	window.__czOnParams = undefined;
	installMockPluginBridge();
	window.__MOCK_BRIDGE__?.clearMessages();
});

describe("mockPluginBridge (browser)", () => {
	it("records l1_dcw_base via runtime params.set", async () => {
		window.__BEAMER__?.params.set("l1_dcw_base", 0.44);

		await expect
			.poll(
				() => {
					return window.__MOCK_BRIDGE__
						?.getMessages()
						.some(
							(m) => m.type === "param:set" && m.stringId === "l1_dcw_base",
						);
				},
				{ timeout: 1000 },
			)
			.toBe(true);
	});

	it("records l2_dcw_base via runtime params.set", async () => {
		window.__BEAMER__?.params.set("l2_dcw_base", 0.37);

		await expect
			.poll(
				() => {
					return window.__MOCK_BRIDGE__
						?.getMessages()
						.some(
							(m) => m.type === "param:set" && m.stringId === "l2_dcw_base",
						);
				},
				{ timeout: 1000 },
			)
			.toBe(true);
	});
});
