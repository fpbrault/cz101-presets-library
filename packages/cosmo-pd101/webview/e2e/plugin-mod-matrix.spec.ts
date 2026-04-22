import { expect, test } from "@playwright/test";
import { setupPluginPage, waitForMessageMatching } from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Mod matrix plugin bridge", () => {
	test("adding a mod route should invoke setModMatrix", async ({ page }) => {
		const volumeKnob = page.getByRole("button", { name: /^volume$/i });
		await expect(volumeKnob).toBeVisible();
		await volumeKnob.hover();

		const modulationButton = page.getByRole("button", {
			name: /modulation for volume/i,
		});
		await expect(modulationButton).toBeVisible();
		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
		await modulationButton.click();

		const addLfo1Button = page.getByRole("button", { name: /^lfo 1$/i });
		await expect(addLfo1Button).toBeVisible();
		await addLfo1Button.click();

		await waitForMessageMatching(page, (message) => {
			if (message.type !== "invoke" || message.method !== "setModMatrix") {
				return false;
			}
			if (!Array.isArray(message.args) || message.args.length < 1) {
				return false;
			}
			const payload = message.args[0];
			if (payload === null || typeof payload !== "object") {
				return false;
			}
			const routes = (payload as { routes?: unknown[] }).routes;
			if (!Array.isArray(routes) || routes.length < 1) {
				return false;
			}
			const firstRoute = routes[0];
			if (firstRoute === null || typeof firstRoute !== "object") {
				return false;
			}
			const route = firstRoute as {
				source?: unknown;
				destination?: unknown;
				enabled?: unknown;
			};
			return (
				route.source === "lfo1" &&
				route.destination === "volume" &&
				route.enabled === true
			);
		});
	});
});
