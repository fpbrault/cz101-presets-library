import { expect, test } from "@playwright/test";
import { setupPluginPage } from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Host to UI inbound updates", () => {
	test("pushParamUpdate drives volume display to the pushed value", async ({ page }) => {
		await page.evaluate(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.6));

		await expect(
			page.getByRole("button", { name: /60%/i }).first(),
		).toBeVisible({ timeout: 2000 });
	});

	test("debug panel DSP state reflects pushed param update", async ({ page }) => {
		const panel = page.getByTestId("debug-panel");
		if (!(await panel.isVisible())) {
			await page.getByTestId("debug-panel-toggle").click();
		}

		await page.evaluate(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.42));

		const dspState = page.getByTestId("debug-dsp-state");
		await expect(dspState).toContainText("id:0", { timeout: 2000 });
	});

	test("pushBeamerParamUpdate through _onParams updates the debug panel", async ({ page }) => {
		const panel = page.getByTestId("debug-panel");
		if (!(await panel.isVisible())) {
			await page.getByTestId("debug-panel-toggle").click();
		}

		await page.evaluate(() =>
			window.__MOCK_BRIDGE__?.pushBeamerParamUpdate({
				"0": [0.33, 0.33, "33%"],
			}),
		);

		const dspState = page.getByTestId("debug-dsp-state");
		await expect(dspState).toContainText("0.330", { timeout: 2000 });
	});
});
