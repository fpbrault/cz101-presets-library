import { expect, test } from "@playwright/test";
import {
	setupPluginPage,
	waitForMessageMatching,
} from "./helpers/pluginBridge";

test.beforeEach(async ({ page }) => {
	await setupPluginPage(page);
});

test.describe("Algo controls plugin bridge", () => {
	test("Line 1 Algo A and Algo B knob edits should invoke setAlgoControls with correct banks", async ({
		page,
	}) => {
		await page.getByRole("button", { name: /phase\s*mod/i }).click();

		const bendAlgoButton = page.getByTitle("Bend").first();
		await expect(bendAlgoButton).toBeVisible();
		await bendAlgoButton.click();

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());

		const curveKnobA = page.getByRole("spinbutton", { name: /^curve$/i }).first();
		await expect(curveKnobA).toBeVisible();

		const boxA = await curveKnobA.boundingBox();
		if (!boxA) throw new Error("Algo A Curve knob not found in layout");

		const ax = boxA.x + boxA.width / 2;
		const ay = boxA.y + boxA.height * 0.75;
		await page.mouse.move(ax, ay);
		await page.mouse.down();
		await page.mouse.move(ax, ay - 30, { steps: 5 });
		await page.mouse.up();

		await waitForMessageMatching(
			page,
			(message) =>
				message.type === "invoke" &&
				message.method === "setAlgoControls" &&
				Array.isArray(message.args) &&
				message.args[0] === 1 &&
				message.args[1] === "a" &&
				Array.isArray(message.args[2]) &&
				message.args[2].some(
					(control: { id?: string; value?: number }) =>
						control.id === "bendCurve" && typeof control.value === "number",
				),
		);

		const blendKnob = page.getByRole("spinbutton", { name: /^blend$/i }).first();
		await expect(blendKnob).toBeVisible();
		const blendBox = await blendKnob.boundingBox();
		if (!blendBox) throw new Error("Blend knob not found in layout");

		const bx = blendBox.x + blendBox.width / 2;
		const by = blendBox.y + blendBox.height * 0.75;
		await page.mouse.move(bx, by);
		await page.mouse.down();
		await page.mouse.move(bx, by - 42, { steps: 6 });
		await page.mouse.up();

		const bendAlgoButtonB = page.getByTitle("Bend").nth(1);
		await expect(bendAlgoButtonB).toBeVisible();
		await bendAlgoButtonB.click();

		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());

		const curveKnobB = page.getByRole("spinbutton", { name: /^curve$/i }).nth(1);
		await expect(curveKnobB).toBeVisible();

		const boxB = await curveKnobB.boundingBox();
		if (!boxB) throw new Error("Algo B Curve knob not found in layout");

		const cx = boxB.x + boxB.width / 2;
		const cy = boxB.y + boxB.height * 0.75;
		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx, cy - 30, { steps: 5 });
		await page.mouse.up();

		await waitForMessageMatching(
			page,
			(message) =>
				message.type === "invoke" &&
				message.method === "setAlgoControls" &&
				Array.isArray(message.args) &&
				message.args[0] === 1 &&
				message.args[1] === "b" &&
				Array.isArray(message.args[2]) &&
				message.args[2].some(
					(control: { id?: string; value?: number }) =>
						control.id === "bendCurve" && typeof control.value === "number",
				),
		);
	});

	test("hovering an algo control knob should update the bottom info bar", async ({
		page,
	}) => {
		await page.getByRole("button", { name: /phase\s*mod/i }).click();

		const bendAlgoButton = page.getByTitle("Bend").first();
		await expect(bendAlgoButton).toBeVisible();
		await bendAlgoButton.click();

		const curveKnob = page.getByRole("spinbutton", { name: /^curve$/i });
		await expect(curveKnob).toBeVisible();
		await curveKnob.hover();

		await expect(
			page.getByText(/changes how aggressively the phase bends along the curve/i),
		).toBeVisible();
	});

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
