import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const explorerSrc = fileURLToPath(new URL("./src", import.meta.url));
const cosmoPd101LibEntry = fileURLToPath(
	new URL("../cosmo-pd101/webview/lib-dist/index.mjs", import.meta.url),
);
const tailwindPlugins = tailwindcss() as unknown as [];

export default defineConfig({
	resolve: {
		alias: [
			{ find: "@cosmo/cosmo-pd101", replacement: cosmoPd101LibEntry },
			{ find: "@", replacement: explorerSrc },
		],
	},
	optimizeDeps: {
		include: [
			"@testing-library/jest-dom/vitest",
			"@testing-library/react",
			"@testing-library/user-event",
			"fake-indexeddb/auto",
			"react",
			"react/jsx-dev-runtime",
			"vitest-axe/extend-expect",
			"vitest-browser-react",
		],
	},
	plugins: tailwindPlugins,
	test: {
		globals: true,
		setupFiles: ["./setupTests.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["src/**/*.{test,spec}.{ts,tsx}"],
					exclude: ["src/**/*.browser.test.{ts,tsx}"],
				},
			},
			{
				extends: true,
				test: {
					css: true,
					name: "browser",
					browser: {
						enabled: true,
						screenshotDirectory:
							"../.vitest-attachments/screenshots/cz-explorer",
						screenshotFailures: false,
						locators: {
							testIdAttribute: "data-testid",
						},
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
					include: ["src/**/*.browser.test.{ts,tsx}"],
					setupFiles: ["./setupBrowserTests.ts"],
				},
			},
		],
	},
});
