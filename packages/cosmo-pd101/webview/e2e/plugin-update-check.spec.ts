import { expect, test } from "@playwright/test";
import { setupPluginPage } from "./helpers/pluginBridge";

const LATEST_RELEASE_URL =
	"https://api.github.com/repos/fpbrault/cosmo-pd/releases/latest";

test.describe("Plugin update checks", () => {
	test("shows and dismisses the release modal when a newer version is available", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			sessionStorage.clear();
		});

		await page.route(LATEST_RELEASE_URL, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					tag_name: "v9.9.9",
					html_url: "https://github.com/fpbrault/cosmo-pd/releases/tag/v9.9.9",
				}),
			});
		});

		await setupPluginPage(page);
		await page.getByRole("button", { name: /check updates/i }).click();

		await expect(page.getByText("New Version Available")).toBeVisible();
		await expect(page.getByText(/version v9\.9\.9 is available/i)).toBeVisible();
		await expect(page.getByRole("link", { name: "View Release" })).toHaveAttribute(
			"href",
			"https://github.com/fpbrault/cosmo-pd/releases/tag/v9.9.9",
		);

		await page.getByRole("button", { name: "Later" }).click();
		await expect(page.getByText("New Version Available")).toBeHidden();
	});
});
