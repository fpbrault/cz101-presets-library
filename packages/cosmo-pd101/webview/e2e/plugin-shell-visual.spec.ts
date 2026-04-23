import { expect, test } from "@playwright/test";
import { setupPluginPage } from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 980 });
	await setupPluginPage(page);
});

test.describe("Plugin shell visual smoke", () => {
	test("captures the current plugin shell", async ({ page }, testInfo) => {
		await expect(page.getByTestId("test-harness")).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath("plugin-shell.png"),
			fullPage: true,
		});
	});
});