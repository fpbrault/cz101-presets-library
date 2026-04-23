import { expect, test } from "@playwright/test";
import {
	setupPluginPage,
	waitForMessageMatching,
} from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Mod matrix route management", () => {
	test("add, adjust, disable, and remove route emits setModMatrix payloads", async ({
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

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await page.getByRole("button", { name: /^lfo 1$/i }).click();
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

		const modulationMenu = page
			.locator("div")
			.filter({
				has: page.getByRole("button", { name: "Close" }),
			})
			.last();
		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await modulationMenu.getByRole("checkbox").first().click();
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
		const amountSlider = modulationMenu.getByRole("slider").first();
		await amountSlider.evaluate((element) => {
			const input = element as HTMLInputElement;
			const nativeSetter = Object.getOwnPropertyDescriptor(
				window.HTMLInputElement.prototype,
				"value",
			)?.set;
			nativeSetter?.call(input, "0.25");
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
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
				Math.abs((payload.routes[0]?.amount ?? 0) - 0.25) < 0.000001
			);
		});

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await page.getByRole("button", { name: "✕" }).click();
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
