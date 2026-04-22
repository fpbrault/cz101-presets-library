import { expect, test } from "@playwright/test";
import {
	getMessages,
	setupPluginPage,
	waitForMessage,
} from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Alias command path", () => {
	test("setParameter alias routes through installLegacyIpc and records volume", async ({
		page,
	}) => {
		await page.evaluate(() => window.__MOCK_BRIDGE__?.setParameter(0, 0.75));

		await waitForMessage(page, "param:set", "volume");

		const messages = await getMessages(page);
		const setMessage = messages.find(
			(message) => message.type === "param:set" && message.stringId === "volume",
		);
		expect(setMessage).toBeDefined();
		expect(setMessage?.value as number).toBeCloseTo(0.75, 2);
	});

	test("setParameter alias records l1_dcw_base for legacy param 102", async ({
		page,
	}) => {
		await page.evaluate(() => window.__MOCK_BRIDGE__?.setParameter(102, 0.61));

		await waitForMessage(page, "param:set", "l1_dcw_base");

		const messages = await getMessages(page);
		const setMessage = messages.find(
			(message) =>
				message.type === "param:set" && message.stringId === "l1_dcw_base",
		);
		expect(setMessage).toBeDefined();
		expect(setMessage?.value as number).toBeCloseTo(0.61, 2);
	});

	test("setParameter alias records l2_dcw_base for legacy param 202", async ({
		page,
	}) => {
		await page.evaluate(() => window.__MOCK_BRIDGE__?.setParameter(202, 0.37));

		await waitForMessage(page, "param:set", "l2_dcw_base");

		const messages = await getMessages(page);
		const setMessage = messages.find(
			(message) =>
				message.type === "param:set" && message.stringId === "l2_dcw_base",
		);
		expect(setMessage).toBeDefined();
		expect(setMessage?.value as number).toBeCloseTo(0.37, 2);
	});

	test("setParameter falls back gracefully when ipc is not installed", async ({
		page,
	}) => {
		await page.evaluate(() => {
			const bridgeWindow = window as Window & { ipc?: { postMessage: (msg: string) => void } };
			const saved = bridgeWindow.ipc;
			bridgeWindow.ipc = undefined;
			window.__MOCK_BRIDGE__?.setParameter(0, 0.5);
			bridgeWindow.ipc = saved;
		});

		const state = await page.evaluate(() => window.__MOCK_BRIDGE__?.getState());
		expect(state).toBeDefined();
	});
});
