import { expect, test } from "@playwright/test";
import {
	getMessages,
	setupPluginPage,
	waitForMessage,
} from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("UI to host outbound messages", () => {
	test("changing Line 1 algo records a param:set message for l1_warp_algo", async ({
		page,
	}) => {
		await page.getByRole("button", { name: /phase\s*mod/i }).click();

		const bendAlgoButton = page.getByTitle("Bend").first();
		await expect(bendAlgoButton).toBeVisible();
		await bendAlgoButton.click();

		await waitForMessage(page, "param:set", "l1_warp_algo");

		const messages = await getMessages(page);
		const paramSetMessage = messages.find(
			(message) =>
				message.type === "param:set" && message.stringId === "l1_warp_algo",
		);
		expect(paramSetMessage).toBeDefined();
		expect(typeof paramSetMessage?.value).toBe("number");
	});

	test("dragging DCW Amt records a param:set message for l1_dcw_base", async ({
		page,
	}) => {
		const dcwAmtSlider = page
			.getByRole("slider", { name: /line 1 dcw amt/i })
			.first();
		await expect(dcwAmtSlider).toBeVisible();

		const box = await dcwAmtSlider.boundingBox();
		if (!box) throw new Error("DCW Amt slider not found in layout");

		const cx = box.x + box.width / 2;
		const cy = box.y + box.height * 0.75;
		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx, cy - 20, { steps: 4 });
		await page.mouse.up();

		await waitForMessage(page, "param:set", "l1_dcw_base");
	});

	test("editing the Volume display value records begin/set/end sequence", async ({
		page,
	}) => {
		const debugPanel = page.getByTestId("debug-panel");
		if (await debugPanel.isVisible()) {
			await page.getByTestId("debug-panel-toggle").click();
			await expect(debugPanel).not.toBeVisible();
		}

		await page.evaluate(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.8));
		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());

		const displayButton = page.getByRole("button", { name: "Volume value" });
		await expect(displayButton).toBeVisible();
		await displayButton.click();

		const editInput = page.getByRole("textbox", { name: "Volume value" });
		await expect(editInput).toBeVisible();
		await editInput.fill("0.5");
		await editInput.press("Enter");

		await waitForMessage(page, "param:set", "volume");

		const messages = await getMessages(page);
		const types = messages.map((message) => message.type);
		expect(types).toContain("param:begin");
		expect(types).toContain("param:set");
		expect(types).toContain("param:end");

		const volumeMessages = messages.filter(
			(message) => message.stringId === "volume",
		);
		expect(volumeMessages.length).toBeGreaterThanOrEqual(3);
	});
});
