/**
 * plugin.spec.ts — Mock-host E2E tests for cosmo-pd101 webview
 *
 * Three test families:
 *
 *  A) UI → host: User interacts with a control knob; the correct outbound
 *     Beamer-format message is recorded by the mock bridge.
 *
 *  B) Host → UI: The mock bridge pushes a param update; the UI reflects the
 *     new value via the debug panel's DSP state readout.
 *
 *  C) Alias command: The setParameter alias normalises through
 *     installLegacyIpc → runtime.params.set and records a param:set message.
 *
 * Stable selector strategy:
 *   - Prefer getByRole + accessible name (aria-label from ControlKnob).
 *   - Use data-testid for harness-only elements (debug panel, push inputs).
 *   - Never rely on CSS class names or positional selectors.
 */
import { expect, test } from "@playwright/test";
import type { MockBridgeMessage } from "../src/test/mockPluginBridge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for window.__MOCK_BRIDGE__ to be available (bridge installs async). */
async function waitForBridge(page: import("@playwright/test").Page) {
	await page.waitForFunction(
		() =>
			typeof window.__MOCK_BRIDGE__ !== "undefined" &&
			typeof window.__czOnParams !== "undefined",
		{ timeout: 5000 },
	);
}

/** Read all recorded messages from the mock bridge. */
async function getMessages(
	page: import("@playwright/test").Page,
): Promise<MockBridgeMessage[]> {
	return page.evaluate(
		() => (window.__MOCK_BRIDGE__?.getMessages() ?? []) as MockBridgeMessage[],
	);
}

/** Wait until at least one message of the given type (and optional stringId) is recorded. */
async function waitForMessage(
	page: import("@playwright/test").Page,
	type: string,
	stringId?: string,
): Promise<void> {
	await expect
		.poll(
			async () => {
				const msgs = await getMessages(page);
				return msgs.some(
					(m) =>
						m.type === type &&
						(stringId === undefined || m.stringId === stringId),
				);
			},
			{ timeout: 3000, intervals: [100, 200, 500] },
		)
		.toBe(true);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await waitForBridge(page);
	// Clear any messages that arrived during bootstrap.
	await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());
});

// ---------------------------------------------------------------------------
// A) UI → host  (User interacts with a control knob)
// ---------------------------------------------------------------------------

test.describe("A) UI → host outbound messages", () => {
	test("changing Line 1 algo records a param:set message for l1_warp_algo", async ({
		page,
	}) => {
		// Open the Phase Mod panel where per-line algo controls are rendered.
		await page.getByRole("button", { name: /phase\s*mod/i }).click();

		// Pick a non-default Line 1 algo using the icon button title.
		const bendAlgoButton = page.getByTitle("Bend").first();
		await expect(bendAlgoButton).toBeVisible();
		await bendAlgoButton.click();

		// usePluginParamBridge fires asynchronously; poll until the message lands.
		await waitForMessage(page, "param:set", "l1_warp_algo");

		const msgs = await getMessages(page);
		const paramSetMsg = msgs.find(
			(m) => m.type === "param:set" && m.stringId === "l1_warp_algo",
		);
		expect(paramSetMsg).toBeDefined();
		expect(typeof paramSetMsg?.value).toBe("number");
	});

	test(
		"dragging DCW Amt should record a param:set message for l1_dcw_base",
		async ({ page }) => {
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
		},
	);

	test("editing the Volume display value records begin/set/end sequence", async ({
		page,
	}) => {
		// Keep the floating debug panel from intercepting pointer events.
		const debugPanel = page.getByTestId("debug-panel");
		if (await debugPanel.isVisible()) {
			await page.getByTestId("debug-panel-toggle").click();
			await expect(debugPanel).not.toBeVisible();
		}

		// Push a known initial volume so the display shows "80%".
		await page.evaluate(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.8));
		await page.evaluate(() => window.__MOCK_BRIDGE__?.clearMessages());

		// Use the explicit accessible label on the value control to avoid colliding
		// with unrelated UI buttons that also show percentages (for example UI scale).
		const displayBtn = page.getByRole("button", { name: "Volume value" });
		await expect(displayBtn).toBeVisible();

		// Clicking it opens a text edit input.
		await displayBtn.click();

		// Enter a new plain value — for volume the range is 0..1.
		const editInput = page.getByRole("textbox", { name: "Volume value" });
		await expect(editInput).toBeVisible();
		await editInput.fill("0.5");
		await editInput.press("Enter");

		// Expect begin → set → end sequence for volume.
		await waitForMessage(page, "param:set", "volume");

		const msgs = await getMessages(page);
		const types = msgs.map((m) => m.type);
		expect(types).toContain("param:begin");
		expect(types).toContain("param:set");
		expect(types).toContain("param:end");

		// All three should refer to the same stringId.
		const volumeMsgs = msgs.filter((m) => m.stringId === "volume");
		expect(volumeMsgs.length).toBeGreaterThanOrEqual(3);
	});
});

// ---------------------------------------------------------------------------
// B) Host → UI  (Mock bridge pushes param; UI reflects change)
// ---------------------------------------------------------------------------

