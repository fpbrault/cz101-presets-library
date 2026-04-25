import { expect, test } from "@playwright/test";
import { setupPluginPage, waitForBridge } from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 980 });
	await setupPluginPage(page);
});

test.describe("Plugin shell visual smoke", () => {
	test("captures plugin shell at 1280x800", async ({ page }, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await expect(page.getByTestId("test-harness")).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath("plugin-shell-1280x800.png"),
			fullPage: true,
		});
	});

	test.skip("captures the current plugin shell", async ({ page }, testInfo) => {
		await expect(page.getByTestId("test-harness")).toBeVisible();
		const fxLabel = page.getByText(/^FX$/).last();
		await fxLabel.locator("..").locator("button").click();
		await expect(page.getByText("Chorus").first()).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath("plugin-shell.png"),
			fullPage: true,
		});
	});

	test("captures the mini keyboard overlay", async ({ page }, testInfo) => {
		await expect(page.getByTestId("test-harness")).toBeVisible();
		await expect(page.getByTestId("mini-keyboard-overlay")).toBeVisible();
		await page.getByRole("button", { name: /Hide Keys/i }).click();
		await page.getByRole("button", { name: /Show Keys/i }).click();
		await expect(page.getByTestId("mini-keyboard-overlay")).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath("plugin-shell-mini-keyboard.png"),
			fullPage: true,
		});
	});

	test.skip("persists synth shell UI state across reloads", async ({
		page,
	}) => {
		await expect(page.getByTestId("test-harness")).toBeVisible();

		const scopeButton = page.getByRole("button", { name: /Scope\s+View/i });
		await scopeButton.click();
		await expect(scopeButton).toHaveAttribute("aria-pressed", "true");

		await page.getByRole("button", { name: "ENV" }).nth(1).click();
		await page.getByText(/^DCA$/).locator("..").locator("button").click();
		await expect(page.getByText("Line 2 DCA")).toBeVisible();

		await page.getByRole("button", { name: /Hide Keys/i }).click();
		await expect(page.getByTestId("mini-keyboard-overlay")).not.toBeVisible();

		await page.getByText(/^FX$/).last().locator("..").locator("button").click();
		await expect(page.getByText("Chorus").first()).toBeVisible();

		await page.reload();
		await page.waitForLoadState("networkidle");
		await waitForBridge(page);

		await expect(page.getByText("Chorus").first()).toBeVisible();
		await expect(scopeButton).toHaveAttribute("aria-pressed", "true");
		await expect(page.getByTestId("mini-keyboard-overlay")).not.toBeVisible();
		await expect(
			page.getByRole("button", { name: /Show Keys/i }),
		).toBeVisible();

		await page
			.getByText(/^Main$/)
			.last()
			.locator("..")
			.locator("button")
			.click();
		await expect(page.getByText("Line 2 DCA")).toBeVisible();
	});
});
