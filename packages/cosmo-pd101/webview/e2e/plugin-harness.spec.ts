import { expect, test } from "@playwright/test";
import { setupPluginPage } from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Harness shell", () => {
	test("test harness root element is present", async ({ page }) => {
		await expect(page.getByTestId("test-harness")).toBeVisible();
	});

	test("debug panel toggle opens and closes the panel", async ({ page }) => {
		const toggle = page.getByTestId("debug-panel-toggle");
		const panel = page.getByTestId("debug-panel");

		await expect(panel).toBeVisible();
		await toggle.click();
		await expect(panel).not.toBeVisible();
		await toggle.click();
		await expect(panel).toBeVisible();
	});

	test("debug panel push controls send an inbound update", async ({ page }) => {
		const panel = page.getByTestId("debug-panel");
		if (!(await panel.isVisible())) {
			await page.getByTestId("debug-panel-toggle").click();
		}

		await page.getByTestId("debug-push-id").fill("0");
		await page.getByTestId("debug-push-value").fill("0.9");
		await page.getByTestId("debug-push-btn").click();

		await expect(
			page.getByRole("button", { name: /90%/i }).first(),
		).toBeVisible({ timeout: 2000 });
	});
});
