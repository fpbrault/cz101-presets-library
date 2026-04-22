import { expect, test } from "@playwright/test";
import { setupPluginPage } from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
	await setupPluginPage(page);
});

test.describe("Preset management", () => {
	test("saves, renames, and deletes a local preset", async ({ page }) => {
		await page.getByRole("button", { name: /^preset /i }).click();

		const saveInput = page.getByPlaceholder("Preset name…");
		await saveInput.fill("E2E Patch");
		await page.getByRole("button", { name: "Save" }).click();

		await expect(page.getByRole("button", { name: "E2E Patch local" })).toBeVisible();
		await expect
			.poll(() => page.evaluate(() => localStorage.getItem("cz101-preset-E2E Patch")))
			.not.toBeNull();

		await page.getByTitle("Rename preset").click();
		const renameInput = page.getByRole("textbox").nth(1);
		await renameInput.fill("Renamed Patch");
		await renameInput.press("Enter");

		await expect(page.getByRole("button", { name: "Renamed Patch local" })).toBeVisible();
		await expect
			.poll(
				() =>
					page.evaluate(() => ({
						original: localStorage.getItem("cz101-preset-E2E Patch"),
						renamed: localStorage.getItem("cz101-preset-Renamed Patch"),
					})),
			)
			.toEqual({ original: null, renamed: expect.any(String) });

		await page.getByTitle("Delete preset").click();
		await expect(page.getByRole("button", { name: "Renamed Patch local" })).toHaveCount(0);
		await expect
			.poll(
				() => page.evaluate(() => localStorage.getItem("cz101-preset-Renamed Patch")),
			)
			.toBeNull();
	});
});