test.describe("B) Host → UI inbound updates", () => {
	test("pushParamUpdate drives volume display to the pushed value", async ({
		page,
	}) => {
		// Push volume = 0.6 → ControlKnob valueFormatter shows "60%".
		await page.evaluate(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.6));

		// The display button below the Volume knob should now read "60%".
		await expect(
			page.getByRole("button", { name: /60%/i }).first(),
		).toBeVisible({ timeout: 2000 });
	});

	test("debug panel DSP state reflects pushed param update", async ({
		page,
	}) => {
		// Ensure the debug panel is open.
		const panel = page.getByTestId("debug-panel");
		if (!(await panel.isVisible())) {
			await page.getByTestId("debug-panel-toggle").click();
		}

		// Push a known volume value.
		await page.evaluate(() => window.__MOCK_BRIDGE__?.pushParamUpdate(0, 0.42));

		// DSP state display is inside data-testid="debug-dsp-state".
		const dspState = page.getByTestId("debug-dsp-state");
		await expect(dspState).toContainText("id:0", { timeout: 2000 });
	});

	test("pushBeamerParamUpdate through _onParams path updates the debug panel", async ({
		page,
	}) => {
		const panel = page.getByTestId("debug-panel");
		if (!(await panel.isVisible())) {
			await page.getByTestId("debug-panel-toggle").click();
		}

		// Use the Beamer _onParams path: key is numeric ID, value is [norm, plain, text].
		await page.evaluate(() =>
			window.__MOCK_BRIDGE__?.pushBeamerParamUpdate({
				"0": [0.33, 0.33, "33%"],
			}),
		);

		const dspState = page.getByTestId("debug-dsp-state");
		await expect(dspState).toContainText("0.330", { timeout: 2000 });
	});
});

// ---------------------------------------------------------------------------
// C) Alias command normalisation
// ---------------------------------------------------------------------------

test.describe("C) Alias command path", () => {
	test("setParameter alias routes through installLegacyIpc and records param:set", async ({
		page,
	}) => {
		// Volume (legacy ID 0) via the alias helper.
		await page.evaluate(() => window.__MOCK_BRIDGE__?.setParameter(0, 0.75));

		await waitForMessage(page, "param:set", "volume");

		const msgs = await getMessages(page);
		const setMsg = msgs.find(
			(m) => m.type === "param:set" && m.stringId === "volume",
		);
		expect(setMsg).toBeDefined();
		// Normalized value for volume (range 0..1): plain 0.75 → normalized 0.75.
		expect(setMsg?.value as number).toBeCloseTo(0.75, 2);
	});

	test("setParameter alias records l1_dcw_base for legacy param 102", async ({
		page,
	}) => {
		await page.evaluate(() => window.__MOCK_BRIDGE__?.setParameter(102, 0.61));

		await waitForMessage(page, "param:set", "l1_dcw_base");

		const msgs = await getMessages(page);
		const setMsg = msgs.find(
			(m) => m.type === "param:set" && m.stringId === "l1_dcw_base",
		);
		expect(setMsg).toBeDefined();
		expect(setMsg?.value as number).toBeCloseTo(0.61, 2);
	});

	test("setParameter alias records l2_dcw_base for legacy param 202", async ({
		page,
	}) => {
		await page.evaluate(() => window.__MOCK_BRIDGE__?.setParameter(202, 0.37));

		await waitForMessage(page, "param:set", "l2_dcw_base");

		const msgs = await getMessages(page);
		const setMsg = msgs.find(
			(m) => m.type === "param:set" && m.stringId === "l2_dcw_base",
		);
		expect(setMsg).toBeDefined();
		expect(setMsg?.value as number).toBeCloseTo(0.37, 2);
	});

	test("setParameter falls back gracefully when ipc is not yet installed", async ({
		page,
	}) => {
		// Temporarily remove window.ipc to simulate pre-bridge state.
		await page.evaluate(() => {
			const saved = window.ipc;
			window.ipc = undefined as unknown as typeof window.ipc;
			window.__MOCK_BRIDGE__?.setParameter(0, 0.5);
			window.ipc = saved;
		});

		// Fallback calls pushParamUpdate which emits __czOnParams; no crash.
		// We assert the bridge handle still works after the operation.
		const state = await page.evaluate(() => window.__MOCK_BRIDGE__?.getState());
		expect(state).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// D) Harness shell
// ---------------------------------------------------------------------------

test.describe("D) Harness shell", () => {
	test("test harness root element is present", async ({ page }) => {
		await expect(page.getByTestId("test-harness")).toBeVisible();
	});

	test("debug panel toggle opens and closes the panel", async ({ page }) => {
		const toggle = page.getByTestId("debug-panel-toggle");
		const panel = page.getByTestId("debug-panel");

		// Ensure it starts open (VITE_DEBUG_PANEL=1 set in playwright.config.ts).
		await expect(panel).toBeVisible();

		// Close it.
		await toggle.click();
		await expect(panel).not.toBeVisible();

		// Re-open it.
		await toggle.click();
		await expect(panel).toBeVisible();
	});

	test("debug panel push controls send an inbound update", async ({ page }) => {
		const panel = page.getByTestId("debug-panel");
		if (!(await panel.isVisible())) {
			await page.getByTestId("debug-panel-toggle").click();
		}

		// Fill push controls and click Push.
		await page.getByTestId("debug-push-id").fill("0");
		await page.getByTestId("debug-push-value").fill("0.9");
		await page.getByTestId("debug-push-btn").click();

		// Volume display should update to 90%.
		await expect(
			page.getByRole("button", { name: /90%/i }).first(),
		).toBeVisible({ timeout: 2000 });
	});
});
