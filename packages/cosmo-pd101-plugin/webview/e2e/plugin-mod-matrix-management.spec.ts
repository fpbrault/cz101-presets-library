import { expect, test } from "@playwright/test";
import {
	setupPluginPage,
	waitForMessageMatching,
} from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Mod matrix route management", () => {
	test.skip("add, adjust, disable, and remove route emits setModMatrix payloads", async ({
		page,
	}) => {
		const volumeKnob = page.getByRole("spinbutton", { name: /^volume$/i });
		await expect(volumeKnob).toBeVisible();
		await volumeKnob.hover();

		const modulationButton = page.getByRole("button", {
			name: /modulation for volume/i,
		});
		await expect(modulationButton).toBeVisible();
		await modulationButton.click();
		const modulationMenu = page.getByRole("dialog", {
			name: /modulation for volume/i,
		});
		await expect(modulationMenu).toBeVisible();

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await modulationMenu.getByRole("button", { name: /^add$/i }).click();
		await waitForMessageMatching(page, (message) => {
			if (message.type !== "invoke" || message.method !== "setModMatrix") {
				return false;
			}
			if (!Array.isArray(message.args) || message.args.length < 1) {
				return false;
			}
			const payload = message.args[0] as {
				routes?: Array<{ source?: string }>;
			};
			return (
				Array.isArray(payload.routes) && payload.routes[0]?.source === "lfo1"
			);
		});

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await modulationMenu
			.getByRole("button", { name: /disable route/i })
			.first()
			.click();
		await waitForMessageMatching(page, (message) => {
			if (message.type !== "invoke" || message.method !== "setModMatrix") {
				return false;
			}
			if (!Array.isArray(message.args) || message.args.length < 1) {
				return false;
			}
			const payload = message.args[0] as {
				routes?: Array<{ enabled?: boolean }>;
			};
			return (
				Array.isArray(payload.routes) && payload.routes[0]?.enabled === false
			);
		});

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await modulationMenu
			.getByRole("spinbutton", { name: "Amount" })
			.first()
			.press("ArrowDown");
		await waitForMessageMatching(page, (message) => {
			if (message.type !== "invoke" || message.method !== "setModMatrix") {
				return false;
			}
			if (!Array.isArray(message.args) || message.args.length < 1) {
				return false;
			}
			const payload = message.args[0] as {
				routes?: Array<{ amount?: number }>;
			};
			return (
				Array.isArray(payload.routes) &&
				typeof payload.routes[0]?.amount === "number" &&
				(payload.routes[0]?.amount ?? Number.POSITIVE_INFINITY) < 0.5
			);
		});

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await modulationMenu.getByRole("button", { name: "Remove route" }).click();
		await waitForMessageMatching(page, (message) => {
			if (message.type !== "invoke" || message.method !== "setModMatrix") {
				return false;
			}
			if (!Array.isArray(message.args) || message.args.length < 1) {
				return false;
			}
			const payload = message.args[0] as { routes?: unknown[] };
			return Array.isArray(payload.routes) && payload.routes.length === 0;
		});
	});
});
