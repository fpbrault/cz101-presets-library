import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for the cosmo-pd101 webview mock-host harness.
 *
 * Run with:   bun run test:e2e
 * Interactive: bun run test:e2e:ui
 *
 * The Vite dev server is started automatically with VITE_TEST_HARNESS=1 so
 * the mock bridge is installed before React renders.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false, // plugin tests share a single virtual DSP state
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "github" : "list",

	use: {
		baseURL: "http://localhost:5175",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	webServer: {
		command: "bunx --bun vite --port 5175",
		url: "http://localhost:5175",
		reuseExistingServer: !process.env.CI,
		env: {
			VITE_TEST_HARNESS: "1",
			VITE_DEBUG_PANEL: "1",
		},
	},
});
