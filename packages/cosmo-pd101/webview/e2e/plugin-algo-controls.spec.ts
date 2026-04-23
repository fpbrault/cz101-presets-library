import { expect, test } from "@playwright/test";
import {
	setupPluginPage,
	waitForMessageMatching,
} from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Algo controls plugin bridge", () => {
	test("Line 1 algo control knob edits should invoke setAlgoControls with line 1", async ({
		page,
	}) => {
		await page.getByRole("button", { name: /phase\s*mod/i }).click();

		const bendAlgoButton = page.getByTitle("Bend").first();
		await expect(bendAlgoButton).toBeVisible();
		await bendAlgoButton.click();
		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());

		const curveKnob = page.getByRole("spinbutton", { name: /^curve$/i });
		await expect(curveKnob).toBeVisible();

		const box = await curveKnob.boundingBox();
		if (!box) throw new Error("Algo Curve knob not found in layout");

		const cx = box.x + box.width / 2;
		const cy = box.y + box.height * 0.75;
		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx, cy - 20, { steps: 4 });
		await page.mouse.up();

		await waitForMessageMatching(
			page,
			(message) =>
				message.type === "invoke" &&
				message.method === "setAlgoControls" &&
				Array.isArray(message.args) &&
				message.args[0] === 1,
		);
	});

	test("Line 2 algo control knob edits should invoke setAlgoControls with line 2", async ({
		page,
	}) => {
		await page.getByRole("button", { name: /phase\s*mod/i }).click();

		await page
			.getByRole("button", { name: /wave\s*form/i })
			.nth(1)
			.click();
		const bendAlgoButton = page.getByTitle("Bend").first();
		await expect(bendAlgoButton).toBeVisible();
		await bendAlgoButton.click();
		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());

		const curveKnob = page.getByRole("spinbutton", { name: /^curve$/i });
		await expect(curveKnob).toBeVisible();

		const box = await curveKnob.boundingBox();
		if (!box) throw new Error("Algo Curve knob not found in layout");

		const cx = box.x + box.width / 2;
		const cy = box.y + box.height * 0.75;
		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx, cy - 20, { steps: 4 });
		await page.mouse.up();

		await waitForMessageMatching(
			page,
			(message) =>
				message.type === "invoke" &&
				message.method === "setAlgoControls" &&
				Array.isArray(message.args) &&
				message.args[0] === 2,
		);
	});
});
