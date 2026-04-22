import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the cosmo-pd101 webview mock-host harness.
 *
 * Single project: unit tests run in happy-dom.
 * The @/* alias mirrors the vite.config.ts setup (resolves to cz-explorer/src).
 *
 * Run with:   bun run test:unit
 */
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": fileURLToPath(
				new URL("../../../packages/cz-explorer/src", import.meta.url),
			),
		},
	},
	define: {
		// Vite defines needed by App.tsx / main.tsx when running under Vitest.
		__CZ_BUILD_LABEL__: JSON.stringify("test"),
		__CZ_APP_VERSION__: JSON.stringify("0.0.0"),
	},
	test: {
		globals: true,
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["src/**/*.{test,spec}.{ts,tsx}"],
					exclude: ["src/**/*.browser.test.{ts,tsx}"],
					setupFiles: ["./src/test/setupTests.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/**/*.browser.test.{ts,tsx}"],
					setupFiles: ["./src/test/setupBrowserTests.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
						screenshotDirectory:
							"../.vitest-attachments/screenshots/cosmo-pd101-webview",
						screenshotFailures: false,
						locators: {
							testIdAttribute: "data-testid",
						},
					},
				},
			},
		],
	},
});
