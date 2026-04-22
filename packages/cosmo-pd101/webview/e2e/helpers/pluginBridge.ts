import { expect, type Page } from "@playwright/test";
import type { MockBridgeMessage } from "../../src/test/mockPluginBridge";

export async function waitForBridge(page: Page): Promise<void> {
	await page.waitForFunction(
		() =>
			typeof window.__MOCK_BRIDGE__ !== "undefined" &&
			typeof (window as Window & { __czOnParams?: (json: string) => void }).__czOnParams !== "undefined",
		{ timeout: 5000 },
	);
}

export async function setupPluginPage(page: Page): Promise<void> {
	await page.goto("/");
	await waitForBridge(page);
	await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
}

export async function getMessages(page: Page): Promise<MockBridgeMessage[]> {
	return page.evaluate(
		() => (window.__MOCK_BRIDGE__?.getMessages() ?? []) as MockBridgeMessage[],
	);
}

export async function waitForMessage(
	page: Page,
	type: MockBridgeMessage["type"],
	stringId?: string,
): Promise<void> {
	await expect
		.poll(
			async () => {
				const messages = await getMessages(page);
				return messages.some(
					(message) =>
						message.type === type &&
						(stringId === undefined || message.stringId === stringId),
				);
			},
			{ timeout: 3000, intervals: [100, 200, 500] },
		)
		.toBe(true);
}

export async function waitForMessageMatching(
	page: Page,
	matcher: (message: MockBridgeMessage) => boolean,
): Promise<void> {
	await expect
		.poll(
			async () => {
				const messages = await getMessages(page);
				return messages.some(matcher);
			},
			{ timeout: 3000, intervals: [100, 200, 500] },
		)
		.toBe(true);
}
